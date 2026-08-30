import "server-only";

import { assertCreatorOwnsStory } from "@/lib/auth/ownership";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { createClient } from "@/lib/data/server";
import { createAdminClient } from "@/lib/data/admin";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import {
  FILM_RELATION_TYPES,
  type FilmAdaptationStatus,
  type FilmAdsPolicy,
  type FilmRelationType,
  type FilmRightsStatus,
  type FilmYoutubeEmbedType
} from "@/lib/db/schema/film-adaptations";
import { getFilmAdaptationPolicySettings } from "@/lib/settings/film-adaptation-settings";
import {
  assertFilmIsFree,
  assertFilmIsStoryLevelOnly,
  assertFilmMustBeLinkedToStory,
  canShowAdsOnFilmAdaptation,
  type FilmAdaptationLike
} from "@/src/lib/film-adaptations/film-policy";
import {
  parseYoutubeEmbedInput,
  validateYoutubeFilmUrl
} from "@/src/lib/film-adaptations/youtube";

export type FilmAdaptationRow = {
  id: string;
  story_id: string;
  creator_profile_id: string;
  youtube_url: string;
  youtube_video_id: string | null;
  youtube_playlist_id: string | null;
  youtube_embed_type: FilmYoutubeEmbedType;
  title: string;
  description: string | null;
  creative_note: string | null;
  relation_type: FilmRelationType;
  language: string;
  duration_seconds: number | null;
  sort_order: number;
  status: FilmAdaptationStatus;
  rights_status: FilmRightsStatus;
  ads_policy: FilmAdsPolicy;
  is_free: boolean;
  last_checked_at: string | null;
  last_check_status: "ok" | "failed" | "unknown" | null;
  last_check_error: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FilmAdaptationInput = {
  story_id?: string | null;
  chapter_id?: string | null;
  youtube_url?: string | null;
  youtube_embed_type?: FilmYoutubeEmbedType | string | null;
  title?: string | null;
  description?: string | null;
  creative_note?: string | null;
  relation_type?: FilmRelationType | string | null;
  language?: string | null;
  duration_seconds?: number | null;
  sort_order?: number | null;
  is_free?: boolean | null;
  price?: number | null;
  price_coins?: number | null;
  coin_unlock_price?: number | null;
  unlock_type?: string | null;
  background_playback_allowed?: boolean | null;
  audio_only?: boolean | null;
  source_type?: string | null;
  status_intent?: "draft" | "review" | "publish" | null;
};

export type StoryFilmOptions = {
  includeUnpublished?: boolean;
  statuses?: FilmAdaptationStatus[];
  limit?: number;
  offset?: number;
};

export class FilmAdaptationsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FilmAdaptationsError";
  }
}

function mapPolicyError(error: unknown): never {
  if (!(error instanceof Error)) {
    throw new FilmAdaptationsError("Không thể xử lý phim chuyển thể.");
  }
  const code = error.message;
  const map: Record<string, string> = {
    FILM_POLICY_DISABLED: "Tính năng phim chuyển thể đang tắt.",
    FILM_POLICY_REQUIRE_STORY_ID: "Phim phải liên kết với một truyện.",
    FILM_POLICY_CHAPTER_LEVEL_FORBIDDEN: "Phim chỉ liên kết ở cấp truyện, không theo chương.",
    FILM_POLICY_MUST_BE_FREE: "Phim phải miễn phí.",
    FILM_POLICY_PAID_FILM_DISABLED: "Không hỗ trợ phim trả phí.",
    FILM_POLICY_COIN_UNLOCK_DISABLED: "Không hỗ trợ mở khóa coin cho phim.",
    FILM_POLICY_YOUTUBE_ONLY: "Chỉ hỗ trợ nguồn YouTube.",
    FILM_POLICY_AUDIO_ONLY_FORBIDDEN: "Không hỗ trợ audio-only.",
    FILM_POLICY_BACKGROUND_PLAYBACK_FORBIDDEN: "Không hỗ trợ phát nền YouTube."
  };
  if (map[code]) {
    throw new FilmAdaptationsError(map[code]);
  }
  if (code.startsWith("FILM_POLICY_YOUTUBE_URL_INVALID:")) {
    throw new FilmAdaptationsError("URL YouTube không hợp lệ hoặc không được phép.");
  }
  throw error;
}

async function getStoryById(storyId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("stories")
    .select("id, title, creator_id, content_origin, rights_status, status")
    .eq("id", storyId)
    .maybeSingle();

  if (error) throw new FilmAdaptationsError(error.message);
  if (!data) throw new FilmAdaptationsError("Không tìm thấy truyện.");
  return data as {
    id: string;
    title: string;
    creator_id: string;
    content_origin: string | null;
    rights_status: string | null;
    status: string | null;
  };
}

