import "server-only";

import { getAudioPolicySettings, parseAudioPolicySettings, AUDIO_POLICY_SETTINGS_KEY, type AudioPolicySettings } from "@/lib/settings/audio-policy-settings";
import { checkStaffAnyPermission, checkStaffPermission } from "@/lib/auth/staff-guards";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { createClient } from "@/lib/data/server";
import { checkAudioLinkRow } from "@/src/lib/audio/audio-link-checker";

export type AudioAdminFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  sourceType?: string;
  status?: string;
  rightsStatus?: string;
  adsPolicy?: string;
  backgroundAllowed?: "true" | "false";
  continuousAllowed?: "true" | "false";
  contentOrigin?: "original" | "translation";
  provider?: string;
  broken?: "true" | "false";
};

export type AudioAdminRow = {
  id: string;
  title: string;
  storyId: string;
  storyTitle: string;
  storySlug: string | null;
  creatorName: string;
  creatorUsername: string | null;
  creatorId: string;
  contentOrigin: string | null;
  partNumber: number | null;
  sourceType: string;
  status: string;
  rightsStatus: string;
  adsPolicy: string;
  backgroundAllowed: boolean;
  continuousAllowed: boolean;
  providerName: string | null;
  domain: string | null;
  lastCheckedAt: string | null;
  lastCheckStatus: string | null;
  createdAt: string;
};

