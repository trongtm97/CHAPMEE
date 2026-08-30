import {
  defaultFilmAdaptationPolicySettings,
  type FilmAdaptationPolicySettings
} from "@/lib/settings/film-adaptation-settings";
import { getFilmRelationLabel } from "@/src/lib/film-adaptations/film-labels";
import { validateYoutubeFilmUrl } from "@/src/lib/film-adaptations/youtube";

export { getFilmRelationLabel, getFilmStatusLabel } from "@/src/lib/film-adaptations/film-labels";

type MaybeValue = string | number | boolean | null | undefined;

export type FilmStoryLike = {
  id?: string | null;
  storyId?: string | null;
  content_origin?: string | null;
  contentOrigin?: string | null;
  rights_status?: string | null;
  rightsStatus?: string | null;
  status?: string | null;
  isPublished?: boolean | null;
};

export type FilmAdaptationLike = {
  story_id?: string | null;
  chapter_id?: string | null;
  youtube_url?: string | null;
  youtube_video_id?: string | null;
  youtube_playlist_id?: string | null;
  youtube_embed_type?: "video" | "playlist" | string | null;
  relation_type?: string | null;
  status?: string | null;
  rights_status?: string | null;
  ads_policy?: "inherit" | "ads_allowed" | "ads_disabled" | "pending_review" | string | null;
  is_free?: boolean | null;
  price?: number | null;
  price_coins?: number | null;
  coin_unlock_price?: number | null;
  unlock_type?: string | null;
  background_playback_allowed?: boolean | null;
  audio_only?: boolean | null;
  source_type?: string | null;
};

export type FilmProfileLike = {
  id?: string | null;
  isAdmin?: boolean | null;
  isCreator?: boolean | null;
  isTrustedCreator?: boolean | null;
};

export type FilmAdaptationPolicyResult = {
  enabled: boolean;
  canCreate: boolean;
  youtubeOnly: boolean;
  mustBeLinkedToStory: boolean;
  storyLevelOnly: boolean;
  mustBeFree: boolean;
  canShowAds: boolean;
  canUseYoutubeVideo: boolean;
  canUseYoutubePlaylist: boolean;
  reasonCodes: string[];
  publicBadges: string[];
};

function resolveSettings(settings?: FilmAdaptationPolicySettings): FilmAdaptationPolicySettings {
  return settings ?? defaultFilmAdaptationPolicySettings;
}

function isTruthyNumber(value: MaybeValue): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonEmpty(value: MaybeValue): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function resolveStoryId(value: FilmStoryLike | FilmAdaptationLike | null | undefined): string | null {
  if (!value) return null;
  const id = (value as FilmAdaptationLike).story_id ?? (value as FilmStoryLike).id ?? (value as FilmStoryLike).storyId;
  return isNonEmpty(id) ? id.trim() : null;
}

function resolveStoryOrigin(story?: FilmStoryLike | null): string {
  return String(story?.content_origin ?? story?.contentOrigin ?? "original").toLowerCase();
}

function resolveRightsStatus(story?: FilmStoryLike | null, film?: FilmAdaptationLike | null): string {
  return String(film?.rights_status ?? story?.rights_status ?? story?.rightsStatus ?? "self_declared").toLowerCase();
}

function isStoryPublished(story?: FilmStoryLike | null): boolean {
  if (!story) return false;
  if (story.isPublished === true) return true;
  return String(story.status ?? "").toLowerCase() === "published";
}

export function canUseYoutubeForFilm(url: string, settings?: FilmAdaptationPolicySettings): boolean {
  return validateYoutubeFilmUrl(url, resolveSettings(settings)).ok;
}

export function assertFilmMustBeLinkedToStory(
  input: FilmAdaptationLike,
  settings?: FilmAdaptationPolicySettings
): void {
  const config = resolveSettings(settings);
  if (!config.require_linked_story) {
    return;
  }
  if (!resolveStoryId(input)) {
    throw new Error("FILM_POLICY_REQUIRE_STORY_ID");
  }
}

export function assertFilmIsStoryLevelOnly(
  input: FilmAdaptationLike,
  settings?: FilmAdaptationPolicySettings
): void {
  const config = resolveSettings(settings);
  if (config.allow_story_level_only && !config.allow_chapter_level_linking && isNonEmpty(input.chapter_id ?? null)) {
    throw new Error("FILM_POLICY_CHAPTER_LEVEL_FORBIDDEN");
  }
}

export function assertFilmIsFree(input: FilmAdaptationLike, settings?: FilmAdaptationPolicySettings): void {
  const config = resolveSettings(settings);
  if (config.film_must_be_free && input.is_free === false) {
    throw new Error("FILM_POLICY_MUST_BE_FREE");
  }
  if (!config.paid_film_enabled) {
    const hasPaidFields =
      isTruthyNumber(input.price) ||
      isTruthyNumber(input.price_coins) ||
      isTruthyNumber(input.coin_unlock_price) ||
      isNonEmpty(input.unlock_type);
    if (hasPaidFields) {
      throw new Error("FILM_POLICY_PAID_FILM_DISABLED");
    }
  }
  if (!config.coin_unlock_film_enabled && (isTruthyNumber(input.coin_unlock_price) || isNonEmpty(input.unlock_type))) {
    throw new Error("FILM_POLICY_COIN_UNLOCK_DISABLED");
  }
}

