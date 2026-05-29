import { NextResponse } from "next/server";
import { completeCheckoutPayment } from "@/lib/payments/complete-payment";
import { parseSePayPayload, findCheckoutByCode } from "@/lib/payments/payment-matching";
import { getSePayConfig } from "@/lib/payments/sepay-config";
import { createPaymentWebhookEvent } from "@/lib/supabase/payment-webhook-events";
import { updateCheckoutSessionStatus } from "@/lib/supabase/checkout-sessions";

function verifySignature(headers: Headers, rawBody: string) {
  const { config, ready } = getSePayConfig();
  if (!ready) return false;
  const signature =
    headers.get("x-sepay-signature") ??
    headers.get("x-signature") ??
    headers.get("authorization");
  if (!signature) return false;
  const normalized = signature.replace(/^Bearer\s+/i, "").trim();
  return normalized === config.webhookSecret || rawBody.includes(config.webhookSecret);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    payload = { raw: rawBody };
  }

  const signatureValid = verifySignature(request.headers, rawBody);
  const parsed = parseSePayPayload(payload);

  if (!signatureValid) {
    await createPaymentWebhookEvent({
      provider: "sepay",
      eventId: parsed.eventId,
      status: "failed",
      rawPayload: payload,
      signatureValid: false,
      amountVnd: parsed.amountVnd,
      transferContent: parsed.transferContent,
      providerReference: parsed.providerReference,
      errorMessage: "Invalid webhook signature."
    });
    return NextResponse.json({ ok: true, accepted: true });
  }

  if (!parsed.checkoutCode) {
    await createPaymentWebhookEvent({
      provider: "sepay",
      eventId: parsed.eventId,
      status: "manual_review",
      rawPayload: payload,
      signatureValid: true,
      amountVnd: parsed.amountVnd,
      transferContent: parsed.transferContent,
      providerReference: parsed.providerReference,
      errorMessage: "Cannot extract checkout code from transfer content."
    });
    return NextResponse.json({ ok: true, accepted: true });
  }

  const checkout = await findCheckoutByCode(parsed.checkoutCode);
  if (!checkout.data) {
    await createPaymentWebhookEvent({
      provider: "sepay",
      eventId: parsed.eventId,
      status: "manual_review",
      rawPayload: payload,
      signatureValid: true,
      amountVnd: parsed.amountVnd,
      transferContent: parsed.transferContent,
      providerReference: parsed.providerReference,
      errorMessage: "Checkout code not found."
    });
    return NextResponse.json({ ok: true, accepted: true });
  }

  if (checkout.data.status === "paid") {
    await createPaymentWebhookEvent({
      provider: "sepay",
      eventId: parsed.eventId,
      checkoutSessionId: checkout.data.id,
      status: "ignored_duplicate",
      rawPayload: payload,
      signatureValid: true,
      amountVnd: parsed.amountVnd,
      transferContent: parsed.transferContent,
      providerReference: parsed.providerReference
    });
    return NextResponse.json({ ok: true, accepted: true, duplicate: true });
  }

  if (checkout.data.status === "expired") {
    await updateCheckoutSessionStatus({
      sessionId: checkout.data.id,
      status: "manual_review",
      providerReference: parsed.providerReference ?? checkout.data.provider_reference
    });
    await createPaymentWebhookEvent({
      provider: "sepay",
      eventId: parsed.eventId,
      checkoutSessionId: checkout.data.id,
      status: "manual_review",
      rawPayload: payload,
      signatureValid: true,
      amountVnd: parsed.amountVnd,
      transferContent: parsed.transferContent,
      providerReference: parsed.providerReference,
      errorMessage: "Checkout expired before payment arrival."
    });
    return NextResponse.json({ ok: true, accepted: true, manual_review: true });
  }

  if (parsed.amountVnd == null || parsed.amountVnd !== Math.round(checkout.data.gross_amount_vnd)) {
    await updateCheckoutSessionStatus({
      sessionId: checkout.data.id,
      status: "manual_review",
      providerReference: parsed.providerReference ?? checkout.data.provider_reference
    });
    await createPaymentWebhookEvent({
      provider: "sepay",
      eventId: parsed.eventId,
      checkoutSessionId: checkout.data.id,
      status: "manual_review",
      rawPayload: payload,
      signatureValid: true,
      amountVnd: parsed.amountVnd,
      transferContent: parsed.transferContent,
      providerReference: parsed.providerReference,
      errorMessage: "Amount mismatch."
    });
    return NextResponse.json({ ok: true, accepted: true, manual_review: true });
  }

  const completed = await completeCheckoutPayment({
    sessionId: checkout.data.id,
    providerReference: parsed.providerReference,
    rawPayload: payload
  });

  await createPaymentWebhookEvent({
    provider: "sepay",
    eventId: parsed.eventId,
    checkoutSessionId: checkout.data.id,
    status: completed.ok ? "processed" : "failed",
    rawPayload: payload,
    signatureValid: true,
    amountVnd: parsed.amountVnd,
    transferContent: parsed.transferContent,
    providerReference: parsed.providerReference,
    errorMessage: completed.error
  });

  return NextResponse.json({ ok: true, accepted: true, processed: completed.ok });
}
