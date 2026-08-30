"use server";

import { revalidatePath } from "next/cache";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { getStoryMonetizationCapabilities } from "@/lib/content-origin/content-origin-policy";
import type {
  RightsStatus,
  StoryMonetizationPolicy
} from "@/lib/content-origin/content-origin-types";
import {
  CONTENT_ORIGIN_POLICY_SETTINGS_KEY,
  getContentOriginPolicySettings,
  parseContentOriginPolicySettings,
  type ContentOriginPolicySettings
} from "@/lib/settings/content-origin-policy-settings";
import { createClient } from "@/lib/data/server";

export type ContentOriginFilterInput = {
  page?: number;
  pageSize?: number;
  contentOrigin?: "all" | "original" | "translation";
  rightsStatus?: "all" | RightsStatus;
  monetizationPolicy?: "all" | StoryMonetizationPolicy;
  creatorId?: string;
  missingMetadata?: boolean;
  status?: "all" | "published" | "draft";
};

export type ContentOriginAdminStoryRow = {
  storyId: string;
  title: string;
  creatorName: string;
  creatorId: string;
  contentOrigin: "original" | "translation";
  rightsStatus: string;
  monetizationPolicy: string;
  canSell: boolean;
  canReceiveTips: boolean;
  canShareAdsRevenue: boolean;
  hasMissingMetadata: boolean;
  status: string;
  updatedAt: string;
};

