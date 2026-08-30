import { isCreatorMonetizationAllowed } from "@/lib/creator-access";
import { calculateCreatorRevenue } from "@/lib/monetization/creator-revenue";
import { createClient } from "@/lib/data/server";

type RevenueShareType =
  | "tip"
  | "virtual_gift"
  | "paid_chapter"
  | "early_access"
  | "vip_pool"
  | "fan_club"
  | "bonus_pool";

type RevenueShareInput = {
  type: RevenueShareType;
  grossAmount: number;
  grossValue?: number;
  channelFee?: number;
  netValue?: number;
  paymentChannel?: string;
  creatorUserId: string;
  storyId?: string | null;
  paidCoinAmount?: number;
  bonusCoinAmount?: number;
};

export async function calculateRevenueShare(input: RevenueShareInput) {
  const amount = Number(input.grossValue ?? input.grossAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      gross_amount: 0,
      platform_fee: 0,
      creator_gross: 0,
      creator_net: 0,
      platform_net: 0,
      withdrawable_amount: 0,
      non_withdrawable_amount: 0
    };
  }

  const monetizationAllowed = await isCreatorMonetizationAllowed(input.creatorUserId);
  if (!monetizationAllowed) {
    return {
      gross_amount: amount,
      platform_fee: amount,
      creator_gross: 0,
      creator_net: 0,
      platform_net: amount,
      withdrawable_amount: 0,
      non_withdrawable_amount: 0
    };
  }

  if (input.storyId) {
    const db = await createClient();
    const { data: story } = await db
      .from("stories")
      .select("status")
      .eq("id", input.storyId)
      .maybeSingle();
    if (story && ["hidden", "rejected"].includes(String(story.status))) {
      return {
        gross_amount: amount,
        platform_fee: amount,
        creator_gross: 0,
        creator_net: 0,
        platform_net: amount,
        withdrawable_amount: 0,
        non_withdrawable_amount: 0
      };
    }
  }

  const moduleType =
    input.type === "virtual_gift"
      ? "gift"
      : input.type === "bonus_pool"
        ? "vip_pool"
        : input.type;
  const result = await calculateCreatorRevenue({
    moduleType,
    creatorUserId: input.creatorUserId,
    coinSpent: input.paidCoinAmount ?? input.bonusCoinAmount
      ? Number(input.paidCoinAmount ?? 0) + Number(input.bonusCoinAmount ?? 0)
      : amount,
    coinToVndRate: 1,
    paidCoinAmount: input.paidCoinAmount ?? 0,
    bonusCoinAmount: input.bonusCoinAmount ?? 0,
    paymentChannel: (input.paymentChannel as "web_sepay" | "google_play_billing" | "apple_iap" | "manual_admin" | undefined),
    feePercentApplied: input.channelFee != null && amount > 0 ? (Number(input.channelFee) / amount) * 100 : undefined,
    providerFeeVnd: input.channelFee,
    netValueVnd: input.netValue,
    metadata: { legacy_revenue_share_helper: true }
  });

  return {
    gross_amount: result.grossValueVnd,
    channel_fee: result.providerFeeVnd + result.storeFeeVnd,
    net_base_amount: result.revenueBasis === "net" ? result.netValueVnd : result.grossValueVnd,
    payment_channel: result.paymentChannel,
    platform_fee: 0,
    creator_gross: result.creatorRevenueVnd,
    creator_net: result.creatorRevenueVnd,
    platform_net: result.platformRevenueVnd,
    withdrawable_amount: result.creatorWithdrawableVnd,
    non_withdrawable_amount: result.creatorNonWithdrawableVnd,
    provider_fee_vnd: result.providerFeeVnd,
    store_fee_vnd: result.storeFeeVnd,
    net_value_vnd: result.netValueVnd,
    creator_percent: result.creatorPercent,
    fee_percent_applied: result.feePercentApplied,
    revenue_basis: result.revenueBasis,
    provider: result.provider,
    metadata: result.metadata
  };
}
