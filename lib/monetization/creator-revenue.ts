import {
  resolveCreatorFeePolicy,
  toCreatorFeePolicySnapshot
} from "@/lib/finance/resolve-creator-fee-policy";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { calculateChannelAmounts, resolveFeePercent } from "@/lib/payments/payment-fees";
import type { CoinLotAllocation } from "@/types/coin-lot";
import type { PaymentChannel, PaymentProviderKey } from "@/types/payment";
import type {
  BonusCoinSource,
  CreatorRevenueBreakdown,
  CreatorRevenueModule,
  RevenueFeeDetails
} from "@/types/revenue-share";

type CreatorRevenueInput = {
  moduleType: CreatorRevenueModule;
  creatorUserId: string;
  coinSpent: number;
  coinToVndRate: number;
  paidCoinAmount?: number;
  bonusCoinAmount?: number;
  bonusCoinSource?: BonusCoinSource;
  paymentChannel?: PaymentChannel;
  provider?: PaymentProviderKey;
  feePercentApplied?: number;
  providerFeeVnd?: number;
  storeFeeVnd?: number;
  netValueVnd?: number;
  storyId?: string | null;
  chapterId?: string | null;
  coinLotAllocations?: CoinLotAllocation[];
  metadata?: Record<string, unknown>;
};