export type ContentOriginOverview = {
  cards: {
    totalOriginalStories: number;
    totalTranslatedStories: number;
    translationPendingReview: number;
    translationVerified: number;
    translationRejectedOrExpired: number;
    translationWithAdsTipsEnabled: number;
    translationMissingSourceMetadata: number;
  };
  rows: ContentOriginAdminStoryRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type TranslationRightsDetail = {
  storyId: string;
  title: string;
  creatorId: string;
  creatorName: string;
  status: string;
  contentOrigin: "original" | "translation";
  translationType: string | null;
  rightsStatus: string;
  monetizationPolicy: string;
  sourceTitle: string | null;
  sourceAuthorName: string | null;
  sourceUrl: string | null;
  sourcePlatform: string | null;
  originalLanguage: string | null;
  translatedLanguage: string | null;
  licenseNote: string | null;
  licenseDocumentMediaId: string | null;
  rightsExpiresAt: string | null;
  rightsReviewNote: string | null;
  capabilities: ReturnType<typeof getStoryMonetizationCapabilities>;
  auditLogs: Array<{
    id: string;
    action: string;
    createdAt: string;
    actorId: string | null;
    metadata: Record<string, unknown> | null;
  }>;
};

const PAGE_SIZE_DEFAULT = 20;

function normalizePage(value?: number) {
  return Number.isFinite(value) && value && value > 0 ? Math.floor(value) : 1;
}

function normalizePageSize(value?: number) {
  if (!value || !Number.isFinite(value)) return PAGE_SIZE_DEFAULT;
  return Math.max(10, Math.min(100, Math.floor(value)));
}

function isTranslationMissingMetadata(row: Record<string, unknown>) {
  if ((row.content_origin as string | null) !== "translation") return false;
  const required = [
    "source_title",
    "source_author_name",
    "source_url",
    "source_platform",
    "original_language",
    "translated_language"
  ];
  return required.some((key) => {
    const value = row[key];
    if (value == null) return true;
    return typeof value === "string" && value.trim().length === 0;
  });
}

function isPublishedLike(status: string) {
  return status === "published" || status === "approved";
}

async function assertAdminViewAccess() {
  const auth = await checkStaffPermission("admin.dashboard.view");
  if (!auth.ok) {
    return { ok: false as const, error: auth.error ?? "Không có quyền admin." };
  }
  if (!auth.userId) {
    return { ok: false as const, error: "Không có quyền admin." };
  }
  return { ok: true as const, userId: auth.userId };
}

async function assertAdminUpdateAccess() {
  const auth = await checkStaffPermission("admin.settings.update");
  if (!auth.ok) {
    return { ok: false as const, error: auth.error ?? "Không có quyền cập nhật admin settings." };
  }
  if (!auth.userId) {
    return { ok: false as const, error: "Không có quyền cập nhật admin settings." };
  }
  return { ok: true as const, userId: auth.userId };
}

function buildCapabilitiesForRow(
  row: Record<string, unknown>,
  settings: ContentOriginPolicySettings
) {
  return getStoryMonetizationCapabilities(
    {
      content_origin: String(row.content_origin ?? "original"),
      rights_status: String(row.rights_status ?? "unverified"),
      monetization_policy: String(row.monetization_policy ?? "full"),
      rights_expires_at: (row.rights_expires_at as string | null) ?? null
    },
    settings
  );
}

function mapAdminStoryRow(
  row: Record<string, unknown>,
  settings: ContentOriginPolicySettings
): ContentOriginAdminStoryRow {
  const caps = buildCapabilitiesForRow(row, settings);
  return {
    storyId: String(row.id),
    title: String(row.title ?? "Truyện không tiêu đề"),
    creatorName:
      (row.creator_display_name as string | null) ??
      (row.creator_username as string | null) ??
      "Không rõ",
    creatorId: String(row.creator_id ?? ""),
    contentOrigin: caps.contentOrigin,
    rightsStatus: String(row.rights_status ?? "unverified"),
    monetizationPolicy: String(row.monetization_policy ?? "full"),
    canSell: caps.canSellChapters || caps.canSellStoryBundle || caps.canUseCoinUnlock,
    canReceiveTips: caps.canReceiveTips,
    canShareAdsRevenue: caps.canShareAdsRevenue,
    hasMissingMetadata: isTranslationMissingMetadata(row),
    status: String(row.status ?? "draft"),
    updatedAt: String(row.updated_at ?? new Date().toISOString())
  };
}

export async function getContentOriginOverview(
  filters: ContentOriginFilterInput = {}
): Promise<{ data: ContentOriginOverview | null; error: string | null }> {
  const auth = await assertAdminViewAccess();
  if (!auth.ok) return { data: null, error: auth.error };

  const db = await createClient();
  const settings = await getContentOriginPolicySettings();
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);

  let query = db
    .from("stories")
    .select(
      "id, title, creator_id, content_origin, rights_status, monetization_policy, source_title, source_author_name, source_url, source_platform, original_language, translated_language, status, updated_at, rights_expires_at",
      { count: "exact" }
    )
    .order("updated_at", { ascending: false });

  if (filters.contentOrigin && filters.contentOrigin !== "all") {
    query = query.eq("content_origin", filters.contentOrigin);
  }
  if (filters.rightsStatus && filters.rightsStatus !== "all") {
    query = query.eq("rights_status", filters.rightsStatus);
  }
  if (filters.monetizationPolicy && filters.monetizationPolicy !== "all") {
    query = query.eq("monetization_policy", filters.monetizationPolicy);
  }
  if (filters.creatorId) {
    query = query.eq("creator_id", filters.creatorId);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) return { data: null, error: error.message };

  const rawRows = (data ?? []) as Record<string, unknown>[];
  const creatorIds = [...new Set(rawRows.map((row) => String(row.creator_id ?? "")).filter(Boolean))];

  const { data: creators } = creatorIds.length
    ? await db
        .from("profiles")
        .select("id, username, display_name")
        .in("id", creatorIds)
    : { data: [] as Array<{ id: string; username: string | null; display_name: string | null }> };

  const creatorMap = new Map(
    (creators ?? []).map((item) => [
      item.id,
      { creator_display_name: item.display_name, creator_username: item.username }
    ])
  );

  let mappedRows = rawRows.map((row) =>
    mapAdminStoryRow(
      {
        ...row,
        ...(creatorMap.get(String(row.creator_id ?? "")) ?? {})
      },
      settings
    )
  );

  if (filters.missingMetadata) {
    mappedRows = mappedRows.filter((row) => row.hasMissingMetadata);
  }
  if (filters.status === "published") {
    mappedRows = mappedRows.filter((row) => isPublishedLike(row.status));
  } else if (filters.status === "draft") {
    mappedRows = mappedRows.filter((row) => !isPublishedLike(row.status));
  }

  const { data: allTranslations } = await db
    .from("stories")
    .select(
      "id, content_origin, rights_status, monetization_policy, source_title, source_author_name, source_url, source_platform, original_language, translated_language, rights_expires_at"
    )
    .eq("content_origin", "translation");

  const { count: totalOriginalStoriesCount = 0 } = await db
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("content_origin", "original");
  const totalTranslatedStories = allTranslations?.length ?? 0;
  const translationRows = (allTranslations ?? []) as Record<string, unknown>[];
  const translationCapabilities = translationRows.map((row) => buildCapabilitiesForRow(row, settings));
  const translationMissingSourceMetadata = translationRows.filter((row) =>
    isTranslationMissingMetadata(row)
  ).length;

  const cards = {
    totalOriginalStories: totalOriginalStoriesCount ?? 0,
    totalTranslatedStories,
    translationPendingReview: translationRows.filter(
      (row) => String(row.rights_status ?? "unverified") === "pending_review"
    ).length,
    translationVerified: translationRows.filter(
      (row) => String(row.rights_status ?? "unverified") === "verified"
    ).length,
    translationRejectedOrExpired: translationRows.filter((row) =>
      ["rejected", "expired"].includes(String(row.rights_status ?? "unverified"))
    ).length,
    translationWithAdsTipsEnabled: translationCapabilities.filter(
      (caps) => caps.canReceiveTips || caps.canShareAdsRevenue
    ).length,
    translationMissingSourceMetadata
  };

  return {
    data: {
      cards,
      rows: mappedRows,
      page,
      pageSize,
      totalCount: count ?? mappedRows.length,
      totalPages: Math.max(1, Math.ceil((count ?? mappedRows.length) / pageSize))
    },
    error: null
  };
}

