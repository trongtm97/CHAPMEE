import { getMonetizationConfig } from "@/lib/monetization/config";
import { getPlatformStrategy } from "@/lib/platform/platform-strategy";
import type { PaymentMode, PlatformPaymentProvider } from "@/types/payment";
import type { PlatformKey, PlatformStrategy } from "@/types/platform";

function asPaymentProvider(value: unknown, fallback: PlatformPaymentProvider): PlatformPaymentProvider {
  return typeof value === "string" && value.length > 0
    ? (value as PlatformPaymentProvider)
    : fallback;
}

function asPaymentMode(value: unknown, fallback: PaymentMode): PaymentMode {
  return typeof value === "string" && value.length > 0 ? (value as PaymentMode) : fallback;
}

function providerForMode(
  paymentMode: PaymentMode,
  platformKey: PlatformKey,
  fallback: PlatformPaymentProvider
): PlatformPaymentProvider {
  if (paymentMode === "web_payment") return "sepay";
  if (paymentMode === "consumption_only") return "none";
  if (paymentMode === "store_billing") {
    return platformKey === "ios_app_future" ? "apple_iap" : "google_play_billing";
  }
  return fallback;
}

export async function getResolvedPlatformStrategy(
  platformKey: PlatformKey
): Promise<PlatformStrategy> {
  const base = getPlatformStrategy(platformKey);
  const { settings } = await getMonetizationConfig({ includePrivate: true });

  if (platformKey === "web_desktop") {
    const paymentMode = asPaymentMode(
      settings["platform.web_desktop.purchase_mode"],
      base.payment_mode
    );
    return {
      ...base,
      payment_mode: paymentMode,
      payment_provider: asPaymentProvider(
        settings["platform.web.payment_provider"],
        providerForMode(paymentMode, platformKey, base.payment_provider)
      )
    };
  }

  if (platformKey === "web_mobile_pwa") {
    const paymentMode = asPaymentMode(
      settings["platform.web_mobile_pwa.purchase_mode"],
      base.payment_mode
    );
    return {
      ...base,
      payment_mode: paymentMode,
      payment_provider: asPaymentProvider(
        settings["platform.web_mobile.payment_provider"],
        providerForMode(paymentMode, platformKey, base.payment_provider)
      )
    };
  }

  if (platformKey === "android_app_future") {
    const paymentMode = asPaymentMode(
      settings["platform.android.purchase_mode"] ?? settings["platform.android.payment_mode"],
      base.payment_mode
    );
    return {
      ...base,
      payment_mode: paymentMode,
      payment_provider: providerForMode(paymentMode, platformKey, base.payment_provider)
    };
  }

  if (platformKey === "ios_app_future") {
    const paymentMode = asPaymentMode(
      settings["platform.ios.purchase_mode"] ?? settings["platform.ios.payment_mode"],
      base.payment_mode
    );
    return {
      ...base,
      payment_mode: paymentMode,
      payment_provider: providerForMode(paymentMode, platformKey, base.payment_provider)
    };
  }

  return base;
}
