import "server-only";

import { assertCreatorOwnsStory } from "@/lib/auth/ownership";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { createClient } from "@/lib/data/server";
import { createAdminClient } from "@/lib/data/admin";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { getAudioPolicySettings } from "@/lib/settings/audio-policy-settings";
import {
  assertAudioIsFree,
  assertAudioMustBeLinkedToStory,
  assertAudioSourceAllowed,
  assertBackgroundPlaybackAllowed,
  assertContinuousPlaybackAllowed,
  assertStoryLevelAudioOnly,
  canShowAdsOnAudio
} from "@/src/lib/audio/audio-policy";
import { parseYoutubeVideoId, validateExternalAudioUrl, validateYoutubeUrl } from "@/src/lib/audio/audio-url";

export type AudioItemRow = {
  id: string;
  story_id: string;
  creator_profile_id: string;
  audio_source_type: "external_audio_url" | "youtube_embed";
  external_audio_url: string | null;
  normalized_external_audio_url: string | null;
  youtube_video_id: string | null;
  youtube_url: string | null;
  provider_name: string | null;
  title: string;
  description: string | null;
  part_number: number | null;
  duration_seconds: number | null;
  language: string;
  sort_order: number;
  status: "draft" | "pending_review" | "published" | "hidden" | "broken" | "rejected" | "copyright_disputed";
  rights_status: "self_declared" | "verified" | "disputed" | "rejected" | "pending_review";
  ads_policy: "inherit" | "ads_allowed" | "ads_disabled" | "pending_review";
  is_free: boolean;
  is_primary: boolean;
  background_playback_allowed: boolean;
  continuous_playback_allowed: boolean;
  last_checked_at: string | null;
  last_check_status: "ok" | "failed" | "unknown" | null;
  last_check_error: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AudioItemInput = {
  story_id?: string | null;
  chapter_id?: string | null;
  audio_source_type?: "external_audio_url" | "youtube_embed" | null;
  external_audio_url?: string | null;
  youtube_url?: string | null;
  youtube_video_id?: string | null;
  title?: string | null;
  description?: string | null;
  part_number?: number | null;
  duration_seconds?: number | null;
  language?: string | null;
  sort_order?: number | null;
  is_primary?: boolean | null;
  background_playback_allowed?: boolean | null;
  continuous_playback_allowed?: boolean | null;
  is_free?: boolean | null;
  price?: number | null;
  price_coins?: number | null;
  coin_unlock_price?: number | null;
  unlock_type?: string | null;
  status_intent?: "draft" | "review" | "publish" | null;
};

export type StoryAudioOptions = {
  includeUnpublished?: boolean;
  statuses?: AudioItemRow["status"][];
  limit?: number;
  offset?: number;
};

export class AudioItemsError extends Error {}

async function getStoryById(storyId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("stories")
    .select("id, title, creator_id, content_origin, rights_status")
    .eq("id", storyId)
    .maybeSingle();

  if (error) throw new AudioItemsError(error.message);
  if (!data) throw new AudioItemsError("Không tìm thấy truyện.");
  return data as {
    id: string;
    title: string;
    creator_id: string;
    content_origin: string | null;
    rights_status: string | null;
  };
}

async function ensureCreatorOwnsStoryForAudio(creatorProfile: CreatorProfile, storyId: string) {
  const owned = await assertCreatorOwnsStory(creatorProfile, storyId);
  const story = await getStoryById(storyId);
  return {
    ...story,
    title: owned.title,
    content_origin: owned.content_origin
  };
}

function normalizeStatusIntent(
  input: AudioItemInput,
  sourceType: "external_audio_url" | "youtube_embed",
  settings: Awaited<ReturnType<typeof getAudioPolicySettings>>
): AudioItemRow["status"] {
  const intent = input.status_intent ?? "draft";
  if (intent === "draft") {
    return "draft";
  }
  const requiresAdminReview =
    (sourceType === "youtube_embed" && settings.require_admin_review_for_youtube) ||
    (sourceType === "external_audio_url" && settings.require_admin_review_for_external_audio);

  if (requiresAdminReview || settings.default_audio_status === "pending_review") {
    return "pending_review";
  }

  if (intent === "publish" && settings.auto_publish_for_trusted_creators) {
    return "published";
  }

  return settings.default_audio_status === "published" ? "published" : "pending_review";
}

function requireSourceType(input: AudioItemInput): "external_audio_url" | "youtube_embed" {
  if (input.audio_source_type === "external_audio_url" || input.audio_source_type === "youtube_embed") {
    return input.audio_source_type;
  }
  throw new AudioItemsError("Nguồn audio không hợp lệ.");
}

async function normalizeSourcePayload(
  sourceType: "external_audio_url" | "youtube_embed",
  input: AudioItemInput,
  settings: Awaited<ReturnType<typeof getAudioPolicySettings>>
) {
  if (sourceType === "external_audio_url") {
    const result = validateExternalAudioUrl(input.external_audio_url ?? "", settings);
    if (!result.ok) {
      throw new AudioItemsError(`URL audio ngoài không hợp lệ (${result.reasonCode ?? "unknown"}).`);
    }
    return {
      external_audio_url: result.normalizedUrl,
      normalized_external_audio_url: result.normalizedUrl,
      youtube_url: null,
      youtube_video_id: null,
      provider_name: result.providerName
    };
  }

  const validation = validateYoutubeUrl(input.youtube_url ?? "", settings);
  const fromInputVideoId = (input.youtube_video_id ?? "").trim();
  const parsedVideoId = validation.youtubeVideoId ?? parseYoutubeVideoId(input.youtube_url ?? "") ?? null;
  const finalVideoId = parsedVideoId ?? (fromInputVideoId.length > 0 ? fromInputVideoId : null);

  if (!finalVideoId) {
    throw new AudioItemsError("URL YouTube không hợp lệ.");
  }

  return {
    external_audio_url: null,
    normalized_external_audio_url: null,
    youtube_url: validation.normalizedUrl ?? input.youtube_url ?? null,
    youtube_video_id: finalVideoId,
    provider_name: "youtube"
  };
}

async function buildWritePayload(
  creatorProfile: CreatorProfile,
  profileIdForDb: string,
  input: AudioItemInput,
  isUpdate = false
) {
  const settings = await getAudioPolicySettings();

  assertAudioMustBeLinkedToStory(input, settings);
  assertStoryLevelAudioOnly(input, settings);
  assertAudioIsFree(input, settings);
  assertAudioSourceAllowed(input, settings);
  assertBackgroundPlaybackAllowed(input, settings);
  assertContinuousPlaybackAllowed(input, settings);

  const storyId = String(input.story_id ?? "").trim();
  if (!storyId) {
    throw new AudioItemsError("Thiếu story_id.");
  }

  const story = await ensureCreatorOwnsStoryForAudio(creatorProfile, storyId);
  const sourceType = requireSourceType(input);

  const sourcePayload = await normalizeSourcePayload(sourceType, input, settings);

  const canBackground =
    sourceType === "external_audio_url" &&
    settings.background_audio_enabled &&
    settings.background_audio_external_enabled;
  const canContinuous =
    sourceType === "external_audio_url" &&
    settings.continuous_playback_enabled &&
    settings.continuous_playback_external_enabled &&
    settings.continuous_playback_story_audio_enabled;

  const adsAllowed = canShowAdsOnAudio(
    { id: story.id, content_origin: story.content_origin, rights_status: story.rights_status },
    { audio_source_type: sourceType, rights_status: "self_declared", ads_policy: "inherit" },
    settings
  );
  const normalizedStatus = normalizeStatusIntent(input, sourceType, settings);

  const nowIso = new Date().toISOString();
  return {
    story,
    payload: {
      story_id: story.id,
      creator_profile_id: profileIdForDb,
      audio_source_type: sourceType,
      ...sourcePayload,
      title: String(input.title ?? "").trim(),
      description: input.description?.trim() || null,
      part_number: input.part_number ?? null,
      duration_seconds: input.duration_seconds ?? null,
      language: (input.language ?? "vi").trim() || "vi",
      sort_order: input.sort_order ?? 0,
      status: normalizedStatus,
      rights_status: "self_declared" as const,
      ads_policy: adsAllowed ? ("ads_allowed" as const) : ("ads_disabled" as const),
      is_free: true,
      is_primary: Boolean(input.is_primary),
      background_playback_allowed: isUpdate ? Boolean(input.background_playback_allowed && canBackground) : canBackground,
      continuous_playback_allowed: isUpdate
        ? Boolean(input.continuous_playback_allowed && canContinuous)
        : canContinuous,
      published_at: normalizedStatus === "published" ? nowIso : null,
      updated_at: nowIso
    }
  };
}

export async function countAudioItemsForStory(storyId: string): Promise<number> {
  const db = await createClient();
  const { count, error } = await db
    .from("audio_items")
    .select("id", { head: true, count: "exact" })
    .eq("story_id", storyId);
  if (error) throw new AudioItemsError(error.message);
  return Number(count ?? 0);
}

export async function getAudioItemById(audioId: string): Promise<AudioItemRow | null> {
  const db = await createClient();
  const { data, error } = await db.from("audio_items").select("*").eq("id", audioId).maybeSingle();
  if (error) throw new AudioItemsError(error.message);
  return (data as AudioItemRow | null) ?? null;
}

export async function getStoryAudioItems(storyId: string, options: StoryAudioOptions = {}): Promise<AudioItemRow[]> {
  const db = await createClient();
  let query = db.from("audio_items").select("*").eq("story_id", storyId);

  if (!options.includeUnpublished) {
    query = query.eq("status", "published");
  }
  if (options.statuses && options.statuses.length > 0) {
    query = query.in("status", options.statuses);
  }
  const limit = Math.min(200, Math.max(1, options.limit ?? 100));
  const offset = Math.max(0, options.offset ?? 0);
  const { data, error } = await query
    .order("part_number", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new AudioItemsError(error.message);
  return (data as AudioItemRow[]) ?? [];
}

export async function getPublishedStoryAudioItems(storyId: string): Promise<AudioItemRow[]> {
  return getStoryAudioItems(storyId, { includeUnpublished: false });
}

export async function getStoryAudioSummary(storyId: string) {
  const items = await getStoryAudioItems(storyId, { includeUnpublished: true, limit: 200 });
  const publishedCount = items.filter((item) => item.status === "published").length;
  const externalCount = items.filter((item) => item.audio_source_type === "external_audio_url").length;
  const youtubeCount = items.filter((item) => item.audio_source_type === "youtube_embed").length;

  return {
    total: items.length,
    published: publishedCount,
    external: externalCount,
    youtube: youtubeCount
  };
}

export async function createAudioItem(
  creatorProfile: CreatorProfile,
  profileIdForDb: string,
  input: AudioItemInput
): Promise<AudioItemRow> {
  const settings = await getAudioPolicySettings();
  const storyId = String(input.story_id ?? "").trim();
  if (!storyId) throw new AudioItemsError("Thiếu story_id.");
  const currentCount = await countAudioItemsForStory(storyId);
  if (currentCount >= settings.max_audio_items_per_story) {
    throw new AudioItemsError("Đã vượt số lượng audio tối đa cho truyện.");
  }

  const db = await createClient();
  const { payload } = await buildWritePayload(creatorProfile, profileIdForDb, input, false);
  if (!payload.title) {
    throw new AudioItemsError("Tiêu đề audio là bắt buộc.");
  }

  const { data, error } = await db.from("audio_items").insert(payload).select("*").single();
  if (error) throw new AudioItemsError(error.message);
  return data as AudioItemRow;
}

export async function updateAudioItem(
  creatorProfile: CreatorProfile,
  profileIdForDb: string,
  audioId: string,
  input: AudioItemInput
): Promise<AudioItemRow> {
  const existing = await getAudioItemById(audioId);
  if (!existing) throw new AudioItemsError("Không tìm thấy audio item.");
  await ensureCreatorOwnsStoryForAudio(creatorProfile, existing.story_id);
  if (existing.creator_profile_id !== profileIdForDb) {
    throw new AudioItemsError("Bạn không có quyền sửa audio này.");
  }

  const mergedInput: AudioItemInput = {
    ...input,
    story_id: existing.story_id,
    audio_source_type: (input.audio_source_type ?? existing.audio_source_type) as AudioItemInput["audio_source_type"],
    external_audio_url: input.external_audio_url ?? existing.external_audio_url,
    youtube_url: input.youtube_url ?? existing.youtube_url,
    youtube_video_id: input.youtube_video_id ?? existing.youtube_video_id,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    part_number: input.part_number ?? existing.part_number,
    duration_seconds: input.duration_seconds ?? existing.duration_seconds,
    language: input.language ?? existing.language,
    sort_order: input.sort_order ?? existing.sort_order,
    is_primary: input.is_primary ?? existing.is_primary
  };

  const db = await createClient();
  const { payload } = await buildWritePayload(creatorProfile, profileIdForDb, mergedInput, true);
  const { data, error } = await db
    .from("audio_items")
    .update(payload)
    .eq("id", audioId)
    .eq("creator_profile_id", profileIdForDb)
    .select("*")
    .single();

  if (error) throw new AudioItemsError(error.message);
  return data as AudioItemRow;
}

export async function deleteAudioItem(
  creatorProfile: CreatorProfile,
  profileIdForDb: string,
  audioId: string
): Promise<void> {
  const existing = await getAudioItemById(audioId);
  if (!existing) throw new AudioItemsError("Không tìm thấy audio item.");
  await ensureCreatorOwnsStoryForAudio(creatorProfile, existing.story_id);
  const db = await createClient();
  const { error } = await db
    .from("audio_items")
    .delete()
    .eq("id", audioId)
    .eq("creator_profile_id", profileIdForDb);
  if (error) throw new AudioItemsError(error.message);
}

export async function submitAudioItemForReview(
  creatorProfile: CreatorProfile,
  profileIdForDb: string,
  audioId: string
): Promise<AudioItemRow> {
  const existing = await getAudioItemById(audioId);
  if (!existing) throw new AudioItemsError("Không tìm thấy audio item.");
  await ensureCreatorOwnsStoryForAudio(creatorProfile, existing.story_id);
  const db = await createClient();
  const { data, error } = await db
    .from("audio_items")
    .update({ status: "pending_review", updated_at: new Date().toISOString() })
    .eq("id", audioId)
    .eq("creator_profile_id", profileIdForDb)
    .select("*")
    .single();

  if (error) throw new AudioItemsError(error.message);
  return data as AudioItemRow;
}

async function publishOrHideAudioItem(
  actorId: string,
  audioId: string,
  nextStatus: "published" | "hidden"
): Promise<AudioItemRow> {
  const patch =
    nextStatus === "published"
      ? { status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      : { status: "hidden", updated_at: new Date().toISOString() };
  const existing = await getAudioItemById(audioId);
  if (!existing) {
    throw new AudioItemsError("Không tìm thấy audio item.");
  }

  if (existing.creator_profile_id === actorId) {
    const db = await createClient();
    const { data, error } = await db
      .from("audio_items")
      .update(patch)
      .eq("id", audioId)
      .eq("creator_profile_id", actorId)
      .select("*")
      .single();
    if (error) throw new AudioItemsError(error.message);
    return data as AudioItemRow;
  }

  const db = await createClient();
  const { data: actorProfile, error: profileError } = await db
    .from("profiles")
    .select("role")
    .eq("id", actorId)
    .maybeSingle();
  if (profileError) {
    throw new AudioItemsError(profileError.message);
  }

  const role = String((actorProfile as { role?: string } | null)?.role ?? "").toLowerCase();
  const isAdmin = role === "admin" || role === "founder";
  if (!isAdmin) {
    throw new AudioItemsError("Bạn không có quyền đổi trạng thái audio này.");
  }

  const client = createAdminClient();
  const { data, error } = await client.from("audio_items").update(patch).eq("id", audioId).select("*").single();
  if (error) throw new AudioItemsError(error.message);
  const row = data as AudioItemRow;
  await logAdminAction({
    action: nextStatus === "published" ? "audio_item_published" : "audio_item_hidden",
    actorId,
    targetType: "audio_item",
    targetId: audioId,
    metadata: { storyId: row.story_id, sourceType: row.audio_source_type }
  });
  return row;
}

export async function publishAudioItem(
  creatorProfile: CreatorProfile,
  profileIdForDb: string,
  audioId: string
): Promise<AudioItemRow> {
  const existing = await getAudioItemById(audioId);
  if (!existing) throw new AudioItemsError("Không tìm thấy audio item.");
  await ensureCreatorOwnsStoryForAudio(creatorProfile, existing.story_id);
  return publishOrHideAudioItem(profileIdForDb, audioId, "published");
}

export async function hideAudioItem(
  creatorProfile: CreatorProfile,
  profileIdForDb: string,
  audioId: string
): Promise<AudioItemRow> {
  const existing = await getAudioItemById(audioId);
  if (!existing) throw new AudioItemsError("Không tìm thấy audio item.");
  await ensureCreatorOwnsStoryForAudio(creatorProfile, existing.story_id);
  return publishOrHideAudioItem(profileIdForDb, audioId, "hidden");
}

export async function setAudioItemStatusAsAdmin(
  actorProfileId: string,
  audioId: string,
  nextStatus: "published" | "hidden"
): Promise<AudioItemRow> {
  return publishOrHideAudioItem(actorProfileId, audioId, nextStatus);
}
