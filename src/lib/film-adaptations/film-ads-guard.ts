import {
  getFilmAdaptationPolicySettings,
  type FilmAdaptationPolicySettings
} from "@/lib/settings/film-adaptation-settings";
import {
  canShowAdsOnFilmAdaptation,
  type FilmAdaptationLike,
  type FilmStoryLike
} from "@/src/lib/film-adaptations/film-policy";

export { canShowAdsOnFilmAdaptation };

/**
 * Admin-configured placement keys (see `ad_placements` table).
 * ChapMeeAdSlot resolves enabled placement at runtime — no hard-coded ad HTML.
 */
export const FILM_AD_PLACEMENT_KEYS = {
  storySection: "story_film_section"
} as const;

export type FilmCompanionAdContext = {
  canShowAds: boolean;
  reasonCodes: string[];
};

export type FilmAdRefreshGuardInput = {
  documentHidden: boolean;
  youtubePlayerOpen: boolean;
};

function buildReasonCodes(
  story: FilmStoryLike,
  film: FilmAdaptationLike,
  settings: FilmAdaptationPolicySettings
): string[] {
  const reasons: string[] = [];
  if (!settings.film_adaptations_enabled) reasons.push("film_adaptations_disabled");
  if (!settings.film_ads_enabled) reasons.push("film_ads_disabled");
  if (film.ads_policy === "ads_disabled") reasons.push("item_ads_disabled");
  if (film.ads_policy === "pending_review") reasons.push("item_ads_pending_review");
  if (!settings.youtube_embed_ads_on_film_pages_enabled) {
    reasons.push("youtube_embed_film_ads_disabled");
  }
  const origin = String(story.content_origin ?? story.contentOrigin ?? "original").toLowerCase();
  if (
    (origin === "translation" || origin === "translated") &&
    settings.translated_story_film_ads_requires_verified_rights &&
    !settings.translated_story_film_ads_allowed_when_unverified
  ) {
    const rights = String(
      film.rights_status ?? story.rights_status ?? story.rightsStatus ?? ""
    ).toLowerCase();
    if (rights !== "verified") {
      reasons.push("translation_unverified_ads_disabled");
    }
  }
  if (origin !== "translation" && origin !== "translated" && !settings.original_story_film_ads_allowed) {
    reasons.push("original_story_film_ads_disabled");
  }
  const rights = String(film.rights_status ?? story.rights_status ?? story.rightsStatus ?? "").toLowerCase();
  if (!["self_declared", "verified"].includes(rights)) {
    reasons.push("rights_not_eligible");
  }
  return reasons;
}

export function resolveFilmCompanionAdContext(
  story: FilmStoryLike,
  film: FilmAdaptationLike,
  settings: FilmAdaptationPolicySettings
): FilmCompanionAdContext {
  const canShowAds = canShowAdsOnFilmAdaptation(story, film, settings);
  return {
    canShowAds,
    reasonCodes: canShowAds ? [] : buildReasonCodes(story, film, settings)
  };
}

export async function resolveFilmCompanionAdContextAsync(
  story: FilmStoryLike,
  film: FilmAdaptationLike
): Promise<FilmCompanionAdContext> {
  const settings = await getFilmAdaptationPolicySettings();
  return resolveFilmCompanionAdContext(story, film, settings);
}

/** Avoid ad refresh/remount near an open YouTube iframe or while tab is hidden. */
export function shouldBlockFilmCompanionAdRefresh(input: FilmAdRefreshGuardInput): boolean {
  return input.documentHidden || input.youtubePlayerOpen;
}

export function pickStoryFilmAdRepresentativeItem<
  T extends FilmAdaptationLike & { status?: string | null }
>(items: T[]): T | null {
  const published = items.filter((item) => String(item.status ?? "").toLowerCase() === "published");
  return published[0] ?? null;
}
