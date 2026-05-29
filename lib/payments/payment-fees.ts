import type { MonetizationSettingsMap } from "@/types/monetization";
import type { PaymentChannel } from "@/types/payment";

function asNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveFeePercent(
  channel: PaymentChannel,
  settings: MonetizationSettingsMap
) {
  const standard = asNumber(settings["payments.store.standard_fee_percent"], 30);

  if (channel === "web_sepay") {
    return asNumber(settings["payments.sepay.default_fee_percent"], 2);
  }

  if (channel === "google_play_billing") {
    const googleStandard = asNumber(
      settings["payments.google_play.standard_fee_percent"],
      standard
    );
    const googleDefault = asNumber(
      settings["payments.google_play.default_store_fee_percent"],
      15
    );
    return Boolean(settings["payments.google_play.use_reduced_fee_estimate"])
      ? googleDefault
      : googleStandard;
  }

  if (channel === "apple_iap") {
    return asNumber(settings["payments.apple_iap.default_store_fee_percent"], standard);
  }

  return 0;
}

export function calculateChannelAmounts(
  grossAmountVnd: number,
  channel: PaymentChannel,
  settings: MonetizationSettingsMap
) {
  const feePercentApplied = resolveFeePercent(channel, settings);
  const feeAmount = Math.round((grossAmountVnd * feePercentApplied) / 100);

  return {
    feePercentApplied,
    providerFeeVnd: channel === "web_sepay" ? feeAmount : 0,
    storeFeeVnd: channel === "web_sepay" ? 0 : feeAmount,
    netAmountVnd: Math.max(grossAmountVnd - feeAmount, 0)
  };
}
