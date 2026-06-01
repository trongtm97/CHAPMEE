import {
  resolveCreatorFeePolicy,
  toCreatorFeePolicySnapshot
} from "@/lib/finance/resolve-creator-fee-policy";
import { roundVnd } from "@/lib/finance/round-vnd";
import type { CreatorFeePolicySnapshot } from "@/types/creator-fee-policy";
import type { CreatorRevenueBreakdown } from "@/types/revenue-share";
import type { PaymentChannel, PaymentProviderKey } from "@/types/payment";
import type {
  CreatorEarningSourceType,
  CreatorEarningCalculationSnapshot
} from "@/types/finance";

export type CreatorEarningBreakdownInput = {
  sourceType: CreatorEarningSourceType;
  creatorUserId: string;
  buyerUserId?: string | null;
  storyId?: string | null;
  chapterId?: string | null;
  sourceId?: string | null;
  coinAmount?: number | null;
  coinToVndRate: number;
  revenue: CreatorRevenueBreakdown;
  legacyTransactionId?: string | null;
};

export type CreatorEarningBreakdownResult = {
  grossAmountVnd: number;
  platformFeeVnd: number;
  paymentProcessingFeeVnd: number;
  taxOrAdjustmentVnd: number;
  creatorNetAmountVnd: number;
  platformFeePercent: number;
  creatorRevenueSharePercent: number;
  paymentProcessingFeePercent: number;
  calculationSnapshot: CreatorEarningCalculationSnapshot;
};

/** Doanh thu bonus admin — gross = net, không qua coin spend. */
export function buildAdminBonusRevenue(amountVnd: number): CreatorRevenueBreakdown {
  return {
    moduleType: "paid_chapter",
    creatorPercent: 100,
    revenueBasis: "gross",
    grossValueVnd: amountVnd,
    providerFeeVnd: 0,
    storeFeeVnd: 0,
    netValueVnd: amountVnd,
    creatorRevenueVnd: amountVnd,
    platformRevenueVnd: 0,
    creatorWithdrawableVnd: amountVnd,
    creatorNonWithdrawableVnd: 0,
    paidCoinAmount: 0,
    bonusCoinAmount: 0,
    feePercentApplied: 0,
    paymentChannel: "manual_admin" as PaymentChannel,
    provider: "manual" as PaymentProviderKey,
    metadata: { admin_bonus: true }
  };
}

function readFeePolicyFromRevenue(
  revenue: CreatorEarningBreakdownInput["revenue"]
): CreatorFeePolicySnapshot | null {
  const raw = revenue.metadata?.fee_policy;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  return raw as CreatorFeePolicySnapshot;
}

export async function calculateCreatorEarningBreakdown(
  input: CreatorEarningBreakdownInput
): Promise<CreatorEarningBreakdownResult> {
  const feePolicy = await resolveCreatorFeePolicy({
    creatorId: input.creatorUserId,
    transactionType: input.sourceType
  });

  const revenueFeePolicy = readFeePolicyFromRevenue(input.revenue);
  const effectiveFeePolicy = revenueFeePolicy ?? toCreatorFeePolicySnapshot(feePolicy);

  const grossAmountVnd = roundVnd(input.revenue.grossValueVnd);
  const platformFeeVnd = roundVnd(input.revenue.platformRevenueVnd);
  const creatorNetAmountVnd = roundVnd(input.revenue.creatorWithdrawableVnd);
  const paymentProcessingFeeVnd = 0;
  const taxOrAdjustmentVnd = 0;

  const snapshot: CreatorEarningCalculationSnapshot = {
    roundingRule: "round_half_up_integer_vnd",
    coinToVndRate: input.coinToVndRate,
    coinAmount: input.coinAmount ?? null,
    grossAmountVnd,
    platformFeeVnd,
    paymentProcessingFeeVnd,
    taxOrAdjustmentVnd,
    creatorNetAmountVnd,
    revenueBasis: "gross",
    moduleType: input.revenue.moduleType,
    creatorPercent: input.revenue.creatorPercent,
    feePercentApplied: 0,
    paymentChannel: input.revenue.paymentChannel,
    provider: input.revenue.provider,
    policySource: effectiveFeePolicy.policy_source,
    policyId: effectiveFeePolicy.policy_id,
    policyName: effectiveFeePolicy.policy_name,
    appliedPolicyType: effectiveFeePolicy.applied_policy_type,
    revenueSourceSnapshot: effectiveFeePolicy.revenue_source_snapshot,
    policyEffectiveFromSnapshot: effectiveFeePolicy.policy_effective_from_snapshot,
    authorPercentSnapshot: effectiveFeePolicy.author_percent_snapshot,
    platformPercentSnapshot: effectiveFeePolicy.platform_percent_snapshot,
    platformFeePercent: effectiveFeePolicy.platform_fee_percent,
    creatorRevenueSharePercent: effectiveFeePolicy.creator_revenue_share_percent,
    paymentProcessingFeePercent: 0,
    paymentProcessingFixedFeeVnd: 0,
    minWithdrawAmountOverride: effectiveFeePolicy.min_withdraw_amount_override ?? null,
    feeRules: {
      split_model: "gross_share_only",
      platform_from_revenue_split: true,
      channel_fees_included: false,
      extra_processing_percent: 0,
      extra_processing_fixed_vnd: 0,
      tax_percent: 0
    },
    calculatedAt: new Date().toISOString()
  };

  return {
    grossAmountVnd,
    platformFeeVnd,
    paymentProcessingFeeVnd,
    taxOrAdjustmentVnd,
    creatorNetAmountVnd,
    platformFeePercent: effectiveFeePolicy.platform_fee_percent,
    creatorRevenueSharePercent: effectiveFeePolicy.creator_revenue_share_percent,
    paymentProcessingFeePercent: 0,
    calculationSnapshot: snapshot
  };
}
