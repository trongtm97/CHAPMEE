import { createClient } from "@/lib/data/server";
import type {
  CreatorMonetizationProfile,
  CreatorMonetizationStatus
} from "@/types/creator-monetization";

function mapProfile(row: Record<string, unknown>): CreatorMonetizationProfile {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    status: row.status as CreatorMonetizationStatus,
    monetization_enabled: Boolean(row.monetization_enabled),
    terms_accepted_at: (row.terms_accepted_at as string | null) ?? null,
    approved_by: (row.approved_by as string | null) ?? null,
    approved_at: (row.approved_at as string | null) ?? null,
    rejected_reason: (row.rejected_reason as string | null) ?? null,
    suspended_reason: (row.suspended_reason as string | null) ?? null,
    kyc_status: row.kyc_status as CreatorMonetizationProfile["kyc_status"],
    payout_enabled: Boolean(row.payout_enabled),
    tips_accepted: Boolean(row.tips_accepted ?? false),
    tip_thank_you_message: (row.tip_thank_you_message as string | null) ?? null,
    custom_revenue_share:
      (row.custom_revenue_share as Record<string, number> | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export async function getCreatorMonetizationProfile(userId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("creator_monetization_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) return { data: null, error: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { data: null, error: null };
  return { data: mapProfile(row as Record<string, unknown>), error: null };
}

export async function getOrCreateCreatorMonetizationProfile(userId: string) {
  const existing = await getCreatorMonetizationProfile(userId);
  if (existing.data || existing.error) return existing;

  const db = await createClient();
  const { data, error } = await db
    .from("creator_monetization_profiles")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Could not create creator monetization profile."
    };
  }
  return { data: mapProfile(data as Record<string, unknown>), error: null };
}

export async function updateCreatorMonetizationProfile(
  profileId: string,
  patch: Record<string, unknown>
) {
  const db = await createClient();
  const { data, error } = await db
    .from("creator_monetization_profiles")
    .update(patch)
    .eq("id", profileId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Could not update creator monetization profile."
    };
  }
  return { data: mapProfile(data as Record<string, unknown>), error: null };
}

export async function listCreatorMonetizationProfilesForAdmin(status?: string) {
  const db = await createClient();
  let query = db
    .from("creator_monetization_profiles")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return { data: [] as CreatorMonetizationProfile[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapProfile),
    error: null
  };
}
