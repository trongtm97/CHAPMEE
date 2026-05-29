import { getMonetizationConfig } from "@/lib/monetization/config";
import { getResolvedPlatformStrategy } from "@/lib/config/platform-config";
import { detectRuntimePlatform } from "@/lib/platform/runtime-platform";
import type { PaymentMode } from "@/types/payment";
import type { PlatformKey } from "@/types/platform";

export type PurchaseUiPolicy = {
  runtimePlatform: PlatformKey;
  purchaseMode: PaymentMode;
  showSePayTopUp: boolean;
  showStoreBilling: boolean;
  showExternalLink: boolean;
  hideTopUp: boolean;
  insufficientCoinMessage: string;
};

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function getExternalLinkEligibilityFlag(
  settings: Record<string, unknown>,
  platform: PlatformKey
) {
  if (platform === "android_app_future") {
    return asBoolean(settings["platform.android.external_link_eligible_enabled"]);
  }
  if (platform === "ios_app_future") {
    return asBoolean(settings["platform.ios.external_link_eligible_enabled"]);
  }
  return false;
}

function buildPolicy(input: {
  platform: PlatformKey;
  purchaseMode: PaymentMode;
  externalLinkEligibleEnabled: boolean;
}): PurchaseUiPolicy {
  const { platform, purchaseMode, externalLinkEligibleEnabled } = input;
  const showSePayTopUp = purchaseMode === "web_payment";
  const showStoreBilling = purchaseMode === "store_billing";
  const showExternalLink =
    purchaseMode === "external_link_eligible" && externalLinkEligibleEnabled;
  const hideTopUp =
    purchaseMode === "consumption_only" ||
    (purchaseMode === "external_link_eligible" && !showExternalLink);

  return {
    runtimePlatform: platform,
    purchaseMode,
    showSePayTopUp,
    showStoreBilling,
    showExternalLink,
    hideTopUp,
    insufficientCoinMessage: "Bạn cần thêm coin để mở nội dung này."
  };
}

export async function getPurchaseUiPolicyForPlatform(
  platform: PlatformKey
): Promise<PurchaseUiPolicy> {
  const [strategy, config] = await Promise.all([
    getResolvedPlatformStrategy(platform),
    getMonetizationConfig({ includePrivate: true })
  ]);
  const settings = config.settings as Record<string, unknown>;
  const externalLinkEligibleEnabled = getExternalLinkEligibilityFlag(
    settings,
    platform
  );
  return buildPolicy({
    platform,
    purchaseMode: strategy.payment_mode,
    externalLinkEligibleEnabled
  });
}

export async function getPurchaseUiPolicyForRequest(): Promise<PurchaseUiPolicy> {
  const runtimePlatform = await detectRuntimePlatform();
  return getPurchaseUiPolicyForPlatform(runtimePlatform);
}
