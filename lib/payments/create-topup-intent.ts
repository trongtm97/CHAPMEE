"use server";

import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getMonetizationConfig } from "@/lib/monetization/config";
import {
  createCheckoutSessionRecord,
  updateCheckoutSessionStatus
} from "@/lib/data/checkout-sessions";
import { getPaymentProviderSettings } from "@/lib/data/payment-provider-settings";
import { getPaymentProviderAdapter } from "@/lib/payments/providers";
import { calculateChannelAmounts } from "@/lib/payments/payment-fees";
import { getSePayRuntimeConfig } from "@/lib/payments/sepay-config";
import { generateNumericPaymentCode } from "@/lib/payments/payment-code";
import { validateTopupPackageForPayment } from "@/lib/topup-packages/validate-payment";
import type { PaymentProviderKey } from "@/types/payment";
import { isStaffFromContext } from "@/lib/auth/permissions";

const CHANNEL_BY_PROVIDER: Record<PaymentProviderKey, "web_sepay" | "google_play_billing" | "apple_iap" | "manual_admin"> = {
  sepay: "web_sepay",
  google_play_billing: "google_play_billing",
  apple_iap: "apple_iap",
  manual: "manual_admin",
  mock_test: "web_sepay",
  vnpay: "web_sepay",
  momo: "web_sepay",
  zalopay: "web_sepay",
  vietqr: "web_sepay",
  app_store_iap: "apple_iap"
};

function resolvePlatform(channel: ReturnType<typeof resolveChannel>) {
  if (channel === "google_play_billing") return "android" as const;
  if (channel === "apple_iap") return "ios" as const;
  if (channel === "manual_admin") return "admin" as const;
  return "web" as const;
}

function resolveChannel(provider: PaymentProviderKey) {
  return CHANNEL_BY_PROVIDER[provider] ?? "web_sepay";
}

function isPurchaseEnabled(settings: Record<string, unknown>) {
  return (
    Boolean(settings["monetization.enabled"]) &&
    Boolean(settings["coin.enabled"]) &&
    Boolean(settings["coin.purchase_enabled"]) &&
    Boolean(settings["payments.enabled"])
  );
}

export type CreateTopupIntentInput = {
  userId: string;
  packageId: string;
  provider: PaymentProviderKey;
};

export type CreateTopupIntentResult = {
  ok: boolean;
  error?: string;
  checkoutSessionId?: string;
  redirectUrl?: string | null;
  instruction?: string | null;
};

/**
 * Create a pending top-up checkout from package_id only.
 * Never reads amount/coin fields from the client — snapshot comes from DB.
 */
export async function createTopupIntent(
  input: CreateTopupIntentInput
): Promise<CreateTopupIntentResult> {
  try {
    const [{ profile }, config, packageValidation, providerSettingsResult] =
      await Promise.all([
        getCurrentUser(),
        getMonetizationConfig({ includePrivate: true }),
        validateTopupPackageForPayment(input.packageId),
        getPaymentProviderSettings()
      ]);

    if (!profile || profile.id !== input.userId) {
      return { ok: false, error: "Bạn không có quyền tạo checkout cho user khác." };
    }

    const authContext = await getCurrentAuthContext();
    if (authContext?.flags.isBanned) {
      return {
        ok: false,
        error: "Tài khoản của bạn đang bị hạn chế. Không thể nạp Xu."
      };
    }
    const canTopup =
      Boolean(authContext?.permissions.includes("wallet.topup")) ||
      Boolean(authContext?.permissions.includes("finance.wallet.adjust")) ||
      isStaffFromContext(authContext);

    if (!canTopup) {
      return { ok: false, error: "Bạn không có quyền nạp Xu." };
    }

    if (!isPurchaseEnabled(config.settings as Record<string, unknown>)) {
      return { ok: false, error: "Nạp Xu đang tắt bởi admin config." };
    }

    if (!packageValidation.ok) {
      return { ok: false, error: packageValidation.error };
    }

    const snapshot = packageValidation.snapshot;
    const provider = input.provider;

    if (provider === "sepay") {
      if (!Boolean(config.settings["payments.provider_sepay_enabled"])) {
        return { ok: false, error: "SePay đang tắt bởi admin config." };
      }
      const sepay = await getSePayRuntimeConfig();
      if (!sepay.ready) {
        return {
          ok: false,
          error: `SePay provider chưa cấu hình: ${sepay.missing.join(", ")}`
        };
      }
    }

    const providerSetting = providerSettingsResult.data.find(
      (item) => item.provider_key === provider
    );
    if (!providerSetting || !providerSetting.enabled) {
      return { ok: false, error: "Payment provider này đang tắt." };
    }

    const paymentChannel = resolveChannel(provider);
    const checkoutCode = generateNumericPaymentCode(12);
    const sepayRuntime = provider === "sepay" ? await getSePayRuntimeConfig() : null;
    const expiresInMinutes = sepayRuntime?.config.orderExpireMinutes ?? 30;
    const created = await createCheckoutSessionRecord({
      checkoutCode,
      userId: input.userId,
      coinPackId: snapshot.package_id,
      paymentChannel,
      provider,
      grossAmountVnd: snapshot.amount_vnd,
      ...calculateChannelAmounts(
        snapshot.amount_vnd,
        paymentChannel,
        config.settings
      ),
      currency: "VND",
      baseCoinAmount: snapshot.base_coin,
      bonusCoinAmount: snapshot.bonus_coin,
      platform: resolvePlatform(paymentChannel),
      transferContent: checkoutCode,
      providerPayload: {},
      packageSnapshotJson: snapshot,
      expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString()
    });

    if (!created.data) {
      return { ok: false, error: created.error ?? "Không tạo được checkout session." };
    }

    const adapter = getPaymentProviderAdapter(provider);
    const providerResult = await adapter.createCheckout(created.data, {
      testMode:
        Boolean(config.settings["payments.test_mode"]) ||
        Boolean(config.settings["monetization.test_mode"])
    });

    if (!providerResult.ok) {
      await updateCheckoutSessionStatus({
        sessionId: created.data.id,
        status: "failed",
        providerPayload: { error: providerResult.error ?? "Provider create failed." }
      });
      return {
        ok: false,
        error: providerResult.error ?? "Cannot create provider checkout."
      };
    }

    const updated = await updateCheckoutSessionStatus({
      sessionId: created.data.id,
      status: "pending",
      paymentReference: providerResult.providerReference ?? null,
      providerReference: providerResult.providerReference ?? null,
      transferContent:
        typeof providerResult.rawPayload?.transferContent === "string"
          ? providerResult.rawPayload.transferContent
          : created.data.transfer_content,
      qrUrl:
        typeof providerResult.rawPayload?.qrUrl === "string"
          ? providerResult.rawPayload.qrUrl
          : created.data.qr_url,
      providerPayload: providerResult.rawPayload ?? {
        instruction: providerResult.instruction ?? null,
        redirectUrl: providerResult.redirectUrl ?? null
      }
    });

    if (!updated.data) {
      return { ok: false, error: updated.error ?? "Không cập nhật được checkout session." };
    }

    return {
      ok: true,
      checkoutSessionId: updated.data.id,
      redirectUrl: providerResult.redirectUrl ?? null,
      instruction: providerResult.instruction ?? null
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[payments] createTopupIntent failed:", error);
    return { ok: false, error: message || "Không tạo được giao dịch nạp." };
  }
}