async function ensureCreatorOwnsStoryForFilm(creatorProfile: CreatorProfile, storyId: string) {
  const owned = await assertCreatorOwnsStory(creatorProfile, storyId);
  const story = await getStoryById(storyId);
  return {
    ...story,
    title: owned.title,
    content_origin: owned.content_origin,
    rights_status: story.rights_status,
    status: owned.status
  };
}

function requireRelationType(value: string | null | undefined): FilmRelationType {
  const normalized = String(value ?? "based_on_story").trim() as FilmRelationType;
  if ((FILM_RELATION_TYPES as readonly string[]).includes(normalized)) {
    return normalized;
  }
  throw new FilmAdaptationsError("Loại quan hệ phim không hợp lệ.");
}

function requireEmbedType(value: string | null | undefined): FilmYoutubeEmbedType {
  const normalized = String(value ?? "video").trim();
  if (normalized === "video" || normalized === "playlist") {
    return normalized;
  }
  throw new FilmAdaptationsError("Loại nhúng YouTube không hợp lệ.");
}

function normalizeYoutubeTarget(
  url: string,
  embedType: FilmYoutubeEmbedType,
  settings: Awaited<ReturnType<typeof getFilmAdaptationPolicySettings>>
) {
  const validation = validateYoutubeFilmUrl(url, settings);
  if (!validation.ok) {
    throw new FilmAdaptationsError(
      `URL YouTube không hợp lệ (${validation.reasonCode ?? "unknown"}).`
    );
  }

  const parsed = parseYoutubeEmbedInput(url);

  if (embedType === "playlist") {
    if (!settings.allow_youtube_playlist) {
      throw new FilmAdaptationsError("Playlist YouTube đang tắt trong cài đặt.");
    }
    const playlistId = parsed.playlistId;
    if (!playlistId) {
      throw new FilmAdaptationsError(
        "URL không chứa playlist hợp lệ. Dùng link dạng youtube.com/playlist?list=... hoặc watch có tham số list=."
      );
    }
    return {
      youtube_url: parsed.normalizedUrl ?? url.trim(),
      youtube_video_id: null,
      youtube_playlist_id: playlistId,
      youtube_embed_type: "playlist" as const
    };
  }

  if (!settings.allow_youtube_video) {
    throw new FilmAdaptationsError("Video YouTube đang tắt trong cài đặt.");
  }
  const videoId = parsed.videoId;
  if (!videoId) {
    throw new FilmAdaptationsError("URL không chứa video YouTube hợp lệ.");
  }
  return {
    youtube_url: parsed.normalizedUrl ?? url.trim(),
    youtube_video_id: videoId,
    youtube_playlist_id: null,
    youtube_embed_type: "video" as const
  };
}

function normalizeStatusIntent(
  input: FilmAdaptationInput,
  settings: Awaited<ReturnType<typeof getFilmAdaptationPolicySettings>>
): FilmAdaptationStatus {
  const intent = input.status_intent ?? "draft";
  if (intent === "draft") {
    return "draft";
  }

  if (settings.require_admin_review_for_youtube || settings.default_film_status === "pending_review") {
    if (intent === "review" || intent === "publish") {
      return "pending_review";
    }
  }

  if (intent === "publish" && settings.auto_publish_for_trusted_creators) {
    return "published";
  }

  if (intent === "publish" && settings.default_film_status === "published") {
    return "published";
  }

  return intent === "review" ? "pending_review" : settings.default_film_status;
}

