"use server";

import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { checkStaffAnyPermission } from "@/lib/auth/staff-guards";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getMonetizationConfig } from "@/lib/monetization/config";
import {
  createCheckoutSessionRecord,
  getCheckoutSessionById,
  updateCheckoutSessionStatus
} from "@/lib/supabase/checkout-sessions";
import { getCoinPackById } from "@/lib/supabase/coin-packs";
import { getPaymentProviderSettings } from "@/lib/supabase/payment-provider-settings";
import { getPaymentProviderAdapter } from "@/lib/payments/providers";
import { buildTransactionCode } from "@/lib/transactions/ledger";
import { calculateChannelAmounts } from "@/lib/payments/payment-fees";
import { completeCheckoutPayment } from "@/lib/payments/complete-payment";
import { getSePayConfig } from "@/lib/payments/sepay-config";
import type { PaymentChannel, PaymentProviderKey } from "@/types/payment";

const CHANNEL_BY_PROVIDER: Record<PaymentProviderKey, PaymentChannel> = {
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

function resolvePlatform(channel: PaymentChannel) {
  if (channel === "google_play_billing") return "android" as const;
  if (channel === "apple_iap") return "ios" as const;
  if (channel === "manual_admin") return "admin" as const;
  return "web" as const;
}

function generateCheckoutCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function isPurchaseEnabled(settings: Record<string, unknown>) {
  return (
    Boolean(settings["monetization.enabled"]) &&
    Boolean(settings["coin.enabled"]) &&
    Boolean(settings["coin.purchase_enabled"]) &&
    Boolean(settings["payments.enabled"])
  );
}

export async function createCheckoutSession(
  userId: string,
  coinPackId: string,
  provider: PaymentProviderKey
) {
  const [{ profile }, config, packResult, providerSettingsResult] = await Promise.all([
    getCurrentUser(),
    getMonetizationConfig({ includePrivate: true }),
    getCoinPackById(coinPackId),
    getPaymentProviderSettings()
  ]);

  if (!profile || profile.id !== userId) {
    return { data: null, error: "Bạn không có quyền tạo checkout cho user khác." };
  }

  const authContext = await getCurrentAuthContext();
  if (authContext?.flags.isBanned) {
    return {
      data: null,
      error: "Tài khoản của bạn đang bị hạn chế. Không thể nạp coin."
    };
  }
  if (!authContext?.permissions.includes("wallet.topup")) {
    return { data: null, error: "Bạn không có quyền nạp coin." };
  }

  if (!isPurchaseEnabled(config.settings as Record<string, unknown>)) {
    return { data: null, error: "Coin purchase đang tắt bởi admin config." };
  }

  if (provider === "sepay") {
    if (!Boolean(config.settings["payments.provider_sepay_enabled"])) {
      return { data: null, error: "SePay đang tắt bởi admin config." };
    }
    const sepay = getSePayConfig();
    if (!sepay.ready) {
      return {
        data: null,
        error: `SePay provider chưa cấu hình env: ${sepay.missing.join(", ")}`
      };
    }
  }

  if (!packResult.data || !packResult.data.is_active) {
    return { data: null, error: "Coin pack không tồn tại hoặc đang tắt." };
  }

  const providerSetting = providerSettingsResult.data.find(
    (item) => item.provider_key === provider
  );
  if (!providerSetting || !providerSetting.enabled) {
    return { data: null, error: "Payment provider này đang tắt." };
  }

  const checkoutCode = generateCheckoutCode();
  const created = await createCheckoutSessionRecord({
    checkoutCode,
    userId,
    coinPackId: packResult.data.id,
    paymentChannel: CHANNEL_BY_PROVIDER[provider] ?? "web_sepay",
    provider,
    grossAmountVnd: packResult.data.price_vnd,
    ...calculateChannelAmounts(
      packResult.data.price_vnd,
      CHANNEL_BY_PROVIDER[provider] ?? "web_sepay",
      config.settings
    ),
    currency: packResult.data.currency,
    baseCoinAmount: packResult.data.base_coin_amount,
    bonusCoinAmount: packResult.data.bonus_coin_amount,
    platform: resolvePlatform(CHANNEL_BY_PROVIDER[provider] ?? "web_sepay"),
    transferContent: `CCP ${checkoutCode}`,
    providerPayload: {},
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  });
  if (!created.data) return { data: null, error: created.error };

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
    return { data: null, error: providerResult.error ?? "Cannot create provider checkout." };
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

  return {
    data: updated.data,
    error: updated.error,
    next: {
      redirectUrl: providerResult.redirectUrl ?? null,
      instruction: providerResult.instruction ?? null
    }
  };
}

export async function markCheckoutPaid(
  sessionId: string,
  providerReference: string | null
) {
  const session = await getCheckoutSessionById(sessionId);
  if (!session.data) return { data: null, error: session.error };

  if (session.data.status === "paid") {
    return { data: session.data, error: null, alreadyProcessed: true };
  }

  if (!["created", "pending"].includes(session.data.status)) {
    return {
      data: null,
      error: `Checkout không ở trạng thái có thể pay (${session.data.status}).`
    };
  }

  const updated = await updateCheckoutSessionStatus({
    sessionId,
    status: "paid",
    paymentReference: providerReference ?? session.data.payment_reference,
    providerReference: providerReference ?? session.data.provider_reference,
    paidAt: new Date().toISOString()
  });

  return { data: updated.data, error: updated.error, alreadyProcessed: false };
}

export async function markCheckoutFailed(sessionId: string, reason: string) {
  return updateCheckoutSessionStatus({
    sessionId,
    status: "failed",
    providerPayload: { reason }
  });
}

export async function creditCoinsAfterPayment(sessionId: string) {
  const completed = await completeCheckoutPayment({
    sessionId,
    providerReference: null
  });
  return { ok: completed.ok, error: completed.error, alreadyProcessed: completed.alreadyProcessed };
}

export async function handlePaymentCallback(
  provider: PaymentProviderKey,
  payload: Record<string, unknown>
) {
  const config = await getMonetizationConfig({ includePrivate: true });
  const adapter = getPaymentProviderAdapter(provider);
  const callback = await adapter.handleCallback(payload, {
    testMode:
      Boolean(config.settings["payments.test_mode"]) ||
      Boolean(config.settings["monetization.test_mode"])
  });

  if (!callback.ok || !callback.sessionId) {
    return { ok: false, error: callback.reason ?? "Callback failed." };
  }

  const paid = await markCheckoutPaid(
    callback.sessionId,
    callback.providerReference ?? null
  );
  if (paid.error) return { ok: false, error: paid.error };

  const credit = await creditCoinsAfterPayment(callback.sessionId);
  if (!credit.ok) return { ok: false, error: credit.error };

  return { ok: true, sessionId: callback.sessionId };
}

export async function simulateMockCheckoutPaidAction(
  checkoutSessionId: string
) {
  const auth = await checkStaffAnyPermission(["finance.wallet.adjust"]);
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const config = await getMonetizationConfig({ includePrivate: true });

  if (
    !Boolean(config.settings["payments.test_mode"]) &&
    !Boolean(config.settings["monetization.test_mode"])
  ) {
    return { ok: false, error: "Simulate paid chỉ cho phép ở test mode." };
  }

  return handlePaymentCallback("mock_test", {
    sessionId: checkoutSessionId,
    providerReference: buildTransactionCode("MOCKPAY")
  });
}
