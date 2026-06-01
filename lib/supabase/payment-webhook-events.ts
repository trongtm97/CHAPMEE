import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentWebhookEvent, PaymentWebhookEventStatus } from "@/types/payment";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapEvent(row: Record<string, unknown>): PaymentWebhookEvent {
  return {
    id: String(row.id),
    provider: String(row.provider),
    event_id: (row.event_id as string | null) ?? null,
    checkout_session_id: (row.checkout_session_id as string | null) ?? null,
    status: row.status as PaymentWebhookEventStatus,
    raw_payload: (row.raw_payload as Record<string, unknown>) ?? {},
    signature_valid:
      typeof row.signature_valid === "boolean" ? row.signature_valid : null,
    amount_vnd: row.amount_vnd == null ? null : toNumber(row.amount_vnd),
    transfer_content: (row.transfer_content as string | null) ?? null,
    provider_reference: (row.provider_reference as string | null) ?? null,
    error_message: (row.error_message as string | null) ?? null,
    created_at: String(row.created_at),
    processed_at: (row.processed_at as string | null) ?? null
  };
}

export async function createPaymentWebhookEvent(input: {
  provider: string;
  eventId?: string | null;
  checkoutSessionId?: string | null;
  status: PaymentWebhookEventStatus;
  rawPayload: Record<string, unknown>;
  signatureValid?: boolean | null;
  amountVnd?: number | null;
  transferContent?: string | null;
  providerReference?: string | null;
  errorMessage?: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_webhook_events")
    .insert({
      provider: input.provider,
      event_id: input.eventId ?? null,
      checkout_session_id: input.checkoutSessionId ?? null,
      status: input.status,
      raw_payload: input.rawPayload,
      signature_valid: input.signatureValid ?? null,
      amount_vnd: input.amountVnd ?? null,
      transfer_content: input.transferContent ?? null,
      provider_reference: input.providerReference ?? null,
      error_message: input.errorMessage ?? null,
      processed_at: ["processed", "manual_review", "ignored", "ignored_duplicate", "failed"].includes(
        input.status
      )
        ? new Date().toISOString()
        : null
    })
    .select("*")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not create payment webhook event." };
  }
  return { data: mapEvent(data as Record<string, unknown>), error: null };
}

export async function listPaymentWebhookEventsForAdmin(limit = 100) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_webhook_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [] as PaymentWebhookEvent[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapEvent),
    error: null
  };
}

export async function updatePaymentWebhookEvent(input: {
  id: string;
  status?: PaymentWebhookEventStatus;
  checkoutSessionId?: string | null;
  errorMessage?: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_webhook_events")
    .update({
      status: input.status ?? undefined,
      checkout_session_id: input.checkoutSessionId ?? undefined,
      error_message: input.errorMessage ?? undefined,
      processed_at: input.status ? new Date().toISOString() : undefined
    })
    .eq("id", input.id)
    .select("*")
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not update payment webhook event." };
  }
  return { data: mapEvent(data as Record<string, unknown>), error: null };
}
