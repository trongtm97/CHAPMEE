"use server";

import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type { RestrictionType } from "@/types/moderation";

export async function hasActiveRestriction(
  userId: string,
  restrictionType: RestrictionType
): Promise<boolean> {
  const db = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("account_restrictions")
    .select("id")
    .eq("user_id", userId)
    .eq("restriction_type", restrictionType)
    .eq("is_active", true)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .limit(1);

  if (error) {
    if (isMissingSchemaError(error)) {
      return false;
    }
    return false;
  }

  return (data ?? []).length > 0;
}

export async function assertNotRestricted(
  userId: string,
  restrictionType: RestrictionType,
  message: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await hasActiveRestriction(userId, restrictionType);
  if (blocked) {
    return { ok: false, error: message };
  }
  return { ok: true };
}
