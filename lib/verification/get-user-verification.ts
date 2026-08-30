import { createClient } from "@/lib/data/server";
import { fetchAppSettingByKey } from "@/lib/data/app-settings";
import { resolveVerificationLabel } from "@/lib/verification/labels";
import type {
  AccountVerificationRow,
  PublicVerificationBadge,
  UserVerificationSummary,
  VerificationType
} from "@/types/verification";

type ProfileVerificationCache = {
  id: string;
  is_verified: boolean | null;
  verification_type: VerificationType | null;
  verification_label: string | null;
};

function toRow(row: Record<string, unknown>): AccountVerificationRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    verification_type: row.verification_type as VerificationType,
    status: row.status as AccountVerificationRow["status"],
    source: (row.source as AccountVerificationRow["source"]) ?? "user_request",
    display_badge: Boolean(row.display_badge),
    public_label: (row.public_label as string | null) ?? null,
    request_reason: (row.request_reason as string | null) ?? null,
    rejection_reason: (row.rejection_reason as string | null) ?? null,
    public_note: (row.public_note as string | null) ?? null,
    admin_note: (row.admin_note as string | null) ?? null,
    submitted_at: (row.submitted_at as string | null) ?? null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    reviewed_by: (row.reviewed_by as string | null) ?? null,
    revoked_at: (row.revoked_at as string | null) ?? null,
    revoked_by: (row.revoked_by as string | null) ?? null,
    revoke_reason: (row.revoke_reason as string | null) ?? null,
    needs_more_info_deadline: (row.needs_more_info_deadline as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export function badgeFromProfileCache(
  profile: ProfileVerificationCache | null | undefined
): PublicVerificationBadge | null {
  if (!profile?.is_verified || !profile.verification_type) {
    return null;
  }

  return {
    type: profile.verification_type,
    label: resolveVerificationLabel(
      profile.verification_type,
      profile.verification_label
    )
  };
}

export async function areVerificationRequestsEnabled() {
  const setting = await fetchAppSettingByKey("verification_requests_enabled");
  const value = setting?.value as { enabled?: boolean } | undefined;
  return value?.enabled !== false;
}

export async function getPublicVerificationBadge(
  userId: string
): Promise<PublicVerificationBadge | null> {
  const db = await createClient();
  const { data } = await db
    .from("profiles")
    .select("id, is_verified, verification_type, verification_label")
    .eq("id", userId)
    .maybeSingle();

  return badgeFromProfileCache(data as ProfileVerificationCache | null);
}

export async function getPublicVerificationBadges(
  userIds: string[]
): Promise<Map<string, PublicVerificationBadge>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, PublicVerificationBadge>();

  if (uniqueIds.length === 0) {
    return map;
  }

  const db = await createClient();
  const { data } = await db
    .from("profiles")
    .select("id, is_verified, verification_type, verification_label")
    .in("id", uniqueIds)
    .eq("is_verified", true);

  for (const row of data ?? []) {
    const badge = badgeFromProfileCache(row as ProfileVerificationCache);
    if (badge) {
      map.set(String(row.id), badge);
    }
  }

  return map;
}

export async function getUserVerificationSummary(
  userId: string
): Promise<UserVerificationSummary> {
  const db = await createClient();
  const [recordsResult, requestsEnabled, profileResult] = await Promise.all([
    db
      .from("account_verifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    areVerificationRequestsEnabled(),
    db
      .from("profiles")
      .select("id, is_verified, verification_type, verification_label")
      .eq("id", userId)
      .maybeSingle()
  ]);

  const records = (recordsResult.data ?? []).map((row) =>
    toRow(row as Record<string, unknown>)
  );

  const publicBadge = badgeFromProfileCache(
    profileResult.data as ProfileVerificationCache | null
  );

  return {
    records,
    publicBadge,
    requestsEnabled,
    latestApproved: records.find((row) => row.status === "approved") ?? null,
    latestNeedsMoreInfo: records.find((row) => row.status === "needs_more_info") ?? null,
    latestPending: records.find((row) => row.status === "pending") ?? null,
    latestRejected: records.find((row) => row.status === "rejected") ?? null,
    latestRevoked: records.find((row) => row.status === "revoked") ?? null
  };
}
