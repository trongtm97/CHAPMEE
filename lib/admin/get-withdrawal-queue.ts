import { createClient } from "@/lib/data/server";
import { listPayoutRequestsForAdmin } from "@/lib/data/payouts";
import { getOrCreateCreatorWallet } from "@/lib/wallets/creator-wallet";
import type { AdminWithdrawalQueueItem, AdminWithdrawalTab } from "@/types/admin";
import type { PayoutRequestStatus } from "@/types/payout";

const TAB_STATUS_MAP: Record<AdminWithdrawalTab, PayoutRequestStatus[]> = {
  pending: ["requested", "under_review"],
  approved: ["approved"],
  processing: ["processing"],
  paid: ["completed"],
  rejected: ["rejected", "cancelled"],
  failed: ["failed"]
};

function formatPayoutMasked(snapshot: Record<string, unknown> | null): string {
  if (!snapshot) return "—";
  const bank = snapshot.bank_account_number_masked as string | undefined;
  const wallet = snapshot.wallet_phone_masked as string | undefined;
  const holder = snapshot.account_holder_name as string | undefined;
  const masked = bank ?? wallet ?? "—";
  return holder ? `${holder} · ${masked}` : masked;
}

export async function getWithdrawalQueue(tab: AdminWithdrawalTab = "pending") {
  const result = await listPayoutRequestsForAdmin(300);
  if (result.error) {
    return { items: [], counts: emptyCounts(), error: result.error };
  }

  const db = await createClient();
  const creatorIds = [...new Set(result.data.map((r) => r.creator_user_id))];

  const [{ data: profiles }, wallets] = await Promise.all([
    creatorIds.length > 0
      ? db
          .from("profiles")
          .select("id, display_name, username")
          .in("id", creatorIds)
      : Promise.resolve({ data: [] }),
    Promise.all(
      creatorIds.map(async (id) => ({
        id,
        wallet: await getOrCreateCreatorWallet(id)
      }))
    )
  ]);

  const nameMap = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      (p.display_name as string) ?? (p.username as string) ?? "Tác giả"
    ])
  );

  const walletMap = new Map(
    wallets.map((w) => [w.id, w.wallet.data])
  );

  const items: AdminWithdrawalQueueItem[] = result.data.map((req) => ({
    id: req.id,
    creatorUserId: req.creator_user_id,
    creatorLabel: nameMap.get(req.creator_user_id) ?? req.creator_user_id.slice(0, 8),
    amountVnd: req.amount_vnd,
    method: req.method,
    payoutMasked: formatPayoutMasked(req.payout_account_snapshot),
    status: req.status,
    requestedAt: req.requested_at,
    reviewedAt: req.reviewed_at,
    completedAt: req.completed_at,
    adminNote: req.admin_note,
    rejectReason: req.reject_reason,
    availableBalanceVnd: walletMap.get(req.creator_user_id)?.available_revenue_vnd ?? null,
    lockedBalanceVnd: walletMap.get(req.creator_user_id)?.locked_revenue_vnd ?? null
  }));

  const counts = emptyCounts();
  for (const item of items) {
    for (const key of Object.keys(counts) as AdminWithdrawalTab[]) {
      if (TAB_STATUS_MAP[key].includes(item.status)) {
        counts[key] += 1;
      }
    }
  }

  const filtered = items.filter((item) => TAB_STATUS_MAP[tab].includes(item.status));

  return { items: filtered, counts, error: null };
}

function emptyCounts(): Record<AdminWithdrawalTab, number> {
  return {
    pending: 0,
    approved: 0,
    processing: 0,
    paid: 0,
    rejected: 0,
    failed: 0
  };
}
