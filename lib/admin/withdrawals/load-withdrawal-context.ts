import { createClient } from "@/lib/supabase/server";
import { listPayoutRequestsForAdmin } from "@/lib/supabase/payouts";
import { fetchEmailsForUsers } from "@/lib/admin/withdrawals/fetch-emails";
import { computeWithdrawalFeeVnd } from "@/lib/admin/withdrawals/compute-withdrawal-fee";
import type { PayoutRequest } from "@/types/payout";

export type WithdrawalEnrichedContext = {
  requests: PayoutRequest[];
  feeByRequestId: Map<string, number>;
  profileByUserId: Map<
    string,
    {
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
      is_verified: boolean;
      verification_type: string | null;
      status: string | null;
    }
  >;
  studioByUserId: Map<string, string | null>;
  monetizationByUserId: Map<
    string,
    { status: string; monetization_enabled: boolean; payout_enabled: boolean }
  >;
  walletByUserId: Map<
    string,
    { available_revenue_vnd: number; locked_revenue_vnd: number; total_withdrawn_vnd: number }
  >;
  emailByUserId: Map<string, string>;
  processorByUserId: Map<string, string>;
  error: string | null;
};

export async function loadWithdrawalEnrichedContext(limit = 500): Promise<WithdrawalEnrichedContext> {
  const result = await listPayoutRequestsForAdmin(limit);
  if (result.error) {
    return {
      requests: [],
      feeByRequestId: new Map(),
      profileByUserId: new Map(),
      studioByUserId: new Map(),
      monetizationByUserId: new Map(),
      walletByUserId: new Map(),
      emailByUserId: new Map(),
      processorByUserId: new Map(),
      error: result.error
    };
  }

  const requests = result.data;
  const creatorIds = [...new Set(requests.map((r) => r.creator_user_id))];
  const reviewerIds = [
    ...new Set(requests.map((r) => r.reviewed_by).filter(Boolean) as string[])
  ];

  const supabase = await createClient();
  const [profiles, creators, monetization, wallets, reviewers, emailMap] = await Promise.all([
    creatorIds.length
      ? supabase
          .from("profiles")
          .select(
            "id, display_name, username, avatar_url, is_verified, verification_type, status"
          )
          .in("id", creatorIds)
      : Promise.resolve({ data: [] }),
    creatorIds.length
      ? supabase.from("creators").select("user_id, pen_name").in("user_id", creatorIds)
      : Promise.resolve({ data: [] }),
    creatorIds.length
      ? supabase
          .from("creator_monetization_profiles")
          .select("user_id, status, monetization_enabled, payout_enabled")
          .in("user_id", creatorIds)
      : Promise.resolve({ data: [] }),
    creatorIds.length
      ? supabase
          .from("creator_wallets")
          .select("user_id, available_revenue_vnd, locked_revenue_vnd, total_withdrawn_vnd")
          .in("user_id", creatorIds)
      : Promise.resolve({ data: [] }),
    reviewerIds.length
      ? supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", reviewerIds)
      : Promise.resolve({ data: [] }),
    fetchEmailsForUsers(creatorIds)
  ]);

  const feeByRequestId = new Map<string, number>();
  await Promise.all(
    requests.map(async (req) => {
      feeByRequestId.set(req.id, await computeWithdrawalFeeVnd(req.amount_vnd));
    })
  );

  const profileByUserId = new Map(
    (profiles.data ?? []).map((p) => [
      p.id as string,
      {
        display_name: (p.display_name as string | null) ?? null,
        username: (p.username as string | null) ?? null,
        avatar_url: (p.avatar_url as string | null) ?? null,
        is_verified: Boolean(p.is_verified),
        verification_type: (p.verification_type as string | null) ?? null,
        status: (p.status as string | null) ?? null
      }
    ])
  );

  const studioByUserId = new Map(
    (creators.data ?? []).map((c) => [c.user_id as string, (c.pen_name as string | null) ?? null])
  );

  const monetizationByUserId = new Map(
    (monetization.data ?? []).map((m) => [
      m.user_id as string,
      {
        status: String(m.status),
        monetization_enabled: Boolean(m.monetization_enabled),
        payout_enabled: Boolean(m.payout_enabled)
      }
    ])
  );

  const walletByUserId = new Map(
    (wallets.data ?? []).map((w) => [
      w.user_id as string,
      {
        available_revenue_vnd: Number(w.available_revenue_vnd ?? 0),
        locked_revenue_vnd: Number(w.locked_revenue_vnd ?? 0),
        total_withdrawn_vnd: Number(w.total_withdrawn_vnd ?? 0)
      }
    ])
  );

  const processorByUserId = new Map(
    (reviewers.data ?? []).map((r) => [
      r.id as string,
      (r.display_name as string) ?? (r.username as string) ?? (r.id as string)
    ])
  );

  return {
    requests,
    feeByRequestId,
    profileByUserId,
    studioByUserId,
    monetizationByUserId,
    walletByUserId,
    emailByUserId: emailMap,
    processorByUserId,
    error: null
  };
}

export function formatPayoutMasked(snapshot: Record<string, unknown> | null): string {
  if (!snapshot) return "—";
  const bank = snapshot.bank_account_number_masked as string | undefined;
  const wallet = snapshot.wallet_phone_masked as string | undefined;
  const holder = snapshot.account_holder_name as string | undefined;
  const masked = bank ?? wallet ?? "—";
  return holder ? `${holder} · ${masked}` : masked;
}
