import { createAdminClient } from "@/lib/data/admin";
import { logCreatorAdPolicyAudit } from "@/lib/creator-ad-revenue/audit";
import { syncCreatorAdProfileCompliance } from "@/lib/creator-ad-revenue/sync-compliance";
import type {
  AdminCreatorAdProfileAction,
  CreatorAdMonetizationProfile,
  CreatorAdMonetizationProfileListItem,
  CreatorAdMonetizationStatus
} from "@/types/creator-ad-revenue-policy";

function mapProfile(row: Record<string, unknown>): CreatorAdMonetizationProfile {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    status: row.status as CreatorAdMonetizationProfile["status"],
    kyc_status: row.kyc_status as CreatorAdMonetizationProfile["kyc_status"],
    tax_status: row.tax_status as CreatorAdMonetizationProfile["tax_status"],
    payout_status: row.payout_status as CreatorAdMonetizationProfile["payout_status"],
    ads_revenue_enabled: Boolean(row.ads_revenue_enabled),
    fraud_hold: Boolean(row.fraud_hold),
    internal_note: (row.internal_note as string | null) ?? null,
    suspension_reason: (row.suspension_reason as string | null) ?? null,
    reviewed_by: (row.reviewed_by as string | null) ?? null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export async function getCreatorAdMonetizationProfile(
  userId: string,
  options?: { syncCompliance?: boolean }
): Promise<CreatorAdMonetizationProfile | null> {
  if (options?.syncCompliance) {
    await syncCreatorAdProfileCompliance(userId);
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("creator_ad_monetization_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return mapProfile(data as Record<string, unknown>);
}

export async function ensureCreatorAdMonetizationProfile(
  userId: string
): Promise<CreatorAdMonetizationProfile> {
  const existing = await getCreatorAdMonetizationProfile(userId);
  if (existing) return existing;

  const db = createAdminClient();
  const { data, error } = await db
    .from("creator_ad_monetization_profiles")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Không tạo được hồ sơ ad monetization.");
  }

  const profile = mapProfile(data as Record<string, unknown>);
  await logCreatorAdPolicyAudit({
    actorId: null,
    action: "profile_created",
    targetUserId: userId,
    after: profile as unknown as Record<string, unknown>
  });
  return profile;
}

export async function listCreatorAdMonetizationProfiles(filters: {
  status?: string;
  kyc_status?: string;
  tax_status?: string;
  payout_status?: string;
  search?: string;
  ads_revenue_enabled?: boolean;
  fraud_hold?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{
  profiles: CreatorAdMonetizationProfileListItem[];
  total: number;
  error: string | null;
}> {
  try {
    const db = createAdminClient();
    const monthKey = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    let userIdFilter: string[] | null = null;
    const search = filters.search?.trim();
    if (search) {
      const { data: matched } = await db
        .from("profiles")
        .select("id")
        .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
        .limit(200);
      userIdFilter = (matched ?? []).map((r) => String(r.id));
      if (userIdFilter.length === 0) {
        return { profiles: [], total: 0, error: null };
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyFilters = (q: any) => {
      let query = q;
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.kyc_status) query = query.eq("kyc_status", filters.kyc_status);
      if (filters.tax_status) query = query.eq("tax_status", filters.tax_status);
      if (filters.payout_status) query = query.eq("payout_status", filters.payout_status);
      if (filters.ads_revenue_enabled === true) query = query.eq("ads_revenue_enabled", true);
      if (filters.ads_revenue_enabled === false) query = query.eq("ads_revenue_enabled", false);
      if (filters.fraud_hold === true) query = query.eq("fraud_hold", true);
      if (userIdFilter) query = query.in("user_id", userIdFilter);
      return query;
    };

    const countQuery = applyFilters(
      db
        .from("creator_ad_monetization_profiles")
        .select("user_id", { count: "exact", head: true })
    );
    const { count } = await countQuery;

    let query = applyFilters(
      db
        .from("creator_ad_monetization_profiles")
        .select(
          `
        *,
        user:profiles!creator_ad_monetization_profiles_user_id_fkey(username, display_name)
      `
        )
    )
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) {
      return { profiles: [], total: 0, error: error.message };
    }

    let profiles: CreatorAdMonetizationProfileListItem[] = (data ?? []).map(
      (row: Record<string, unknown>) => {
      const base = mapProfile(row as Record<string, unknown>);
      const user = (row as { user?: { username?: string; display_name?: string } }).user;
      return {
        ...base,
        username: user?.username ?? null,
        display_name: user?.display_name ?? null
      };
      }
    );

    const userIds = profiles.map((p: CreatorAdMonetizationProfileListItem) => p.user_id);
    if (userIds.length > 0) {
      const [statsRes, fraudRes] = await Promise.all([
        db
          .from("ad_monthly_author_stats")
          .select("author_id, estimated_gross_revenue_vnd")
          .eq("month", monthKey)
          .in("author_id", userIds),
        db
          .from("ad_fraud_signals")
          .select("author_id")
          .in("author_id", userIds)
          .in("status", ["open", "reviewing"])
      ]);

      const revenueMap = new Map<string, number>();
      for (const row of statsRes.data ?? []) {
        revenueMap.set(
          String(row.author_id),
          Number(row.estimated_gross_revenue_vnd ?? 0)
        );
      }
      const fraudSet = new Set((fraudRes.data ?? []).map((r) => String(r.author_id)));

      profiles = profiles.map((p: CreatorAdMonetizationProfileListItem) => ({
        ...p,
        estimated_revenue_month_vnd: revenueMap.get(p.user_id) ?? 0,
        has_fraud_signal: fraudSet.has(p.user_id)
      }));
    }

    return { profiles, total: count ?? profiles.length, error: null };
  } catch {
    return { profiles: [], total: 0, error: "Không tải được danh sách creator." };
  }
}

export async function applyCreatorAdProfileAdminAction(input: {
  userId: string;
  action: AdminCreatorAdProfileAction;
  actorId: string;
  reason?: string;
}): Promise<{ profile: CreatorAdMonetizationProfile | null; error: string | null }> {
  const profile = await ensureCreatorAdMonetizationProfile(input.userId);
  const before = { ...profile };

  if (
    (input.action === "suspend" ||
      input.action === "reject" ||
      input.action === "fraud_hold") &&
    !input.reason?.trim()
  ) {
    return { profile: null, error: "Vui lòng nhập lý do khi tạm dừng, từ chối hoặc fraud hold." };
  }

  await syncCreatorAdProfileCompliance(input.userId);

  let status: CreatorAdMonetizationStatus = profile.status;
  let ads_revenue_enabled = profile.ads_revenue_enabled;
  let fraud_hold = profile.fraud_hold;
  let suspension_reason: string | null = profile.suspension_reason;

  switch (input.action) {
    case "approve":
      status = "eligible";
      ads_revenue_enabled = true;
      fraud_hold = false;
      suspension_reason = null;
      break;
    case "suspend":
      status = "suspended";
      ads_revenue_enabled = false;
      suspension_reason = input.reason?.trim() ?? null;
      break;
    case "reject":
      status = "rejected";
      ads_revenue_enabled = false;
      suspension_reason = input.reason?.trim() ?? null;
      break;
    case "reset":
      status = "not_enabled";
      ads_revenue_enabled = false;
      fraud_hold = false;
      suspension_reason = null;
      break;
    case "fraud_hold":
      status = "fraud_hold";
      fraud_hold = true;
      ads_revenue_enabled = false;
      suspension_reason = input.reason?.trim() ?? null;
      break;
    case "release_fraud_hold":
      fraud_hold = false;
      suspension_reason = null;
      if (status === "fraud_hold") status = "pending_review";
      break;
    case "toggle_ads":
      ads_revenue_enabled = !profile.ads_revenue_enabled;
      break;
    default:
      return { profile: null, error: "Hành động không hợp lệ." };
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("creator_ad_monetization_profiles")
    .update({
      status,
      ads_revenue_enabled,
      fraud_hold,
      suspension_reason,
      reviewed_by: input.actorId,
      reviewed_at: new Date().toISOString()
    })
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (error) {
    return { profile: null, error: error.message };
  }

  const updated = mapProfile(data as Record<string, unknown>);
  await logCreatorAdPolicyAudit({
    actorId: input.actorId,
    action: `profile_${input.action}`,
    targetUserId: input.userId,
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    note: input.reason ?? null
  });

  return { profile: updated, error: null };
}

export async function updateCreatorAdProfileInternalNote(input: {
  userId: string;
  note: string | null;
  actorId: string;
}): Promise<{ error: string | null }> {
  const profile = await ensureCreatorAdMonetizationProfile(input.userId);
  const db = createAdminClient();
  const { error } = await db
    .from("creator_ad_monetization_profiles")
    .update({ internal_note: input.note })
    .eq("user_id", input.userId);

  if (error) return { error: error.message };

  await logCreatorAdPolicyAudit({
    actorId: input.actorId,
    action: "profile_note_updated",
    targetUserId: input.userId,
    before: { internal_note: profile.internal_note },
    after: { internal_note: input.note },
    note: input.note
  });

  return { error: null };
}