function roundCurrency(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveDefaultPaymentContext(input: CreatorRevenueInput): {
  paymentChannel: PaymentChannel;
  provider: PaymentProviderKey;
} {
  if (input.paymentChannel && input.provider) {
    return { paymentChannel: input.paymentChannel, provider: input.provider };
  }

  // Coin spending does not always carry lot-level channel metadata yet.
  return {
    paymentChannel: input.paymentChannel ?? "web_sepay",
    provider: input.provider ?? "sepay"
  };
}

export async function resolveRevenueFeeDetails(
  input: CreatorRevenueInput
): Promise<RevenueFeeDetails> {
  const config = await getMonetizationConfig({ includePrivate: true });
  const context = resolveDefaultPaymentContext(input);

  const grossValueVnd = roundCurrency(input.coinSpent * input.coinToVndRate);
  const channelEstimate = calculateChannelAmounts(
    grossValueVnd,
    context.paymentChannel,
    config.settings
  );
  const estimated = !(
    Number.isFinite(input.feePercentApplied) &&
    Number.isFinite(input.providerFeeVnd) &&
    Number.isFinite(input.storeFeeVnd) &&
    Number.isFinite(input.netValueVnd)
  );

  const feePercentApplied = roundCurrency(
    numberValue(
      input.feePercentApplied,
      resolveFeePercent(context.paymentChannel, config.settings)
    )
  );
  const providerFeeVnd = roundCurrency(
    numberValue(input.providerFeeVnd, channelEstimate.providerFeeVnd)
  );
  const storeFeeVnd = roundCurrency(numberValue(input.storeFeeVnd, channelEstimate.storeFeeVnd));
  const netValueVnd = roundCurrency(
    numberValue(input.netValueVnd, Math.max(grossValueVnd - providerFeeVnd - storeFeeVnd, 0))
  );

  return {
    paymentChannel: context.paymentChannel,
    provider: context.provider,
    feePercentApplied,
    grossValueVnd,
    providerFeeVnd,
    storeFeeVnd,
    netValueVnd,
    estimated
  };
}

export async function calculateCreatorRevenue(
  input: CreatorRevenueInput
): Promise<CreatorRevenueBreakdown> {
  const [config, feeDetails, feePolicy] = await Promise.all([
    getMonetizationConfig({ includePrivate: true }),
    resolveRevenueFeeDetails(input),
    resolveCreatorFeePolicy({
      creatorId: input.creatorUserId,
      transactionType: input.moduleType
    })
  ]);

  const creatorPercent = feePolicy.creatorRevenueSharePercent;
  const platformSharePercent = feePolicy.platformFeePercent;
  const calculateOnNetAfterChannelFee = feePolicy.calculateOnNetAfterChannelFee;
  const revenueBasis: "gross" | "net" = feePolicy.revenueBasis;
  const feePolicySnapshot = toCreatorFeePolicySnapshot(feePolicy);

  const paidCoinAmount = numberValue(input.paidCoinAmount, 0);
  const bonusCoinAmount = numberValue(input.bonusCoinAmount, 0);
  const lotAllocations = input.coinLotAllocations ?? [];
  const hasLotAllocations = lotAllocations.length > 0;
  const allocationCoinTotal = lotAllocations.reduce(
    (sum, item) => sum + numberValue(item.paid_coin_amount, 0) + numberValue(item.bonus_coin_amount, 0),
    0
  );
  const lotGrossWeighted = lotAllocations.reduce((sum, item) => {
    const lotCoins = numberValue(item.paid_coin_amount, 0) + numberValue(item.bonus_coin_amount, 0);
    const ratio = numberValue(item.coin_to_vnd_rate, input.coinToVndRate);
    return sum + lotCoins * ratio;
  }, 0);
  const lotNetWeighted = lotAllocations.reduce((sum, item) => {
    const lotCoins = numberValue(item.paid_coin_amount, 0) + numberValue(item.bonus_coin_amount, 0);
    const ratio = numberValue(item.coin_to_vnd_rate, input.coinToVndRate);
    const gross = lotCoins * ratio;
    const netRatio = numberValue(item.net_ratio, NaN);
    const computedNet =
      Number.isFinite(netRatio) && netRatio > 0
        ? gross * netRatio
        : Math.max(gross - numberValue(item.provider_fee_vnd, 0) - numberValue(item.store_fee_vnd, 0), 0);
    return sum + computedNet;
  }, 0);
  const useLotWeightedNet =
    hasLotAllocations && allocationCoinTotal > 0 && lotGrossWeighted > 0 && lotNetWeighted > 0;

  const effectiveGrossVnd = useLotWeightedNet ? roundCurrency(lotGrossWeighted) : feeDetails.grossValueVnd;
  const effectiveNetVnd = useLotWeightedNet ? roundCurrency(lotNetWeighted) : feeDetails.netValueVnd;
  const effectiveProviderFeeVnd = roundCurrency(
    Math.max(effectiveGrossVnd - effectiveNetVnd, 0)
  );

  const effectiveBase = revenueBasis === "net" ? effectiveNetVnd : effectiveGrossVnd;
  const creatorRevenueVnd = roundCurrency((effectiveBase * creatorPercent) / 100);
  const platformFromPercent = roundCurrency((effectiveBase * platformSharePercent) / 100);
  const platformRevenueVnd =
    input.moduleType === "tip" && feePolicy.tipPlatformFeePercent != null
      ? roundCurrency((effectiveBase * feePolicy.tipPlatformFeePercent) / 100)
      : feePolicy.source === "creator_override" && feePolicy.platformFeePercent > 0
        ? platformFromPercent
        : roundCurrency(Math.max(effectiveBase - creatorRevenueVnd, 0));

  const totalCoinSpent = Math.max(paidCoinAmount + bonusCoinAmount, 0);
  const bonusRatio = totalCoinSpent > 0 ? Math.min(1, bonusCoinAmount / totalCoinSpent) : 0;
  const bonusAttributedRevenue = roundCurrency(creatorRevenueVnd * bonusRatio);
  const bonusSource: BonusCoinSource = input.bonusCoinSource ?? "coin_pack";
  const factorKey = `revenue_share.bonus_withdrawable_factor.${bonusSource}` as const;
  const bonusWithdrawFactor = numberValue(config.settings[factorKey], 0) / 100;
  const creatorWithdrawableFromBonus = roundCurrency(
    bonusAttributedRevenue * bonusWithdrawFactor
  );
  const creatorNonWithdrawableFromBonus = roundCurrency(
    bonusAttributedRevenue - creatorWithdrawableFromBonus
  );
  const creatorPaidCoinRevenue = roundCurrency(creatorRevenueVnd - bonusAttributedRevenue);
  const creatorWithdrawableVnd = roundCurrency(
    Math.max(creatorPaidCoinRevenue + creatorWithdrawableFromBonus, 0)
  );
  const creatorNonWithdrawableVnd = roundCurrency(
    Math.max(creatorNonWithdrawableFromBonus, 0)
  );

  return {
    moduleType: input.moduleType,
    creatorPercent,
    revenueBasis,
    grossValueVnd: effectiveGrossVnd,
    providerFeeVnd: effectiveProviderFeeVnd,
    storeFeeVnd: useLotWeightedNet ? 0 : feeDetails.storeFeeVnd,
    netValueVnd: effectiveNetVnd,
    creatorRevenueVnd,
    platformRevenueVnd,
    creatorWithdrawableVnd,
    creatorNonWithdrawableVnd,
    paidCoinAmount,
    bonusCoinAmount,
    feePercentApplied: feeDetails.feePercentApplied,
    paymentChannel: feeDetails.paymentChannel,
    provider: feeDetails.provider,
    metadata: {
      ...(input.metadata ?? {}),
      fee_source: feeDetails.estimated ? "estimated_from_channel_config" : "explicit",
      fee_estimated: feeDetails.estimated,
      has_lot_allocations: hasLotAllocations,
      lot_weighted_net_used: useLotWeightedNet,
      coin_lot_allocations: lotAllocations,
      fee_policy: feePolicySnapshot
    }
  };
}
