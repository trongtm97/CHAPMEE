import { createClient } from "@/lib/supabase/server";
import type { ChargebackRecord, ChargebackStatus } from "@/types/chargeback";

type ChargebackRow = {
  id: string;
  original_transaction_id: string;
  user_id: string | null;
  amount_vnd: number;
  provider: string;
  provider_reference: string | null;
  status: ChargebackStatus;
  received_at: string;
  resolved_at: string | null;
  metadata: Record<string, unknown> | null;
};

function mapChargeback(row: ChargebackRow): ChargebackRecord {
  return {
    id: row.id,
    originalTransactionId: row.original_transaction_id,
    userId: row.user_id,
    amountVnd: row.amount_vnd,
    provider: row.provider,
    providerReference: row.provider_reference,
    status: row.status,
    receivedAt: row.received_at,
    resolvedAt: row.resolved_at,
    metadata: row.metadata
  };
}

export async function listChargebacksForAdmin(limit = 200) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chargebacks")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [] as ChargebackRecord[], error: error.message };
  return { data: ((data ?? []) as ChargebackRow[]).map(mapChargeback), error: null };
}

export async function createChargebackRecord(input: {
  originalTransactionId: string;
  userId?: string | null;
  amountVnd: number;
  provider: string;
  providerReference?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chargebacks")
    .insert({
      original_transaction_id: input.originalTransactionId,
      user_id: input.userId ?? null,
      amount_vnd: input.amountVnd,
      provider: input.provider,
      provider_reference: input.providerReference ?? null,
      metadata: input.metadata ?? {}
    })
    .select("*")
    .single();
  if (error || !data) return { data: null, error: error?.message ?? "Could not create chargeback." };
  return { data: mapChargeback(data as ChargebackRow), error: null };
}

export async function updateChargebackStatus(input: {
  chargebackId: string;
  status: ChargebackStatus;
  metadataPatch?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("chargebacks")
    .select("metadata")
    .eq("id", input.chargebackId)
    .maybeSingle();
  const metadata = {
    ...((current?.metadata as Record<string, unknown> | null) ?? {}),
    ...(input.metadataPatch ?? {})
  };
  const { data, error } = await supabase
    .from("chargebacks")
    .update({
      status: input.status,
      resolved_at: ["won", "lost", "accepted", "closed"].includes(input.status)
        ? new Date().toISOString()
        : null,
      metadata
    })
    .eq("id", input.chargebackId)
    .select("*")
    .single();
  if (error || !data) return { data: null, error: error?.message ?? "Could not update chargeback." };
  return { data: mapChargeback(data as ChargebackRow), error: null };
}
