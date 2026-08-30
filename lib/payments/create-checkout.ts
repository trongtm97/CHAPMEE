"use server";

import { checkStaffAnyPermission } from "@/lib/auth/staff-guards";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { getCheckoutSessionById, updateCheckoutSessionStatus } from "@/lib/data/checkout-sessions";
import { getPaymentProviderAdapter } from "@/lib/payments/providers";
import { buildTransactionCode } from "@/lib/transactions/ledger";
import { completeCheckoutPayment } from "@/lib/payments/complete-payment";
import { createTopupIntent } from "@/lib/payments/create-topup-intent";
import type { PaymentProviderKey } from "@/types/payment";

export async function createCheckoutSession(
  userId: string,
  coinPackId: string,
  provider: PaymentProviderKey
) {
  const result = await createTopupIntent({ userId, packageId: coinPackId, provider });
  if (!result.ok) {
    return { data: null, error: result.error };
  }

  const session = await getCheckoutSessionById(result.checkoutSessionId!);
  return {
    data: session.data,
    error: session.error,
    next: {
      redirectUrl: result.redirectUrl ?? null,
      instruction: result.instruction ?? null
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
