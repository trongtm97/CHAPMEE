import { getMonetizationConfig } from "@/lib/monetization/config";
import { readPayoutProcessingDaysLabel } from "@/lib/finance/payout-processing-display";
import { buildStudioMonetizationConfigView } from "@/lib/studio/monetization-config";
import type { CreatorFinanceConfigView } from "@/types/finance";

function numberSetting(settings: Record<string, unknown>, key: string, fallback = 0) {
  const value = settings[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getCreatorFinanceConfig(): Promise<CreatorFinanceConfigView> {
  const [studioView, { settings }] = await Promise.all([
    buildStudioMonetizationConfigView({ includePrivate: true }),
    getMonetizationConfig({ includePrivate: true })
  ]);

  const raw = settings as Record<string, unknown>;
  const processingNote = String(raw["payout.processing_note"] ?? "").trim();

  return {
    creatorMonetizationEnabled: studioView.creatorMonetizationEnabled,
    withdrawalsEnabled: studioView.payoutsEnabled,
    withdrawalPinRequired: Boolean(raw["payout.withdrawal_pin_required"] ?? true),
    withdrawalReviewRequired: Boolean(raw["payout.manual_review_required"] ?? true),
    minWithdrawAmountVnd: studioView.minWithdrawAmountVnd,
    coinToVndRate: studioView.coinExchangeRateVnd,
    creatorRevenueSharePercent: studioView.revenueSharePaidChapterCreatorPercent,
    platformFeePercent: studioView.revenueSharePaidChapterPlatformPercent,
    payoutProcessingDaysLabel: readPayoutProcessingDaysLabel(raw),
    payoutMethodsEnabled: studioView.payoutAllowedMethods,
    coinDisplayName: studioView.coinDisplayName,
    policyNote: processingNote
  };
}
