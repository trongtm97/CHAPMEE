import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { completeCheckoutPayment } from "@/lib/payments/complete-payment";
import { findCheckoutByCode, parseSePayPayload } from "@/lib/payments/payment-matching";
import { getSePayRuntimeConfig } from "@/lib/payments/sepay-config";
import { updateCheckoutSessionStatus } from "@/lib/data/checkout-sessions";
import { createPaymentWebhookEvent } from "@/lib/data/payment-webhook-events";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function verifyWebhook(headers: Headers, rawBody: string, config: Awaited<ReturnType<typeof getSePayRuntimeConfig>>) {
  const method = config.config.authMethod ?? "hmac_sha256";
  if (method === "none") {
    return config.config.environment !== "live" ? "skipped" : "invalid";
  }

  if (method === "api_key") {
    const received =
      headers.get("x-api-key") ??
      headers.get("x-sepay-api-key") ??
      headers.get("authorization")?.replace(/^Apikey\s+/i, "") ??
      headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    return received && config.config.apiKey && safeEqual(received.trim(), config.config.apiKey)
      ? "valid"
      : "invalid";
  }

  const received =
    headers.get("x-sepay-signature") ??
    headers.get("x-signature") ??
    headers.get("x-hub-signature-256");
  const signature = received?.replace(/^sha256=/i, "").trim() ?? "";
  const timestamp = headers.get("x-sepay-timestamp")?.trim() ?? "";
  const expectedTimestamped =
    timestamp && /^\d+$/.test(timestamp)
      ? createHmac("sha256", config.config.webhookSecret)
          .update(`${timestamp}.${rawBody}`, "utf8")
          .digest("hex")
      : "";
  const expectedRaw = createHmac("sha256", config.config.webhookSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  if (!signature) {
    return "invalid";
  }

  if (expectedTimestamped && safeEqual(signature, expectedTimestamped)) {
    return "valid";
  }

  if (safeEqual(signature, expectedRaw)) {
    return "valid";
  }

  return "invalid";
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    payload = { raw: rawBody };
  }

  const sepay = await getSePayRuntimeConfig();
  const parsed = parseSePayPayload(payload);
  const authStatus = verifyWebhook(request.headers, rawBody, sepay);

  if (authStatus === "invalid") {
    await createPaymentWebhookEvent({
      provider: "sepay",
      eventId: parsed.eventId,
      status: "failed",
      rawPayload: payload,
      signatureValid: false,
      amountVnd: parsed.amountVnd,
      transferContent: parsed.transferContent,
      providerReference: parsed.providerReference,
      errorMessage: "Invalid SePay webhook authentication."
    });
    return NextResponse.json({ success: false, error: "invalid_auth" }, { status: 401 });
  }

  if (parsed.transferType && parsed.transferType !== sepay.config.allowedTransferType) {
    await createPaymentWebhookEvent({
      provider: "sepay",
      eventId: parsed.eventId,
      status: "ignored",
      rawPayload: payload,
      signatureValid: authStatus === "valid",
      amountVnd: parsed.amountVnd,
      transferContent: parsed.transferContent,
      providerReference: parsed.providerReference,
      errorMessage: "Transfer type is not allowed."
    });
    return NextResponse.json({ success: true });
  }

  if (
    parsed.accountNumber &&
    sepay.config.allowedAccountNumbers?.length &&
    !sepay.config.allowedAccountNumbers.includes(parsed.accountNumber)
  ) {
    await createPaymentWebhookEvent({
      provider: "sepay",
      eventId: parsed.eventId,
      status: "manual_review",
      rawPayload: payload,
      signatureValid: authStatus === "valid",
      amountVnd: parsed.amountVnd,
      transferContent: parsed.transferContent,
      providerReference: parsed.providerReference,
      errorMessage: "Receiving account number is not allowed."
    });
    return NextResponse.json({ success: true });
  }

  if (!parsed.checkoutCode) {
    await createPaymentWebhookEvent({
      provider: "sepay",
      eventId: parsed.eventId,
      status: "manual_review",
      rawPayload: payload,
      signatureValid: authStatus === "valid",
      amountVnd: parsed.amountVnd,
      transferContent: parsed.transferContent,
      providerReference: parsed.providerReference,
      errorMessage: "Cannot extract numeric payment code from transfer content."
    });
    return NextResponse.json({ success: true });
  }

  const checkout = await findCheckoutByCode(parsed.checkoutCode);
  if (!checkout.data) {
    await createPaymentWebhookEvent({
      provider: "sepay",
      eventId: parsed.eventId,
      status: "manual_review",
      rawPayload: payload,
      signatureValid: authStatus === "valid",
      amountVnd: parsed.amountVnd,
      transferContent: parsed.transferContent,
      providerReference: parsed.providerReference,
      errorMessage: "Payment code not found."
    });
    return NextResponse.json({ success: true });
  }

  if (checkout.data.status === "paid") {
    await createPaymentWebhookEvent({
      provider: "sepay",
      eventId: parsed.eventId,
      checkoutSessionId: checkout.data.id,
      status: "ignored_duplicate",
      rawPayload: payload,
      signatureValid: authStatus === "valid",
      amountVnd: parsed.amountVnd,
      transferContent: parsed.transferContent,
      providerReference: parsed.providerReference
    });
    return NextResponse.json({ success: true, duplicate: true });
  }

  const expired =
    checkout.data.status === "expired" ||
    (checkout.data.expires_at && new Date(checkout.data.expires_at).getTime() < Date.now());
  const amountMismatch =
    sepay.config.requireExactAmount !== false &&
    (parsed.amountVnd == null || parsed.amountVnd !== Math.round(checkout.data.gross_amount_vnd));

  if (expired || amountMismatch || !["created", "pending", "manual_review"].includes(checkout.data.status)) {
    await updateCheckoutSessionStatus({
      sessionId: checkout.data.id,
      status: "manual_review",
      providerReference: parsed.providerReference ?? checkout.data.provider_reference,
      providerPayload: {
        ...(checkout.data.provider_payload ?? {}),
        sepayManualReviewReason: expired ? "expired" : amountMismatch ? "amount_mismatch" : "invalid_status",
        sepayPayload: payload
      }
    });
    await createPaymentWebhookEvent({
      provider: "sepay",
      eventId: parsed.eventId,
      checkoutSessionId: checkout.data.id,
      status: "manual_review",
      rawPayload: payload,
      signatureValid: authStatus === "valid",
      amountVnd: parsed.amountVnd,
      transferContent: parsed.transferContent,
      providerReference: parsed.providerReference,
      errorMessage: expired ? "Checkout expired before payment arrival." : amountMismatch ? "Amount mismatch." : "Checkout status cannot be auto-paid."
    });
    return NextResponse.json({ success: true, manual_review: true });
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
    signatureValid: authStatus === "valid",
    amountVnd: parsed.amountVnd,
    transferContent: parsed.transferContent,
    providerReference: parsed.providerReference,
    errorMessage: completed.error
  });

  if (!completed.ok) {
    return NextResponse.json({ success: false, error: completed.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
