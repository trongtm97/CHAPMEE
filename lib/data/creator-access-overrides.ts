import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type { CreatorAccessOverrideRow } from "@/types/creator-access";

function mapRow(row: Record<string, unknown>): CreatorAccessOverrideRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    monetization_disabled: Boolean(row.monetization_disabled),
    monetization_disabled_reason: (row.monetization_disabled_reason as string) ?? null,
    monetization_disabled_by: (row.monetization_disabled_by as string) ?? null,
    monetization_disabled_at: (row.monetization_disabled_at as string) ?? null,
    withdrawal_disabled: Boolean(row.withdrawal_disabled),
    withdrawal_disabled_reason: (row.withdrawal_disabled_reason as string) ?? null,
    withdrawal_disabled_by: (row.withdrawal_disabled_by as string) ?? null,
    withdrawal_disabled_at: (row.withdrawal_disabled_at as string) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export async function getCreatorAccessOverrideByUserId(userId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("creator_access_overrides")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) {
      return { data: null, error: null };
    }
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return { data: mapRow(data as Record<string, unknown>), error: null };
}

export async function upsertCreatorAccessOverride(input: {
  userId: string;
  monetizationDisabled?: boolean;
  monetizationDisabledReason?: string | null;
  monetizationDisabledBy?: string | null;
  monetizationDisabledAt?: string | null;
  withdrawalDisabled?: boolean;
  withdrawalDisabledReason?: string | null;
  withdrawalDisabledBy?: string | null;
  withdrawalDisabledAt?: string | null;
}) {
  const db = await createClient();
  const existing = await getCreatorAccessOverrideByUserId(input.userId);

  const payload: Record<string, unknown> = {
    user_id: input.userId,
    updated_at: new Date().toISOString()
  };

  if (input.monetizationDisabled !== undefined) {
    payload.monetization_disabled = input.monetizationDisabled;
    payload.monetization_disabled_reason = input.monetizationDisabled
      ? input.monetizationDisabledReason ?? null
      : null;
    payload.monetization_disabled_by = input.monetizationDisabled
      ? input.monetizationDisabledBy ?? null
      : null;
    payload.monetization_disabled_at = input.monetizationDisabled
      ? input.monetizationDisabledAt ?? new Date().toISOString()
      : null;
  }

  if (input.withdrawalDisabled !== undefined) {
    payload.withdrawal_disabled = input.withdrawalDisabled;
    payload.withdrawal_disabled_reason = input.withdrawalDisabled
      ? input.withdrawalDisabledReason ?? null
      : null;
    payload.withdrawal_disabled_by = input.withdrawalDisabled
      ? input.withdrawalDisabledBy ?? null
      : null;
    payload.withdrawal_disabled_at = input.withdrawalDisabled
      ? input.withdrawalDisabledAt ?? new Date().toISOString()
      : null;
  }

  if (existing.data) {
    const { data, error } = await db
      .from("creator_access_overrides")
      .update(payload)
      .eq("user_id", input.userId)
      .select("*")
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: mapRow(data as Record<string, unknown>), error: null };
  }

  const insertPayload = {
    monetization_disabled: false,
    withdrawal_disabled: false,
    ...payload
  };

  const { data, error } = await db
    .from("creator_access_overrides")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapRow(data as Record<string, unknown>), error: null };
}
