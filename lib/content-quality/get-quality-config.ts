import { unstable_cache } from "next/cache";
import { fetchAppSettingByKey } from "@/lib/supabase/app-settings";
import type { ContentQualityConfig } from "@/types/content-quality";

export const CONTENT_QUALITY_SETTINGS_KEY = "content_quality_settings";
export const CONTENT_QUALITY_SETTINGS_CACHE_TAG = "content-quality-settings";

const DEFAULT_CONFIG: ContentQualityConfig = {
  earlyDropThreshold: 0.55,
  lowRatingThreshold: 2.5,
  minContentWordsChapter: 300,
  minContentWordsStory: 80,
  minRatingsForQualityAction: 10,
  minReportsForReview: 3,
  requireModeratorConfirmationForPenalty: true
};

function parseConfig(value: unknown): ContentQualityConfig {
  const raw =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  const num = (key: keyof ContentQualityConfig, fallback: number) => {
    const parsed = Number(raw[key]);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const bool = (key: keyof ContentQualityConfig, fallback: boolean) => {
    const v = raw[key];
    if (typeof v === "boolean") {
      return v;
    }
    return fallback;
  };

  return {
    earlyDropThreshold: num("earlyDropThreshold", DEFAULT_CONFIG.earlyDropThreshold),
    lowRatingThreshold: num("lowRatingThreshold", DEFAULT_CONFIG.lowRatingThreshold),
    minContentWordsChapter: num(
      "minContentWordsChapter",
      DEFAULT_CONFIG.minContentWordsChapter
    ),
    minContentWordsStory: num("minContentWordsStory", DEFAULT_CONFIG.minContentWordsStory),
    minRatingsForQualityAction: num(
      "minRatingsForQualityAction",
      DEFAULT_CONFIG.minRatingsForQualityAction
    ),
    minReportsForReview: num("minReportsForReview", DEFAULT_CONFIG.minReportsForReview),
    requireModeratorConfirmationForPenalty: bool(
      "requireModeratorConfirmationForPenalty",
      DEFAULT_CONFIG.requireModeratorConfirmationForPenalty
    )
  };
}

async function loadQualityConfig(): Promise<ContentQualityConfig> {
  const row = await fetchAppSettingByKey(CONTENT_QUALITY_SETTINGS_KEY);

  if (!row?.value) {
    return DEFAULT_CONFIG;
  }

  return parseQualityConfigDb(row.value);
}

const getCachedQualityConfig = unstable_cache(
  loadQualityConfig,
  ["content-quality-settings"],
  { revalidate: 300, tags: [CONTENT_QUALITY_SETTINGS_CACHE_TAG] }
);

export async function getQualityConfig(options?: {
  useCache?: boolean;
}): Promise<ContentQualityConfig> {
  if (options?.useCache === false) {
    return loadQualityConfig();
  }

  return getCachedQualityConfig();
}

/** Map snake_case keys from DB seed to camelCase config. */
export function parseQualityConfigDb(value: unknown): ContentQualityConfig {
  const raw =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  const num = (snake: string, camel: keyof ContentQualityConfig, fallback: number) => {
    const parsed = Number(raw[snake] ?? raw[camel]);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const bool = (snake: string, camel: keyof ContentQualityConfig, fallback: boolean) => {
    const v = raw[snake] ?? raw[camel];
    if (typeof v === "boolean") {
      return v;
    }
    return fallback;
  };

  return {
    earlyDropThreshold: num(
      "early_drop_threshold",
      "earlyDropThreshold",
      DEFAULT_CONFIG.earlyDropThreshold
    ),
    lowRatingThreshold: num(
      "low_rating_threshold",
      "lowRatingThreshold",
      DEFAULT_CONFIG.lowRatingThreshold
    ),
    minContentWordsChapter: num(
      "min_content_words_chapter",
      "minContentWordsChapter",
      DEFAULT_CONFIG.minContentWordsChapter
    ),
    minContentWordsStory: num(
      "min_content_words_story",
      "minContentWordsStory",
      DEFAULT_CONFIG.minContentWordsStory
    ),
    minRatingsForQualityAction: num(
      "min_ratings_for_quality_action",
      "minRatingsForQualityAction",
      DEFAULT_CONFIG.minRatingsForQualityAction
    ),
    minReportsForReview: num(
      "min_reports_for_review",
      "minReportsForReview",
      DEFAULT_CONFIG.minReportsForReview
    ),
    requireModeratorConfirmationForPenalty: bool(
      "require_moderator_confirmation_for_penalty",
      "requireModeratorConfirmationForPenalty",
      DEFAULT_CONFIG.requireModeratorConfirmationForPenalty
    )
  };
}