async function buildWritePayload(
  creatorProfile: CreatorProfile,
  profileIdForDb: string,
  input: FilmAdaptationInput
) {
  const settings = await getFilmAdaptationPolicySettings();

  if (!settings.film_adaptations_enabled) {
    throw new FilmAdaptationsError("Tính năng phim chuyển thể đang tắt.");
  }

  try {
    assertFilmMustBeLinkedToStory(input, settings);
    assertFilmIsStoryLevelOnly(input, settings);
    assertFilmIsFree(input, settings);
  } catch (error) {
    mapPolicyError(error);
  }

  const storyId = String(input.story_id ?? "").trim();
  if (!storyId) {
    throw new FilmAdaptationsError("Thiếu story_id.");
  }

  const story = await ensureCreatorOwnsStoryForFilm(creatorProfile, storyId);
  const embedType = requireEmbedType(input.youtube_embed_type);
  const youtubeUrl = String(input.youtube_url ?? "").trim();
  if (!youtubeUrl) {
    throw new FilmAdaptationsError("URL YouTube là bắt buộc.");
  }

  const youtubePayload = normalizeYoutubeTarget(youtubeUrl, embedType, settings);
  const relationType = requireRelationType(input.relation_type);
  const normalizedStatus = normalizeStatusIntent(input, settings);
  const nowIso = new Date().toISOString();

  const filmLike: FilmAdaptationLike = {
    story_id: story.id,
    youtube_url: youtubePayload.youtube_url,
    youtube_video_id: youtubePayload.youtube_video_id,
    youtube_playlist_id: youtubePayload.youtube_playlist_id,
    youtube_embed_type: youtubePayload.youtube_embed_type,
    relation_type: relationType,
    is_free: true,
    rights_status: "self_declared",
    ads_policy: "inherit"
  };

  const adsAllowed = canShowAdsOnFilmAdaptation(
    {
      id: story.id,
      content_origin: story.content_origin,
      rights_status: story.rights_status,
      status: story.status
    },
    filmLike,
    settings
  );

  const title = String(input.title ?? "").trim();
  if (!title) {
    throw new FilmAdaptationsError("Tiêu đề phim là bắt buộc.");
  }

  return {
    story,
    payload: {
      story_id: story.id,
      creator_profile_id: profileIdForDb,
      ...youtubePayload,
      title,
      description: input.description?.trim() || null,
      creative_note: input.creative_note?.trim() || null,
      relation_type: relationType,
      language: (input.language ?? "vi").trim() || "vi",
      duration_seconds: input.duration_seconds ?? null,
      sort_order: input.sort_order ?? 0,
      status: normalizedStatus,
      rights_status: "self_declared" as const,
      ads_policy: (adsAllowed ? "ads_allowed" : "ads_disabled") as FilmAdsPolicy,
      is_free: true,
      published_at: normalizedStatus === "published" ? nowIso : null,
      updated_at: nowIso
    }
  };
}

export async function countFilmAdaptationsForStory(storyId: string): Promise<number> {
  const db = await createClient();
  const { count, error } = await db
    .from("story_film_adaptations")
    .select("id", { head: true, count: "exact" })
    .eq("story_id", storyId);
  if (error) throw new FilmAdaptationsError(error.message);
  return Number(count ?? 0);
}

export async function getFilmAdaptationById(id: string): Promise<FilmAdaptationRow | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("story_film_adaptations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new FilmAdaptationsError(error.message);
  return (data as FilmAdaptationRow | null) ?? null;
}

export async function getStoryFilmAdaptations(
  storyId: string,
  options: StoryFilmOptions = {}
): Promise<FilmAdaptationRow[]> {
  const db = await createClient();
  let query = db.from("story_film_adaptations").select("*").eq("story_id", storyId);

  if (!options.includeUnpublished) {
    query = query.eq("status", "published");
  }
  if (options.statuses && options.statuses.length > 0) {
    query = query.in("status", options.statuses);
  }

  const limit = Math.min(200, Math.max(1, options.limit ?? 100));
  const offset = Math.max(0, options.offset ?? 0);
  const { data, error } = await query
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new FilmAdaptationsError(error.message);
  return (data as FilmAdaptationRow[]) ?? [];
}

export async function getPublishedStoryFilmAdaptations(storyId: string): Promise<FilmAdaptationRow[]> {
  return getStoryFilmAdaptations(storyId, { includeUnpublished: false });
}

export async function createFilmAdaptation(
  profileId: string,
  creatorProfile: CreatorProfile,
  input: FilmAdaptationInput
): Promise<FilmAdaptationRow> {
  const settings = await getFilmAdaptationPolicySettings();
  const storyId = String(input.story_id ?? "").trim();
  if (!storyId) throw new FilmAdaptationsError("Thiếu story_id.");

  const currentCount = await countFilmAdaptationsForStory(storyId);
  if (currentCount >= settings.max_films_per_story) {
    throw new FilmAdaptationsError("Đã vượt số lượng phim tối đa cho truyện.");
  }

  const db = await createClient();
  const { payload } = await buildWritePayload(creatorProfile, profileId, input);
  const { data, error } = await db.from("story_film_adaptations").insert(payload).select("*").single();
  if (error) throw new FilmAdaptationsError(error.message);
  return data as FilmAdaptationRow;
}

export async function updateFilmAdaptation(
  profileId: string,
  creatorProfile: CreatorProfile,
  id: string,
  input: FilmAdaptationInput
): Promise<FilmAdaptationRow> {
  const existing = await getFilmAdaptationById(id);
  if (!existing) throw new FilmAdaptationsError("Không tìm thấy phim chuyển thể.");
  await ensureCreatorOwnsStoryForFilm(creatorProfile, existing.story_id);
  if (existing.creator_profile_id !== profileId) {
    throw new FilmAdaptationsError("Bạn không có quyền sửa phim này.");
  }

  const mergedInput: FilmAdaptationInput = {
    ...input,
    story_id: existing.story_id,
    youtube_url: input.youtube_url ?? existing.youtube_url,
    youtube_embed_type: input.youtube_embed_type ?? existing.youtube_embed_type,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    creative_note: input.creative_note ?? existing.creative_note,
    relation_type: input.relation_type ?? existing.relation_type,
    language: input.language ?? existing.language,
    duration_seconds: input.duration_seconds ?? existing.duration_seconds,
    sort_order: input.sort_order ?? existing.sort_order
  };

  const db = await createClient();
  const { payload } = await buildWritePayload(creatorProfile, profileId, mergedInput);
  const { data, error } = await db
    .from("story_film_adaptations")
    .update(payload)
    .eq("id", id)
    .eq("creator_profile_id", profileId)
    .select("*")
    .single();

  if (error) throw new FilmAdaptationsError(error.message);
  return data as FilmAdaptationRow;
}

