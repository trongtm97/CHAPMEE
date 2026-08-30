import { createClient } from "@/lib/data/server";
import type {
  QualityRefundPreview,
  QualityRefundPreviewItem,
  QualityRefundPurchaseScope,
  QualityRefundReasonCode,
  QualityRefundScope
} from "@/types/quality-refund";

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundCoin(value: number) {
  return Number(value.toFixed(2));
}

function resolveDateFrom(scope: QualityRefundScope, dateFrom?: string | null) {
  if (scope === "all_purchases") return null;
  const now = Date.now();
  if (scope === "last_7_days") return new Date(now - 7 * 86_400_000).toISOString();
  if (scope === "last_30_days") return new Date(now - 30 * 86_400_000).toISOString();
  return dateFrom ?? null;
}

function computeRefundForUnlock(input: {
  coinAmount: number;
  paidCoinAmount: number;
  bonusCoinAmount: number;
  alreadyRefunded: number;
  refundPercent: number | null;
  refundFixedAmount: number | null;
}) {
  const remaining = Math.max(0, input.coinAmount - input.alreadyRefunded);
  if (remaining <= 0) {
    return {
      refundCoinAmount: 0,
      refundPaidCoinAmount: 0,
      refundBonusCoinAmount: 0
    };
  }

  let targetTotal = remaining;
  if (input.refundPercent != null) {
    targetTotal = roundCoin((remaining * input.refundPercent) / 100);
  } else if (input.refundFixedAmount != null) {
    targetTotal = Math.min(remaining, input.refundFixedAmount);
  }

  const ratio = input.coinAmount > 0 ? targetTotal / input.coinAmount : 0;
  const refundPaidCoinAmount = roundCoin(input.paidCoinAmount * ratio);
  const refundBonusCoinAmount = roundCoin(input.bonusCoinAmount * ratio);
  const refundCoinAmount = roundCoin(refundPaidCoinAmount + refundBonusCoinAmount);

  return { refundCoinAmount, refundPaidCoinAmount, refundBonusCoinAmount };
}

export async function getQualityRefundPreview(input: {
  storyId: string;
  chapterId?: string | null;
  refundScope: QualityRefundScope;
  dateFrom?: string | null;
  dateTo?: string | null;
  refundPercent?: number | null;
  refundFixedAmount?: number | null;
  purchaseScope: QualityRefundPurchaseScope;
  reasonCode: QualityRefundReasonCode;
}): Promise<{ data: QualityRefundPreview | null; error: string | null }> {
  const db = await createClient();
  const scopeFrom = resolveDateFrom(input.refundScope, input.dateFrom);

  let query = db
    .from("chapter_unlocks")
    .select(
      "id, user_id, chapter_id, story_id, coin_amount, paid_coin_amount, bonus_coin_amount, transaction_id, refunded_coin_amount, refund_status, created_at"
    )
    .eq("story_id", input.storyId);

  if (input.purchaseScope === "chapter_only" && input.chapterId) {
    query = query.eq("chapter_id", input.chapterId);
  }

  if (scopeFrom) {
    query = query.gte("created_at", scopeFrom);
  }
  if (input.refundScope === "custom_range" && input.dateTo) {
    query = query.lte("created_at", input.dateTo);
  }

  const { data: unlocks, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  const txIds = (unlocks ?? [])
    .map((u) => u.transaction_id as string)
    .filter(Boolean);

  const refundedTxIds = new Set<string>();
  if (txIds.length) {
    const { data: existingItems } = await db
      .from("coin_refund_items")
      .select("original_transaction_id")
      .in("original_transaction_id", txIds)
      .eq("status", "completed");

    for (const row of existingItems ?? []) {
      if (row.original_transaction_id) {
        refundedTxIds.add(row.original_transaction_id as string);
      }
    }
  }

  const items: QualityRefundPreviewItem[] = [];
  const userIds = new Set<string>();
  let previouslyRefundedCount = 0;

  for (const row of unlocks ?? []) {
    const txId = row.transaction_id as string;
    const alreadyRefunded = toNumber(row.refunded_coin_amount);
    const previouslyRefunded = refundedTxIds.has(txId) || row.refund_status === "fully_refunded";

    if (previouslyRefunded) {
      previouslyRefundedCount += 1;
    }

    const amounts = computeRefundForUnlock({
      coinAmount: toNumber(row.coin_amount),
      paidCoinAmount: toNumber(row.paid_coin_amount),
      bonusCoinAmount: toNumber(row.bonus_coin_amount),
      alreadyRefunded,
      refundPercent: input.refundPercent ?? null,
      refundFixedAmount: input.refundFixedAmount ?? null
    });

    if (amounts.refundCoinAmount <= 0 || previouslyRefunded) {
      continue;
    }

    userIds.add(row.user_id as string);
    items.push({
      unlockId: row.id as string,
      userId: row.user_id as string,
      originalTransactionId: txId,
      originalCoinAmount: toNumber(row.coin_amount),
      originalPaidCoinAmount: toNumber(row.paid_coin_amount),
      originalBonusCoinAmount: toNumber(row.bonus_coin_amount),
      refundCoinAmount: amounts.refundCoinAmount,
      refundPaidCoinAmount: amounts.refundPaidCoinAmount,
      refundBonusCoinAmount: amounts.refundBonusCoinAmount,
      alreadyRefundedAmount: alreadyRefunded,
      purchasedAt: row.created_at as string,
      previouslyRefunded
    });
  }

  const totals = items.reduce(
    (acc, item) => {
      acc.totalCoinRefund += item.refundCoinAmount;
      acc.totalPaidCoinRefund += item.refundPaidCoinAmount;
      acc.totalBonusCoinRefund += item.refundBonusCoinAmount;
      acc.totalCoinPaid += item.originalPaidCoinAmount;
      acc.totalCoinBonus += item.originalBonusCoinAmount;
      return acc;
    },
    {
      totalCoinRefund: 0,
      totalPaidCoinRefund: 0,
      totalBonusCoinRefund: 0,
      totalCoinPaid: 0,
      totalCoinBonus: 0
    }
  );

  const preview: QualityRefundPreview = {
    items,
    userCount: userIds.size,
    transactionCount: items.length,
    ...totals,
    previouslyRefundedCount,
    duplicateWarning: previouslyRefundedCount > 0,
    emptyMessage:
      items.length === 0
        ? "Chưa có người mua nội dung này, không cần hoàn coin."
        : null
  };

  return { data: preview, error: null };
}

export type { QualityRefundPreviewItem };
