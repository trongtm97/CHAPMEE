import { getCheckoutSessionById } from "@/lib/data/checkout-sessions";
import { createAdminClient } from "@/lib/data/admin";
import { extractNumericPaymentCodes } from "@/lib/payments/payment-code";

function parseAmount(payload: Record<string, unknown>) {
  const candidates = [
    payload.amount,
    payload.amount_vnd,
    payload.transferAmount,
    payload.transfer_amount
  ];
  for (const value of candidates) {
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  }
  return null;
}

function parseText(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function parseSePayPayload(payload: Record<string, unknown>) {
  const amountVnd = parseAmount(payload);
  const transferContent = parseText(payload, [
    "transfer_content",
    "transferContent",
    "description",
    "content",
    "code"
  ]);
  const providerReference = parseText(payload, [
    "provider_reference",
    "providerReference",
    "transaction_id",
    "transactionId",
    "id"
  ]);
  const eventId = parseText(payload, ["event_id", "eventId", "id"]);

  let checkoutCode: string | null = null;
  if (transferContent) {
    checkoutCode = extractNumericPaymentCodes(transferContent, 12)[0] ?? null;
  }

  const transferType = parseText(payload, ["transferType", "transfer_type"]);
  const accountNumber = parseText(payload, ["accountNumber", "account_number"]);

  return {
    amountVnd,
    transferContent,
    providerReference,
    checkoutCode,
    eventId,
    transferType,
    accountNumber
  };
}

export async function findCheckoutByCode(checkoutCode: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("checkout_sessions")
    .select("*")
    .eq("checkout_code", checkoutCode)
    .maybeSingle();
  if (error || !data) return { data: null, error: error?.message ?? "Checkout not found by code." };
  const mapped = await getCheckoutSessionById(String(data.id));
  return mapped;
}
