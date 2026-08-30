import { insertCreatorWalletLedgerEntry } from "@/lib/data/creator-finance";
import { shiftCreatorWalletBalances } from "@/lib/data/payouts";
import { createClient } from "@/lib/data/server";

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function reverseCreatorEarningForQualityRefund(input: {
  unlockId: string;
  batchId: string;
  storyId: string;
  chapterId?: string | null;
}) {
  const db = await createClient();

  const { data: earning } = await db
    .from("creator_earning_transactions")
    .select(
      "id, creator_user_id, creator_net_amount_vnd, status, coin_amount, story_id, chapter_id"
    )
    .eq("source_type", "chapter_unlock")
    .eq("source_id", input.unlockId)
    .maybeSingle();

  if (!earning?.id || earning.status === "refunded") {
    return { reversed: false, amountVnd: 0, error: null };
  }

  const amountVnd = toNumber(earning.creator_net_amount_vnd);
  if (amountVnd <= 0) {
    await db
      .from("creator_earning_transactions")
      .update({ status: "refunded" })
      .eq("id", earning.id);
    return { reversed: true, amountVnd: 0, error: null };
  }

  const { data: ledgerRow } = await db
    .from("creator_wallet_ledger")
    .select("balance_type")
    .eq("earning_transaction_id", earning.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const balanceType = (ledgerRow?.balance_type as string) ?? "available";
  const fromBucket =
    balanceType === "pending" || balanceType === "locked" ? balanceType : "available";

  const shifted = await shiftCreatorWalletBalances({
    creatorUserId: earning.creator_user_id as string,
    from: fromBucket,
    to: "none",
    amountVnd
  });

  if (!shifted.data) {
    return {
      reversed: false,
      amountVnd,
      error: shifted.error ?? "Không thể điều chỉnh ví tác giả."
    };
  }

  await insertCreatorWalletLedgerEntry({
    creatorUserId: earning.creator_user_id as string,
    type: "adjustment_debit",
    amountVnd,
    direction: "debit",
    amountCoin: earning.coin_amount == null ? null : toNumber(earning.coin_amount),
    sourceType: "coin_refund_batch",
    sourceId: input.batchId,
    storyId: input.storyId,
    chapterId: input.chapterId ?? null,
    earningTransactionId: earning.id as string,
    balanceType: fromBucket,
    description: "Điều chỉnh do hoàn coin nội dung chất lượng thấp.",
    metadata: {
      quality_refund_reversal: true,
      unlock_id: input.unlockId,
      batch_id: input.batchId
    }
  });

  await db
    .from("creator_earning_transactions")
    .update({ status: "refunded" })
    .eq("id", earning.id);

  return { reversed: true, amountVnd, error: null };
}