export function assertYoutubeOnly(input: FilmAdaptationLike, settings?: FilmAdaptationPolicySettings): void {
  const config = resolveSettings(settings);
  if (!config.film_adaptations_enabled) {
    throw new Error("FILM_POLICY_DISABLED");
  }
  if (input.audio_only === true) {
    throw new Error("FILM_POLICY_AUDIO_ONLY_FORBIDDEN");
  }
  if (input.background_playback_allowed === true) {
    throw new Error("FILM_POLICY_BACKGROUND_PLAYBACK_FORBIDDEN");
  }
  if (isNonEmpty(input.source_type ?? null) && String(input.source_type).toLowerCase() !== "youtube") {
    throw new Error("FILM_POLICY_YOUTUBE_ONLY");
  }
  const validation = validateYoutubeFilmUrl(input.youtube_url ?? "", config);
  if (!validation.ok) {
    throw new Error(`FILM_POLICY_YOUTUBE_URL_INVALID:${validation.reasonCode ?? "unknown"}`);
  }
}

export function canCreateFilmAdaptation(
  profile: FilmProfileLike,
  story: FilmStoryLike,
  settings?: FilmAdaptationPolicySettings
): boolean {
  const config = resolveSettings(settings);
  if (!config.film_adaptations_enabled && !profile.isAdmin) return false;
  if (!resolveStoryId(story)) return false;
  if (config.require_linked_story && !resolveStoryId(story)) return false;
  if (!isStoryPublished(story) && !profile.isAdmin) return false;
  if (profile.isAdmin) return true;
  return profile.isCreator === true;
}

export function canPublishFilmAdaptation(
  profile: FilmProfileLike,
  story: FilmStoryLike,
  filmInput: FilmAdaptationLike,
  settings?: FilmAdaptationPolicySettings
): boolean {
  const config = resolveSettings(settings);
  if (!canCreateFilmAdaptation(profile, story, config)) return false;
  try {
    assertFilmMustBeLinkedToStory(filmInput, config);
    assertFilmIsStoryLevelOnly(filmInput, config);
    assertFilmIsFree(filmInput, config);
    assertYoutubeOnly(filmInput, config);
  } catch {
    return false;
  }
  if (profile.isAdmin) return true;
  if (config.require_admin_review_for_youtube) return false;
  if (config.auto_publish_for_trusted_creators && profile.isTrustedCreator) return true;
  return false;
}

export function canShowAdsOnFilmAdaptation(
  story: FilmStoryLike,
  film: FilmAdaptationLike,
  settings?: FilmAdaptationPolicySettings
): boolean {
  const config = resolveSettings(settings);
  if (!config.film_adaptations_enabled) return false;
  if (!config.film_ads_enabled) return false;
  if (film.ads_policy === "ads_disabled" || film.ads_policy === "pending_review") return false;
  if (!config.youtube_embed_ads_on_film_pages_enabled) return false;

  const origin = resolveStoryOrigin(story);
  const rights = resolveRightsStatus(story, film);

  if (origin === "translation" || origin === "translated") {
    if (
      config.translated_story_film_ads_requires_verified_rights &&
      rights !== "verified" &&
      !config.translated_story_film_ads_allowed_when_unverified
    ) {
      return false;
    }
  } else if (!config.original_story_film_ads_allowed) {
    return false;
  }

  if (!["self_declared", "verified"].includes(rights)) {
    return false;
  }
  return true;
}

export function getFilmPublicBadges(
  story: FilmStoryLike,
  film: FilmAdaptationLike,
  settings?: FilmAdaptationPolicySettings
): string[] {
  const config = resolveSettings(settings);
  const badges = ["YouTube", getFilmRelationLabel(film.relation_type)];
  if (canShowAdsOnFilmAdaptation(story, film, config)) {
    badges.push("Có quảng cáo");
  }
  if (config.show_creative_disclaimer) {
    badges.push("Có ghi chú sáng tạo");
  }
  return badges;
}

export function getFilmAdaptationCapabilities(
  story: FilmStoryLike,
  film?: FilmAdaptationLike,
  settings?: FilmAdaptationPolicySettings
): FilmAdaptationPolicyResult {
  const config = resolveSettings(settings);
  const reasonCodes: string[] = [];

  if (!config.film_adaptations_enabled) reasonCodes.push("film_adaptations_disabled");
  if (config.require_linked_story && !resolveStoryId(story)) reasonCodes.push("story_required");
  if (config.allow_story_level_only && !config.allow_chapter_level_linking) reasonCodes.push("story_level_only");
  if (config.film_must_be_free) reasonCodes.push("free_only");
  if (config.film_adaptations_youtube_only) reasonCodes.push("youtube_only");

  if (film) {
    try {
      assertFilmMustBeLinkedToStory(film, config);
      assertFilmIsStoryLevelOnly(film, config);
      assertFilmIsFree(film, config);
      assertYoutubeOnly(film, config);
    } catch (error) {
      reasonCodes.push(error instanceof Error ? error.message : "film_invalid");
    }
  }

  const canShowAds = film ? canShowAdsOnFilmAdaptation(story, film, config) : false;
  if (!canShowAds) reasonCodes.push("ads_disabled");

  return {
    enabled: config.film_adaptations_enabled,
    canCreate: config.film_adaptations_enabled && Boolean(resolveStoryId(story)) && isStoryPublished(story),
    youtubeOnly: config.film_adaptations_youtube_only,
    mustBeLinkedToStory: config.require_linked_story,
    storyLevelOnly: config.allow_story_level_only && !config.allow_chapter_level_linking,
    mustBeFree: config.film_must_be_free,
    canShowAds,
    canUseYoutubeVideo: config.allow_youtube_video,
    canUseYoutubePlaylist: config.allow_youtube_playlist,
    reasonCodes: [...new Set(reasonCodes)],
    publicBadges: film ? getFilmPublicBadges(story, film, config) : []
  };
}
