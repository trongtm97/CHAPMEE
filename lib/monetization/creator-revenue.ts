import { isCreatorMonetizationAllowed } from "@/lib/creator-access";
import { normalizeRevenueSharePercents } from "@/lib/admin/creator-fee-policy-shared";
import {
  resolveCreatorFeePolicy,
  toCreatorFeePolicySnapshot
} from "@/lib/finance/resolve-creator-fee-policy";
import { getMonetizationConfig } from "@/lib/monetization/config";
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

  return {
    paymentChannel: input.paymentChannel ?? "web_sepay",
    provider: input.provider ?? "sepay"
  };
}

function resolveGrossVnd(input: CreatorRevenueInput): number {
  const lotAllocations = input.coinLotAllocations ?? [];
  if (lotAllocations.length > 0) {
    const lotGross = lotAllocations.reduce((sum, item) => {
      const lotCoins =
        numberValue(item.paid_coin_amount, 0) + numberValue(item.bonus_coin_amount, 0);
      const ratio = numberValue(item.coin_to_vnd_rate, input.coinToVndRate);
      return sum + lotCoins * ratio;
    }, 0);
    if (lotGross > 0) {
      return roundCurrency(lotGross);
    }
  }

  return roundCurrency(input.coinSpent * input.coinToVndRate);
}

/** @deprecated Chỉ còn trả gross — không trừ phí kênh trước khi chia. */
export async function resolveRevenueFeeDetails(
  input: CreatorRevenueInput
): Promise<RevenueFeeDetails> {
  const context = resolveDefaultPaymentContext(input);
  const grossValueVnd = resolveGrossVnd(input);

  return {
    paymentChannel: context.paymentChannel,
    provider: context.provider,
    feePercentApplied: 0,
    grossValueVnd,
    providerFeeVnd: 0,
    storeFeeVnd: 0,
    netValueVnd: grossValueVnd,
    estimated: false
  };
}

export async function calculateCreatorRevenue(
  input: CreatorRevenueInput
): Promise<CreatorRevenueBreakdown> {
  const context = resolveDefaultPaymentContext(input);
  const grossValueVnd = resolveGrossVnd(input);

  const monetizationAllowed = await isCreatorMonetizationAllowed(input.creatorUserId);
  if (!monetizationAllowed) {
    return {
      moduleType: input.moduleType,
      creatorPercent: 0,
      revenueBasis: "gross",
      grossValueVnd,
      providerFeeVnd: 0,
      storeFeeVnd: 0,
      netValueVnd: grossValueVnd,
      creatorRevenueVnd: 0,
      platformRevenueVnd: grossValueVnd,
      creatorWithdrawableVnd: 0,
      creatorNonWithdrawableVnd: 0,
      paidCoinAmount: numberValue(input.paidCoinAmount, 0),
      bonusCoinAmount: numberValue(input.bonusCoinAmount, 0),
      feePercentApplied: 0,
      paymentChannel: context.paymentChannel,
      provider: context.provider,
      metadata: { monetization_blocked: true, ...(input.metadata ?? {}) }
    };
  }

  const [config, feePolicy] = await Promise.all([
    getMonetizationConfig({ includePrivate: true }),
    resolveCreatorFeePolicy({
      creatorId: input.creatorUserId,
      transactionType: input.moduleType
    })
  ]);

  const normalizedShare = normalizeRevenueSharePercents(
    feePolicy.creatorRevenueSharePercent,
    feePolicy.platformFeePercent
  );
  const feePolicySnapshot = toCreatorFeePolicySnapshot(feePolicy);

  const creatorRevenueVnd = roundCurrency(
    (grossValueVnd * normalizedShare.authorPercent) / 100
  );
  const platformRevenueVnd = roundCurrency(
    (grossValueVnd * normalizedShare.platformPercent) / 100
  );

  const paidCoinAmount = numberValue(input.paidCoinAmount, 0);
  const bonusCoinAmount = numberValue(input.bonusCoinAmount, 0);
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
    creatorPercent: normalizedShare.authorPercent,
    revenueBasis: "gross",
    grossValueVnd,
    providerFeeVnd: 0,
    storeFeeVnd: 0,
    netValueVnd: grossValueVnd,
    creatorRevenueVnd,
    platformRevenueVnd,
    creatorWithdrawableVnd,
    creatorNonWithdrawableVnd,
    paidCoinAmount,
    bonusCoinAmount,
    feePercentApplied: 0,
    paymentChannel: context.paymentChannel,
    provider: context.provider,
    metadata: {
      ...(input.metadata ?? {}),
      split_model: "gross_share_only",
      fee_policy: feePolicySnapshot
    }
  };
}
