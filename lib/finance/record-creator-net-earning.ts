"use server";

import { calculateCreatorEarningBreakdown } from "@/lib/finance/calculate-creator-earning-breakdown";
import { insertCreatorWalletLedgerEntry } from "@/lib/supabase/creator-finance";
import { createClient } from "@/lib/supabase/server";
import { applyCreatorRevenueLedgerRecord } from "@/lib/supabase/wallets";
import { buildTransactionCode } from "@/lib/transactions/ledger";
import type { CreatorEarningSourceType } from "@/types/finance";
import type { CreatorRevenueBreakdown } from "@/types/revenue-share";
import type { CreatorEarningReleaseStatus } from "@/types/story-completion";
import type { CreatorRevenueStatus } from "@/types/wallet";
import type { TransactionSource, TransactionType } from "@/types/transaction";

export type RecordCreatorNetEarningInput = {
  creatorUserId: string;
  buyerUserId?: string | null;
  sourceType: CreatorEarningSourceType;
  sourceId?: string | null;
  storyId?: string | null;
  chapterId?: string | null;
  coinAmount?: number | null;
  coinToVndRate: number;
  revenue: CreatorRevenueBreakdown;
  revenueStatus?: CreatorRevenueStatus;
  releaseStatus?: CreatorEarningReleaseStatus;
  lockedReason?: string | null;
  transactionType?: TransactionType;
  transactionSource?: TransactionSource;
  transactionCode?: string;
  metadata?: Record<string, unknown>;
};

export async function recordCreatorNetEarning(input: RecordCreatorNetEarningInput) {
  const breakdown = await calculateCreatorEarningBreakdown({
    coinAmount: input.coinAmount,
    coinToVndRate: input.coinToVndRate,
    creatorUserId: input.creatorUserId,
    buyerUserId: input.buyerUserId,
    chapterId: input.chapterId,
    revenue: input.revenue,
    sourceId: input.sourceId,
    sourceType: input.sourceType,
    storyId: input.storyId
  });

  if (breakdown.creatorNetAmountVnd <= 0) {
    return { data: null, error: "Creator net amount must be > 0." };
  }

  const supabase = await createClient();

  const { data: earningRow, error: earningError } = await supabase
    .from("creator_earning_transactions")
    .insert({
      creator_user_id: input.creatorUserId,
      buyer_user_id: input.buyerUserId ?? null,
      source_type: input.sourceType,
      source_id: input.sourceId ?? null,
      story_id: input.storyId ?? null,
      chapter_id: input.chapterId ?? null,
      coin_amount: input.coinAmount ?? null,
      coin_to_vnd_rate: input.coinToVndRate,
      gross_amount_vnd: breakdown.grossAmountVnd,
      platform_fee_vnd: breakdown.platformFeeVnd,
      payment_processing_fee_vnd: breakdown.paymentProcessingFeeVnd,
      tax_or_adjustment_vnd: breakdown.taxOrAdjustmentVnd,
      creator_net_amount_vnd: breakdown.creatorNetAmountVnd,
      platform_fee_percent: breakdown.platformFeePercent,
      creator_revenue_share_percent: breakdown.creatorRevenueSharePercent,
      payment_processing_fee_percent: breakdown.paymentProcessingFeePercent,
      calculation_snapshot: breakdown.calculationSnapshot,
      status: "settled",
      release_status: input.releaseStatus ?? "available",
      locked_reason: input.lockedReason ?? null
    })
    .select("id")
    .single();

  if (earningError || !earningRow) {
    return {
      data: null,
      error: earningError?.message ?? "Không thể tạo earning transaction."
    };
  }

  const tx = await applyCreatorRevenueLedgerRecord({
    creatorUserId: input.creatorUserId,
    transactionCode: input.transactionCode ?? buildTransactionCode("CRREV"),
    type: input.transactionType ?? "creator_revenue_share",
    source: input.transactionSource ?? "system",
    amountVnd: breakdown.creatorNetAmountVnd,
    revenueStatus: input.revenueStatus ?? "available",
    metadata: {
      ...(input.metadata ?? {}),
      release_status: input.releaseStatus ?? "available",
      locked_reason: input.lockedReason ?? null,
      earning_transaction_id: earningRow.id,
      gross_amount_vnd: breakdown.grossAmountVnd,
      platform_fee_vnd: breakdown.platformFeeVnd,
      payment_processing_fee_vnd: breakdown.paymentProcessingFeeVnd,
      creator_net_amount_vnd: breakdown.creatorNetAmountVnd
    },
    userId: input.buyerUserId ?? null,
    storyId: input.storyId ?? null,
    chapterId: input.chapterId ?? null
  });

  if (!tx.data) {
    return { data: null, error: tx.error ?? "Không thể cập nhật ví creator." };
  }

  await supabase
    .from("creator_earning_transactions")
    .update({ legacy_transaction_id: tx.data.id })
    .eq("id", earningRow.id);

  await supabase
    .from("transactions")
    .update({
      money_amount_vnd: breakdown.grossAmountVnd,
      gross_amount_vnd: breakdown.grossAmountVnd,
      creator_gross_vnd: breakdown.grossAmountVnd,
      platform_fee_vnd: breakdown.platformFeeVnd,
      creator_net_vnd: breakdown.creatorNetAmountVnd,
      net_amount_vnd: breakdown.creatorNetAmountVnd,
      creator_percent: breakdown.creatorRevenueSharePercent,
      fee_percent_applied: breakdown.paymentProcessingFeePercent
    })
    .eq("id", tx.data.id);

  const balanceType =
    input.revenueStatus === "pending"
      ? "pending"
      : input.revenueStatus === "locked"
        ? "locked"
        : "available";

  await insertCreatorWalletLedgerEntry({
    creatorUserId: input.creatorUserId,
    type: "earning_net_credit",
    amountVnd: breakdown.creatorNetAmountVnd,
    direction: "credit",
    amountCoin: input.coinAmount ?? null,
    sourceType: input.sourceType,
    sourceId: earningRow.id,
    storyId: input.storyId ?? null,
    chapterId: input.chapterId ?? null,
    earningTransactionId: earningRow.id,
    balanceType,
    description: `Cộng NET doanh thu (${input.sourceType})`,
    metadata: {
      legacy_transaction_id: tx.data.id,
      gross_amount_vnd: breakdown.grossAmountVnd,
      fees_total_vnd:
        breakdown.platformFeeVnd +
        breakdown.paymentProcessingFeeVnd +
        breakdown.taxOrAdjustmentVnd,
      creator_net_amount_vnd: breakdown.creatorNetAmountVnd
    }
  });

  return {
    data: {
      earningTransactionId: earningRow.id,
      transactionId: tx.data.id,
      breakdown
    },
    error: null
  };
}