export type AudioAdminListResult = {
  rows: AudioAdminRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

const DEFAULT_PAGE_SIZE = 20;

function normalizePage(value?: number) {
  return Number.isFinite(value) && value && value > 0 ? Math.floor(value) : 1;
}

function normalizePageSize(value?: number) {
  if (!value || !Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  return Math.max(10, Math.min(100, Math.floor(value)));
}

async function assertViewAccess() {
  const auth = await checkStaffPermission("admin.dashboard.view");
  if (!auth.ok) throw new Error(auth.error);
  return auth.userId;
}

async function assertUpdateAccess() {
  const auth = await checkStaffAnyPermission(["admin.settings.update", "admin.settings.view"]);
  if (!auth.ok) throw new Error(auth.error);
  return auth.userId;
}

function extractDomain(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export async function getAdminAudioList(filters: AudioAdminFilters = {}): Promise<AudioAdminListResult> {
  await assertViewAccess();
  const db = await createClient();
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db
    .from("audio_items")
    .select(
      "id,title,story_id,part_number,audio_source_type,status,rights_status,ads_policy,background_playback_allowed,continuous_playback_allowed,provider_name,external_audio_url,normalized_external_audio_url,last_checked_at,last_check_status,created_at,stories(id,title,slug,content_origin,creator_id),profiles!audio_items_creator_profile_id_fkey(id,display_name,username)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (filters.sourceType) query = query.eq("audio_source_type", filters.sourceType);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.rightsStatus) query = query.eq("rights_status", filters.rightsStatus);
  if (filters.adsPolicy) query = query.eq("ads_policy", filters.adsPolicy);
  if (filters.backgroundAllowed) query = query.eq("background_playback_allowed", filters.backgroundAllowed === "true");
  if (filters.continuousAllowed) query = query.eq("continuous_playback_allowed", filters.continuousAllowed === "true");
  if (filters.contentOrigin) query = query.eq("stories.content_origin", filters.contentOrigin);
  if (filters.provider) query = query.ilike("provider_name", `%${filters.provider}%`);
  if (filters.broken === "true") query = query.or("status.eq.broken,last_check_status.eq.failed");
  if (filters.broken === "false") query = query.not("status", "eq", "broken");
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,stories.title.ilike.%${filters.search}%,profiles.display_name.ilike.%${filters.search}%,profiles.username.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((row: any) => {
    const story = Array.isArray(row.stories) ? row.stories[0] : row.stories;
    const creator = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const domain = extractDomain(row.normalized_external_audio_url ?? row.external_audio_url ?? null);
    return {
      id: row.id,
      title: row.title ?? "Audio",
      storyId: story?.id ?? "",
      storyTitle: story?.title ?? "Truyện không rõ",
      storySlug: story?.slug ?? null,
      creatorName: creator?.display_name ?? creator?.username ?? "Không rõ",
      creatorUsername: creator?.username ?? null,
      creatorId: creator?.id ?? "",
      contentOrigin: story?.content_origin ?? null,
      partNumber: row.part_number ?? null,
      sourceType: row.audio_source_type,
      status: row.status,
      rightsStatus: row.rights_status,
      adsPolicy: row.ads_policy,
      backgroundAllowed: Boolean(row.background_playback_allowed),
      continuousAllowed: Boolean(row.continuous_playback_allowed),
      providerName: row.provider_name ?? null,
      domain,
      lastCheckedAt: row.last_checked_at ?? null,
      lastCheckStatus: row.last_check_status ?? null,
      createdAt: row.created_at
    } satisfies AudioAdminRow;
  });

  const totalCount = Number(count ?? 0);
  return { rows, page, pageSize, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / pageSize)) };
}

export async function updateAudioItemAdminAction(input: {
  audioId: string;
  action:
    | "publish"
    | "hide"
    | "reject"
    | "mark_broken"
    | "mark_copyright_disputed"
    | "mark_rights_verified"
    | "disable_ads"
    | "enable_ads"
    | "disable_continuous_playback"
    | "mark_ok";
}) {
  const actorId = await assertUpdateAccess();
  const db = await createClient();
  const { data: existing, error: existingError } = await db
    .from("audio_items")
    .select("*")
    .eq("id", input.audioId)
    .maybeSingle();
  if (existingError || !existing) throw new Error(existingError?.message ?? "Không tìm thấy audio item.");
  const settings = await getAudioPolicySettings();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let auditAction = "";
  if (input.action === "publish") {
    patch.status = "published";
    patch.published_at = new Date().toISOString();
    auditAction = "audio_publish";
  } else if (input.action === "hide") {
    patch.status = "hidden";
    auditAction = "audio_hide";
  } else if (input.action === "reject") {
    patch.status = "rejected";
    auditAction = "audio_reject";
  } else if (input.action === "mark_broken") {
    patch.status = "broken";
    patch.last_check_status = "failed";
    patch.last_checked_at = new Date().toISOString();
    auditAction = "audio_mark_broken";
  } else if (input.action === "mark_copyright_disputed") {
    patch.status = "copyright_disputed";
    patch.rights_status = "disputed";
    auditAction = "audio_mark_copyright_disputed";
  } else if (input.action === "mark_rights_verified") {
    patch.rights_status = "verified";
    auditAction = "audio_mark_rights_verified";
  } else if (input.action === "disable_ads") {
    patch.ads_policy = "ads_disabled";
    auditAction = "audio_disable_ads";
  } else if (input.action === "enable_ads") {
    const canEnable =
      settings.audio_ads_enabled &&
      (existing.audio_source_type !== "external_audio_url" || settings.external_audio_ads_enabled);
    patch.ads_policy = canEnable ? "ads_allowed" : "ads_disabled";
    auditAction = "audio_enable_ads";
  } else if (input.action === "disable_continuous_playback") {
    patch.continuous_playback_allowed = false;
    auditAction = "audio_disable_continuous_playback";
  } else if (input.action === "mark_ok") {
    patch.last_check_status = "ok";
    patch.last_checked_at = new Date().toISOString();
    if (existing.status === "broken") patch.status = "hidden";
  }

  const { error } = await db.from("audio_items").update(patch).eq("id", input.audioId);
  if (error) throw new Error(error.message);
  if (auditAction) {
    await logAdminAction({
      actorId,
      action: auditAction,
      targetType: "audio_item",
      targetId: input.audioId,
      metadata: { before_json: existing, after_json: patch }
    });
  }
}

export async function recheckAudioItem(audioId: string) {
  const actorId = await assertUpdateAccess();
  const db = await createClient();
  const { data: existing, error } = await db.from("audio_items").select("*").eq("id", audioId).maybeSingle();
  if (error || !existing) throw new Error(error?.message ?? "Không tìm thấy audio.");
  const result = await checkAudioLinkRow({
    id: existing.id,
    story_id: existing.story_id,
    title: existing.title,
    audio_source_type: existing.audio_source_type,
    status: existing.status,
    external_audio_url: existing.external_audio_url,
    normalized_external_audio_url: existing.normalized_external_audio_url,
    youtube_url: existing.youtube_url,
    youtube_video_id: existing.youtube_video_id
  });
  const ok = result.outcome === "ok";
  const patch = {
    last_checked_at: new Date().toISOString(),
    last_check_status: ok ? "ok" : result.outcome === "failed" ? "failed" : "unknown",
    last_check_error: result.error,
    status: ok ? existing.status : result.outcome === "failed" ? "broken" : existing.status,
    updated_at: new Date().toISOString()
  };
  const { error: updateError } = await db.from("audio_items").update(patch).eq("id", audioId);
  if (updateError) throw new Error(updateError.message);
  await logAdminAction({
    actorId,
    action: ok ? "audio_recheck_ok" : "audio_mark_broken",
    targetType: "audio_item",
    targetId: audioId,
    metadata: { before_json: existing, after_json: patch }
  });
}

export async function updateAudioPolicySettings(input: Partial<AudioPolicySettings>) {
  const actorId = await assertUpdateAccess();
  const db = await createClient();
  const current = await getAudioPolicySettings();
  const merged = parseAudioPolicySettings({
    ...current,
    ...input,
    paid_audio_enabled: false,
    coin_unlock_audio_enabled: false,
    background_audio_youtube_enabled: false,
    continuous_playback_youtube_enabled: false,
    background_ad_refresh_enabled: false
  });
  const { error } = await db.from("app_settings").upsert(
    {
      key: AUDIO_POLICY_SETTINGS_KEY,
      value: merged,
      is_public: false,
      updated_by: actorId,
      updated_at: new Date().toISOString()
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);
  await logAdminAction({
    actorId,
    action: "audio_policy_update",
    targetType: "audio_policy_settings",
    targetId: AUDIO_POLICY_SETTINGS_KEY,
    metadata: { before_json: current, after_json: merged }
  });
  return merged;
}
