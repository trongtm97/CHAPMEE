"use server";

import { requireWalletAdjustAccess } from "@/lib/auth/finance-guards";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { completeCheckoutPayment } from "@/lib/payments/complete-payment";
import { getCheckoutSessionById, updateCheckoutSessionStatus } from "@/lib/data/checkout-sessions";
import { updatePaymentWebhookEvent } from "@/lib/data/payment-webhook-events";

async function assertPaymentsReviewStaff() {
  return requireWalletAdjustAccess();
}

export async function adminMarkCheckoutPaidAction(formData: FormData) {
  const auth = await assertPaymentsReviewStaff();
  if (!auth.ok) return { ok: false, error: auth.error };

  const sessionId = String(formData.get("checkout_session_id") ?? "");
  const adminNote = String(formData.get("admin_note") ?? "").trim();
  if (!sessionId || !adminNote) {
    return { ok: false, error: "Thiếu checkout id hoặc admin note." };
  }

  const result = await completeCheckoutPayment({
    sessionId,
    providerReference: `ADMIN-MANUAL-${Date.now()}`,
    rawPayload: { source: "admin_manual_mark_paid" },
    adminNote
  });

  if (result.ok) {
    await logAdminAction({
      actorId: auth.userId,
      action: "adjust_wallet",
      targetType: "checkout_session",
      targetId: sessionId,
      metadata: { adminNote, source: "admin_manual_mark_paid" }
    });
  }

  return { ok: result.ok, error: result.error, alreadyProcessed: result.alreadyProcessed };
}

export async function adminFailCheckoutAction(formData: FormData) {
  const auth = await assertPaymentsReviewStaff();
  if (!auth.ok) return { ok: false, error: auth.error };

  const sessionId = String(formData.get("checkout_session_id") ?? "");
  const adminNote = String(formData.get("admin_note") ?? "").trim();
  if (!sessionId || !adminNote) {
    return { ok: false, error: "Thiếu checkout id hoặc admin note." };
  }

  const updated = await updateCheckoutSessionStatus({
    sessionId,
    status: "failed",
    adminNote
  });
  return { ok: Boolean(updated.data), error: updated.error };
}

export async function adminRetryCreditAction(formData: FormData) {
  const auth = await assertPaymentsReviewStaff();
  if (!auth.ok) return { ok: false, error: auth.error };
  const sessionId = String(formData.get("checkout_session_id") ?? "");
  if (!sessionId) return { ok: false, error: "Thiếu checkout session id." };
  const session = await getCheckoutSessionById(sessionId);
  if (!session.data) return { ok: false, error: session.error };
  const result = await completeCheckoutPayment({
    sessionId,
    providerReference: session.data.provider_reference
  });
  return { ok: result.ok, error: result.error, alreadyProcessed: result.alreadyProcessed };
}

export async function adminLinkWebhookToCheckoutAction(formData: FormData) {
  const auth = await assertPaymentsReviewStaff();
  if (!auth.ok) return { ok: false, error: auth.error };
  const webhookEventId = String(formData.get("webhook_event_id") ?? "");
  const checkoutSessionId = String(formData.get("checkout_session_id") ?? "");
  if (!webhookEventId || !checkoutSessionId) {
    return { ok: false, error: "Thiếu webhook event id hoặc checkout session id." };
  }
  const updated = await updatePaymentWebhookEvent({
    id: webhookEventId,
    checkoutSessionId,
    status: "manual_review"
  });
  return { ok: Boolean(updated.data), error: updated.error };
}
