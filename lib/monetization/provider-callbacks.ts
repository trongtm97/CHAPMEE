import { createManualRefundAction } from "@/lib/monetization/refunds";
import { createChargebackAction } from "@/lib/monetization/chargebacks";

export async function handlePaymentRefundCallback(
  provider: string,
  payload: Record<string, unknown>
) {
  const originalTransactionId = String(payload.original_transaction_id ?? "");
  if (!originalTransactionId) {
    return { ok: false, error: "Missing original_transaction_id." };
  }
  return createManualRefundAction({
    originalTransactionId,
    reason: String(payload.reason ?? "provider_refund"),
    provider,
    providerReference: String(payload.provider_reference ?? "") || null
  });
}

export async function handleChargebackCallback(
  provider: string,
  payload: Record<string, unknown>
) {
  const originalTransactionId = String(payload.original_transaction_id ?? "");
  const amountVnd = Number(payload.amount_vnd ?? 0);
  if (!originalTransactionId || !Number.isFinite(amountVnd) || amountVnd <= 0) {
    return { ok: false, error: "Invalid chargeback payload." };
  }
  return createChargebackAction({
    originalTransactionId,
    amountVnd,
    provider,
    providerReference: String(payload.provider_reference ?? "") || null
  });
}