export async function getTranslatedStories(filters: ContentOriginFilterInput = {}) {
  return getContentOriginOverview({
    ...filters,
    contentOrigin: "translation"
  });
}

export async function getTranslationRightsDetail(
  storyId: string
): Promise<{ data: TranslationRightsDetail | null; error: string | null }> {
  const auth = await assertAdminViewAccess();
  if (!auth.ok) return { data: null, error: auth.error };

  const db = await createClient();
  const settings = await getContentOriginPolicySettings();
  const { data: row, error } = await db
    .from("stories")
    .select(
      "id, title, creator_id, status, content_origin, translation_type, rights_status, monetization_policy, source_title, source_author_name, source_url, source_platform, original_language, translated_language, license_note, license_document_media_id, rights_expires_at, rights_review_note"
    )
    .eq("id", storyId)
    .maybeSingle();
  if (error || !row) return { data: null, error: error?.message ?? "Không tìm thấy truyện." };

  const { data: creator } = await db
    .from("profiles")
    .select("id, display_name, username")
    .eq("id", row.creator_id)
    .maybeSingle();

  const { data: logs } = await db
    .from("admin_audit_logs")
    .select("id, action, created_at, actor_id, metadata")
    .eq("target_type", "story_translation_rights")
    .eq("target_id", storyId)
    .order("created_at", { ascending: false })
    .limit(20);

  const capabilities = buildCapabilitiesForRow(row as Record<string, unknown>, settings);

  return {
    data: {
      storyId: row.id,
      title: row.title ?? "Truyện không tiêu đề",
      creatorId: row.creator_id ?? "",
      creatorName: creator?.display_name ?? creator?.username ?? "Không rõ",
      status: row.status ?? "draft",
      contentOrigin: row.content_origin === "translation" ? "translation" : "original",
      translationType: row.translation_type ?? null,
      rightsStatus: row.rights_status ?? "unverified",
      monetizationPolicy: row.monetization_policy ?? "free_only",
      sourceTitle: row.source_title ?? null,
      sourceAuthorName: row.source_author_name ?? null,
      sourceUrl: row.source_url ?? null,
      sourcePlatform: row.source_platform ?? null,
      originalLanguage: row.original_language ?? null,
      translatedLanguage: row.translated_language ?? null,
      licenseNote: row.license_note ?? null,
      licenseDocumentMediaId: row.license_document_media_id ?? null,
      rightsExpiresAt: row.rights_expires_at ?? null,
      rightsReviewNote: row.rights_review_note ?? null,
      capabilities,
      auditLogs: (logs ?? []).map((log) => ({
        id: log.id,
        action: log.action,
        createdAt: log.created_at,
        actorId: log.actor_id,
        metadata: (log.metadata as Record<string, unknown> | null) ?? null
      }))
    },
    error: null
  };
}

async function updateStoryCapabilityFlags(
  storyId: string,
  originInput: {
    content_origin: string;
    rights_status: string;
    monetization_policy: string;
    rights_expires_at: string | null;
  }
) {
  const db = await createClient();
  const settings = await getContentOriginPolicySettings();
  const caps = getStoryMonetizationCapabilities(originInput, settings);
  await db
    .from("stories")
    .update({
      must_be_free_to_read: caps.mustBeFreeToRead,
      can_sell_chapters: caps.canSellChapters,
      can_sell_story_bundle: caps.canSellStoryBundle,
      can_receive_tips: caps.canReceiveTips,
      can_share_ads_revenue: caps.canShareAdsRevenue,
      can_join_boost_campaign: caps.canJoinBoostCampaign
    })
    .eq("id", storyId);
}

