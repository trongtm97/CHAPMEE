import type { PaymentChannel, PaymentProviderKey } from "@/types/payment";
import type { CoinLotAllocation } from "@/types/coin-lot";

export type CreatorRevenueModule =
  | "paid_chapter"
  | "early_access"
  | "tip"
  | "gift"
  | "fan_club"
  | "vip_pool";

export type BonusCoinSource =
  | "coin_pack"
  | "rewarded_ads"
  | "referral_bonus"
  | "admin_grant";

export type RevenueFeeDetails = {
  paymentChannel: PaymentChannel;
  provider: PaymentProviderKey;
  feePercentApplied: number;
  grossValueVnd: number;
  providerFeeVnd: number;
  storeFeeVnd: number;
  netValueVnd: number;
  estimated: boolean;
};

export type CreatorRevenueBreakdown = {
  moduleType: CreatorRevenueModule;
  creatorPercent: number;
  revenueBasis: "gross" | "net";
  grossValueVnd: number;
  providerFeeVnd: number;
  storeFeeVnd: number;
  netValueVnd: number;
  creatorRevenueVnd: number;
  platformRevenueVnd: number;
  creatorWithdrawableVnd: number;
  creatorNonWithdrawableVnd: number;
  paidCoinAmount: number;
  bonusCoinAmount: number;
  feePercentApplied: number;
  paymentChannel: PaymentChannel;
  provider: PaymentProviderKey;
  metadata: Record<string, unknown>;
};

export type RevenueAllocationInput = {
  allocations?: CoinLotAllocation[];
};
