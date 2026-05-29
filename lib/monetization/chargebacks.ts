"use server";

import { checkStaffPermission } from "@/lib/auth/staff-guards";
import { createChargebackRecord, updateChargebackStatus } from "@/lib/supabase/chargebacks";
import { getTransactionById } from "@/lib/supabase/transactions";
import { createChargebackTransaction } from "@/lib/transactions/reversal";
import { createRiskEventRecord, getOrCreateUserRiskProfile, updateUserRiskProfileRecord } from "@/lib/supabase/risk";

async function assertChargebackStaff() {
  return checkStaffPermission("finance.refund.create");
}

export async function createChargebackAction(input: {
  originalTransactionId: string;
  amountVnd: number;
  provider: string;
  providerReference?: string | null;
}) {
  const auth = await assertChargebackStaff();
  if (!auth.ok) return { ok: false, error: auth.error, data: null };

  const original = await getTransactionById(input.originalTransactionId);
  if (!original.data) return { ok: false, error: original.error, data: null };

  const created = await createChargebackRecord({
    originalTransactionId: original.data.id,
    userId: original.data.user_id,
    amountVnd: input.amountVnd,
    provider: input.provider,
    providerReference: input.providerReference ?? null
  });
  if (!created.data) return { ok: false, error: created.error, data: null };

  await createChargebackTransaction({
    originalTransactionId: original.data.id,
    userId: original.data.user_id,
    amountVnd: input.amountVnd,
    metadata: { chargeback_id: created.data.id }
  });

  await createRiskEventRecord({
    userId: original.data.user_id,
    creatorUserId: original.data.creator_user_id,
    transactionId: original.data.id,
    eventType: "payment_chargeback_opened",
    severity: "high",
    riskScore: 90,
    reason: "Chargeback mở từ payment provider.",
    metadata: {
      chargeback_id: created.data.id,
      provider: input.provider,
      provider_reference: input.providerReference ?? null
    }
  });

  if (original.data.user_id) {
    const profile = await getOrCreateUserRiskProfile(original.data.user_id);
    if (profile.data) {
      await updateUserRiskProfileRecord(original.data.user_id, {
        monetization_blocked: true,
        metadata: { ...(profile.data.metadata ?? {}), chargeback_open: true }
      });
    }
  }

  if (original.data.creator_user_id) {
    const creator = await getOrCreateUserRiskProfile(original.data.creator_user_id);
    if (creator.data) {
      await updateUserRiskProfileRecord(original.data.creator_user_id, {
        payout_blocked: true,
        metadata: { ...(creator.data.metadata ?? {}), chargeback_related_payout_lock: true }
      });
    }
  }

  return { ok: true, error: null, data: created.data };
}

export async function updateChargebackAction(input: {
  chargebackId: string;
  status: "opened" | "under_review" | "won" | "lost" | "accepted" | "closed";
  adminNote?: string;
}) {
  const auth = await assertChargebackStaff();
  if (!auth.ok) return { ok: false, error: auth.error };
  const updated = await updateChargebackStatus({
    chargebackId: input.chargebackId,
    status: input.status,
    metadataPatch: { admin_note: input.adminNote ?? null, updated_by: auth.userId }
  });
  if (!updated.data) return { ok: false, error: updated.error };
  return { ok: true, error: null };
}

export async function handleChargebackCallback(provider: string, payload: Record<string, unknown>) {
  return {
    ok: true,
    message: "Chargeback callback placeholder received.",
    provider,
    payload
  };
}

function resolveFormData(
  first: FormData | { ok: boolean; error: string | null },
  second?: FormData
) {
  return first instanceof FormData ? first : (second as FormData);
}

export async function createChargebackFormAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  return createChargebackAction({
    originalTransactionId: String(formData.get("originalTransactionId") ?? ""),
    amountVnd: Number(formData.get("amountVnd") ?? 0),
    provider: String(formData.get("provider") ?? "manual_admin"),
    providerReference: String(formData.get("providerReference") ?? "") || null
  });
}

export async function updateChargebackStatusFormAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  return updateChargebackAction({
    chargebackId: String(formData.get("chargebackId") ?? ""),
    status: String(formData.get("status") ?? "opened") as
      | "opened"
      | "under_review"
      | "won"
      | "lost"
      | "accepted"
      | "closed",
    adminNote: String(formData.get("adminNote") ?? "") || undefined
  });
}