export async function updateTranslationRightsStatus(input: {
  storyId: string;
  action:
    | "verified"
    | "pending_review"
    | "rejected"
    | "expired"
    | "request_more_info";
  rightsExpiresAt?: string | null;
  rightsReviewNote?: string | null;
}) {
  const auth = await assertAdminUpdateAccess();
  if (!auth.ok) return { ok: false as const, error: auth.error };

  const db = await createClient();
  const { data: before, error: beforeError } = await db
    .from("stories")
    .select("id, content_origin, rights_status, monetization_policy, rights_expires_at, rights_review_note")
    .eq("id", input.storyId)
    .maybeSingle();
  if (beforeError || !before) {
    return { ok: false as const, error: beforeError?.message ?? "Không tìm thấy truyện." };
  }
  if (before.content_origin !== "translation") {
    return { ok: false as const, error: "Chỉ áp dụng cho Truyện Dịch." };
  }

  const nextStatus: RightsStatus =
    input.action === "request_more_info"
      ? "pending_review"
      : (input.action as RightsStatus);
  const patch = {
    rights_status: nextStatus,
    rights_review_note: input.rightsReviewNote ?? before.rights_review_note ?? null,
    rights_expires_at: input.rightsExpiresAt ?? before.rights_expires_at ?? null
  };

  const { error } = await db.from("stories").update(patch).eq("id", input.storyId);
  if (error) return { ok: false as const, error: error.message };

  await updateStoryCapabilityFlags(input.storyId, {
    content_origin: before.content_origin,
    rights_status: patch.rights_status,
    monetization_policy: before.monetization_policy ?? "free_only",
    rights_expires_at: patch.rights_expires_at
  });

  await logAdminAction({
    actorId: auth.userId,
    action: `translation_rights.${input.action}`,
    targetType: "story_translation_rights",
    targetId: input.storyId,
    metadata: {
      before_json: before,
      after_json: patch
    }
  });

  revalidatePath("/admin/content-origins");
  revalidatePath("/admin/translations");
  revalidatePath(`/admin/translations/${input.storyId}`);
  return { ok: true as const, error: null };
}

export async function updateTranslationMonetizationPolicy(input: {
  storyId: string;
  monetizationPolicy: "free_only" | "ads_tips_allowed" | "no_monetization";
  rightsReviewNote?: string | null;
}) {
  const auth = await assertAdminUpdateAccess();
  if (!auth.ok) return { ok: false as const, error: auth.error };

  const db = await createClient();
  const { data: before, error: beforeError } = await db
    .from("stories")
    .select("id, content_origin, rights_status, monetization_policy, rights_expires_at, rights_review_note")
    .eq("id", input.storyId)
    .maybeSingle();
  if (beforeError || !before) {
    return { ok: false as const, error: beforeError?.message ?? "Không tìm thấy truyện." };
  }
  if (before.content_origin !== "translation") {
    return { ok: false as const, error: "Chỉ áp dụng cho Truyện Dịch." };
  }

  const patch = {
    monetization_policy: input.monetizationPolicy,
    rights_review_note: input.rightsReviewNote ?? before.rights_review_note ?? null
  };
  const { error } = await db.from("stories").update(patch).eq("id", input.storyId);
  if (error) return { ok: false as const, error: error.message };

  await updateStoryCapabilityFlags(input.storyId, {
    content_origin: before.content_origin,
    rights_status: before.rights_status ?? "unverified",
    monetization_policy: patch.monetization_policy,
    rights_expires_at: before.rights_expires_at
  });

  await logAdminAction({
    actorId: auth.userId,
    action: "translation_rights.update_monetization_policy",
    targetType: "story_translation_rights",
    targetId: input.storyId,
    metadata: {
      before_json: before,
      after_json: patch
    }
  });

  revalidatePath("/admin/content-origins");
  revalidatePath("/admin/translations");
  revalidatePath(`/admin/translations/${input.storyId}`);
  return { ok: true as const, error: null };
}

export async function updateContentOriginPolicySettings(input: {
  settings: Partial<ContentOriginPolicySettings>;
}) {
  const auth = await assertAdminUpdateAccess();
  if (!auth.ok) return { ok: false as const, error: auth.error };

  const db = await createClient();
  const current = await getContentOriginPolicySettings();
  const merged = parseContentOriginPolicySettings({
    ...current,
    ...input.settings,
    translation_paid_chapters_allowed: false,
    translation_story_bundle_allowed: false,
    translation_coin_unlock_allowed: false
  });

  const { error } = await db.from("app_settings").upsert(
    {
      key: CONTENT_ORIGIN_POLICY_SETTINGS_KEY,
      value: merged,
      is_public: false,
      updated_by: auth.userId,
      updated_at: new Date().toISOString()
    },
    { onConflict: "key" }
  );
  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    actorId: auth.userId,
    action: "translation_rights.update_global_policy",
    targetType: "content_origin_policy_settings",
    targetId: CONTENT_ORIGIN_POLICY_SETTINGS_KEY,
    metadata: {
      before_json: current,
      after_json: merged
    }
  });

  revalidatePath("/admin/content-origins");
  revalidatePath("/admin/translations");
  revalidatePath("/admin/monetization-policies");
  return { ok: true as const, error: null, settings: merged };
}