export async function deleteFilmAdaptation(
  profileId: string,
  creatorProfile: CreatorProfile,
  id: string
): Promise<void> {
  const existing = await getFilmAdaptationById(id);
  if (!existing) throw new FilmAdaptationsError("Không tìm thấy phim chuyển thể.");
  if (existing.status !== "draft") {
    throw new FilmAdaptationsError("Chỉ có thể xóa bản nháp.");
  }
  await ensureCreatorOwnsStoryForFilm(creatorProfile, existing.story_id);
  const db = await createClient();
  const { error } = await db
    .from("story_film_adaptations")
    .delete()
    .eq("id", id)
    .eq("creator_profile_id", profileId);
  if (error) throw new FilmAdaptationsError(error.message);
}

export async function submitFilmAdaptationForReview(
  profileId: string,
  creatorProfile: CreatorProfile,
  id: string
): Promise<FilmAdaptationRow> {
  const existing = await getFilmAdaptationById(id);
  if (!existing) throw new FilmAdaptationsError("Không tìm thấy phim chuyển thể.");
  await ensureCreatorOwnsStoryForFilm(creatorProfile, existing.story_id);

  const db = await createClient();
  const { data, error } = await db
    .from("story_film_adaptations")
    .update({ status: "pending_review", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("creator_profile_id", profileId)
    .select("*")
    .single();

  if (error) throw new FilmAdaptationsError(error.message);
  return data as FilmAdaptationRow;
}

async function publishOrHideFilmAdaptation(
  actorId: string,
  id: string,
  nextStatus: "published" | "hidden"
): Promise<FilmAdaptationRow> {
  const patch =
    nextStatus === "published"
      ? { status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      : { status: "hidden", updated_at: new Date().toISOString() };

  const existing = await getFilmAdaptationById(id);
  if (!existing) {
    throw new FilmAdaptationsError("Không tìm thấy phim chuyển thể.");
  }

  if (existing.creator_profile_id === actorId) {
    const db = await createClient();
    const { data, error } = await db
      .from("story_film_adaptations")
      .update(patch)
      .eq("id", id)
      .eq("creator_profile_id", actorId)
      .select("*")
      .single();
    if (error) throw new FilmAdaptationsError(error.message);
    return data as FilmAdaptationRow;
  }

  const db = await createClient();
  const { data: actorProfile, error: profileError } = await db
    .from("profiles")
    .select("role")
    .eq("id", actorId)
    .maybeSingle();
  if (profileError) {
    throw new FilmAdaptationsError(profileError.message);
  }

  const role = String((actorProfile as { role?: string } | null)?.role ?? "").toLowerCase();
  const isAdmin = role === "admin" || role === "founder";
  if (!isAdmin) {
    throw new FilmAdaptationsError("Bạn không có quyền đổi trạng thái phim này.");
  }

  const client = createAdminClient();
  const { data, error } = await client
    .from("story_film_adaptations")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new FilmAdaptationsError(error.message);
  const row = data as FilmAdaptationRow;
  await logAdminAction({
    action: nextStatus === "published" ? "film_adaptation_published" : "film_adaptation_hidden",
    actorId,
    targetType: "story_film_adaptation",
    targetId: id,
    metadata: { storyId: row.story_id, embedType: row.youtube_embed_type }
  });
  return row;
}

export async function publishFilmAdaptation(
  profileId: string,
  creatorProfile: CreatorProfile,
  id: string
): Promise<FilmAdaptationRow> {
  const existing = await getFilmAdaptationById(id);
  if (!existing) throw new FilmAdaptationsError("Không tìm thấy phim chuyển thể.");
  await ensureCreatorOwnsStoryForFilm(creatorProfile, existing.story_id);
  return publishOrHideFilmAdaptation(profileId, id, "published");
}

export async function hideFilmAdaptation(
  profileId: string,
  creatorProfile: CreatorProfile,
  id: string
): Promise<FilmAdaptationRow> {
  const existing = await getFilmAdaptationById(id);
  if (!existing) throw new FilmAdaptationsError("Không tìm thấy phim chuyển thể.");
  await ensureCreatorOwnsStoryForFilm(creatorProfile, existing.story_id);
  return publishOrHideFilmAdaptation(profileId, id, "hidden");
}
