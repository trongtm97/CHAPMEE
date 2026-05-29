"use server";

import { getCheckoutSessionById, updateCheckoutSessionStatus } from "@/lib/supabase/checkout-sessions";
import { processCoinPurchaseCheckoutRecord } from "@/lib/supabase/wallets";

export async function completeCheckoutPayment(input: {
  sessionId: string;
  providerReference: string | null;
  rawPayload?: Record<string, unknown>;
  adminNote?: string | null;
}) {
  const session = await getCheckoutSessionById(input.sessionId);
  if (!session.data) {
    return { ok: false, error: session.error ?? "Checkout session not found.", alreadyProcessed: false };
  }

  if (session.data.status === "paid") {
    return { ok: true, error: null, alreadyProcessed: true, data: session.data };
  }

  if (session.data.status === "expired") {
    await updateCheckoutSessionStatus({
      sessionId: session.data.id,
      status: "manual_review",
      providerPayload: {
        ...(session.data.provider_payload ?? {}),
        completePaymentRaw: input.rawPayload ?? {}
      },
      providerReference: input.providerReference ?? session.data.provider_reference,
      adminNote: input.adminNote ?? session.data.admin_note ?? null
    });
    return { ok: false, error: "Checkout đã expired, chuyển manual review.", alreadyProcessed: false };
  }

  if (!["created", "pending", "manual_review"].includes(session.data.status)) {
    return {
      ok: false,
      error: `Checkout không ở trạng thái hoàn tất được (${session.data.status}).`,
      alreadyProcessed: false
    };
  }

  const marked = await updateCheckoutSessionStatus({
    sessionId: session.data.id,
    status: "paid",
    paymentReference: input.providerReference ?? session.data.payment_reference,
    providerReference: input.providerReference ?? session.data.provider_reference,
    providerPayload: {
      ...(session.data.provider_payload ?? {}),
      completePaymentRaw: input.rawPayload ?? {}
    },
    adminNote: input.adminNote ?? session.data.admin_note ?? null,
    paidAt: new Date().toISOString()
  });
  if (!marked.data) {
    return { ok: false, error: marked.error ?? "Could not mark checkout paid.", alreadyProcessed: false };
  }

  const processed = await processCoinPurchaseCheckoutRecord(marked.data.id);
  if (processed.error || !processed.data) {
    await updateCheckoutSessionStatus({
      sessionId: marked.data.id,
      status: "manual_review",
      providerPayload: {
        ...(marked.data.provider_payload ?? {}),
        creditError: processed.error ?? "Could not process coin purchase checkout."
      }
    });
    return {
      ok: false,
      error: processed.error ?? "Could not process coin purchase checkout.",
      alreadyProcessed: false
    };
  }

  return { ok: true, error: null, alreadyProcessed: processed.data.alreadyProcessed, data: marked.data };
}
