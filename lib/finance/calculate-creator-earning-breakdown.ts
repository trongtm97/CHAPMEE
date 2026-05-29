import {
  resolveCreatorFeePolicy,
  toCreatorFeePolicySnapshot
} from "@/lib/finance/resolve-creator-fee-policy";
import { getMonetizationConfig } from "@/lib/monetization/config";
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
  const [{ settings }, feePolicy] = await Promise.all([
    getMonetizationConfig({ includePrivate: true }),
    resolveCreatorFeePolicy({
      creatorId: input.creatorUserId,
      transactionType: input.sourceType
    })
  ]);

  const revenueFeePolicy = readFeePolicyFromRevenue(input.revenue);
  const effectiveFeePolicy = revenueFeePolicy ?? toCreatorFeePolicySnapshot(feePolicy);

  const configTaxPercent = Number(settings["finance.tax_percent"] ?? 0);
  const extraProcessingPercent = effectiveFeePolicy.payment_processing_fee_percent;
  const extraProcessingFixed = effectiveFeePolicy.payment_processing_fixed_fee_vnd;

  const grossAmountVnd = roundVnd(input.revenue.grossValueVnd);
  const paymentProcessingFeeVnd = roundVnd(
    input.revenue.providerFeeVnd +
      input.revenue.storeFeeVnd +
      (grossAmountVnd * extraProcessingPercent) / 100 +
      extraProcessingFixed
  );
  const platformFeeVnd = roundVnd(input.revenue.platformRevenueVnd);
  const taxOrAdjustmentVnd = roundVnd((grossAmountVnd * configTaxPercent) / 100);

  let creatorNetAmountVnd = roundVnd(input.revenue.creatorWithdrawableVnd);

  const computedNet =
    grossAmountVnd - platformFeeVnd - paymentProcessingFeeVnd - taxOrAdjustmentVnd;

  if (Math.abs(creatorNetAmountVnd - computedNet) > 1) {
    creatorNetAmountVnd = Math.max(0, computedNet);
  }

  const snapshot: CreatorEarningCalculationSnapshot = {
    roundingRule: "round_half_up_integer_vnd",
    coinToVndRate: input.coinToVndRate,
    coinAmount: input.coinAmount ?? null,
    grossAmountVnd,
    platformFeeVnd,
    paymentProcessingFeeVnd,
    taxOrAdjustmentVnd,
    creatorNetAmountVnd,
    revenueBasis: input.revenue.revenueBasis,
    moduleType: input.revenue.moduleType,
    creatorPercent: input.revenue.creatorPercent,
    feePercentApplied: input.revenue.feePercentApplied,
    paymentChannel: input.revenue.paymentChannel,
    provider: input.revenue.provider,
    policySource: effectiveFeePolicy.policy_source,
    policyId: effectiveFeePolicy.policy_id,
    policyName: effectiveFeePolicy.policy_name,
    platformFeePercent: effectiveFeePolicy.platform_fee_percent,
    creatorRevenueSharePercent: effectiveFeePolicy.creator_revenue_share_percent,
    paymentProcessingFeePercent: effectiveFeePolicy.payment_processing_fee_percent,
    paymentProcessingFixedFeeVnd: effectiveFeePolicy.payment_processing_fixed_fee_vnd,
    minWithdrawAmountOverride: effectiveFeePolicy.min_withdraw_amount_override ?? null,
    feeRules: {
      platform_from_revenue_split: true,
      channel_fees_included: true,
      extra_processing_percent: extraProcessingPercent,
      extra_processing_fixed_vnd: extraProcessingFixed,
      tax_percent: configTaxPercent
    },
    calculatedAt: new Date().toISOString()
  };

  return {
    grossAmountVnd,
    platformFeeVnd,
    paymentProcessingFeeVnd,
    taxOrAdjustmentVnd,
    creatorNetAmountVnd,
    platformFeePercent: roundVnd(
      grossAmountVnd > 0 ? (platformFeeVnd / grossAmountVnd) * 100 : 0
    ),
    creatorRevenueSharePercent: effectiveFeePolicy.creator_revenue_share_percent,
    paymentProcessingFeePercent: roundVnd(
      grossAmountVnd > 0 ? (paymentProcessingFeeVnd / grossAmountVnd) * 100 : 0
    ),
    calculationSnapshot: snapshot
  };
}
