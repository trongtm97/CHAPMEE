import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import type { FeedCandidate, FeedSurface } from "@/types/feed-mixer";

export type ContentOriginMixSettings = {
  originalMinExposurePercent: number;
  translationMaxExposurePercent: number;
  reelsOriginalMinPercent: number;
  reelsTranslationMaxPercent: number;
  discoverOriginalFeaturedMinPercent: number;
  translationRequiresRightsForPromotion: boolean;
  separateRankingsEnabled: boolean;
  contentOriginFairnessEnabled: boolean;
};

const DEFAULTS: ContentOriginMixSettings = {
  originalMinExposurePercent: 60,
  translationMaxExposurePercent: 40,
  reelsOriginalMinPercent: 60,
  reelsTranslationMaxPercent: 40,
  discoverOriginalFeaturedMinPercent: 60,
  translationRequiresRightsForPromotion: false,
  separateRankingsEnabled: true,
  contentOriginFairnessEnabled: true
};

function toNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, parsed));
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export async function loadContentOriginMixSettings(): Promise<ContentOriginMixSettings> {
  const config = await getAlgorithmConfig();
  return {
    originalMinExposurePercent: toNumber(
      config["content_origin.original_min_exposure_percent"],
      DEFAULTS.originalMinExposurePercent
    ),
    translationMaxExposurePercent: toNumber(
      config["content_origin.translation_max_exposure_percent"],
      DEFAULTS.translationMaxExposurePercent
    ),
    reelsOriginalMinPercent: toNumber(
      config["content_origin.reels_original_min_percent"],
      DEFAULTS.reelsOriginalMinPercent
    ),
    reelsTranslationMaxPercent: toNumber(
      config["content_origin.reels_translation_max_percent"],
      DEFAULTS.reelsTranslationMaxPercent
    ),
    discoverOriginalFeaturedMinPercent: toNumber(
      config["content_origin.discover_original_featured_min_percent"],
      DEFAULTS.discoverOriginalFeaturedMinPercent
    ),
    translationRequiresRightsForPromotion: toBoolean(
      config["content_origin.translation_requires_rights_for_promotion"],
      DEFAULTS.translationRequiresRightsForPromotion
    ),
    separateRankingsEnabled: toBoolean(
      config["content_origin.separate_rankings_enabled"],
      DEFAULTS.separateRankingsEnabled
    ),
    contentOriginFairnessEnabled: toBoolean(
      config["content_origin.content_origin_fairness_enabled"],
      DEFAULTS.contentOriginFairnessEnabled
    )
  };
}

export function applyContentOriginFairnessQuota(
  items: FeedCandidate[],
  input: {
    surface: FeedSurface;
    limit: number;
    settings: ContentOriginMixSettings;
  }
) {
  if (!input.settings.contentOriginFairnessEnabled || items.length === 0) {
    return { items, reasons: [] as string[] };
  }

  const originals = items.filter((item) => item.contentOrigin !== "translation");
  const translations = items.filter((item) => item.contentOrigin === "translation");

  const minOriginalPct =
    input.surface === "reels"
      ? input.settings.reelsOriginalMinPercent
      : input.surface === "discover"
        ? input.settings.discoverOriginalFeaturedMinPercent
        : input.settings.originalMinExposurePercent;
  const maxTranslationPct =
    input.surface === "reels"
      ? input.settings.reelsTranslationMaxPercent
      : input.settings.translationMaxExposurePercent;

  const pageSize = Math.max(1, input.limit);
  const minOriginal = Math.ceil((pageSize * minOriginalPct) / 100);
  const maxTranslation = Math.floor((pageSize * maxTranslationPct) / 100);

  const reasons: string[] = [];
  const selected: FeedCandidate[] = [];
  const translationEligible = translations.filter((item) => {
    if (
      input.settings.translationRequiresRightsForPromotion &&
      item.rightsStatus !== "verified"
    ) {
      return false;
    }
    return true;
  });

  const takeOriginal = originals.slice(0, minOriginal);
  for (const item of takeOriginal) {
    selected.push({
      ...item,
      selectionReason: "selected because original quota"
    });
  }
  if (takeOriginal.length < minOriginal) {
    reasons.push("filled fallback due insufficient original candidates");
  }

  const remainingSlots = Math.max(0, pageSize - selected.length);
  const translationCap = Math.max(0, maxTranslation);
  const allowedTranslation = Math.min(translationCap, remainingSlots);
  const takeTranslation = translationEligible.slice(0, allowedTranslation);
  for (const item of takeTranslation) {
    selected.push({
      ...item,
      selectionReason: "selected from translation pool"
    });
  }
  if (translationEligible.length > allowedTranslation) {
    reasons.push("capped translation exposure");
  }

  const usedIds = new Set(selected.map((item) => `${item.itemType}:${item.itemId}`));
  const leftovers = items.filter((item) => !usedIds.has(`${item.itemType}:${item.itemId}`));
  for (const item of leftovers) {
    if (selected.length >= pageSize) break;
    selected.push({
      ...item,
      selectionReason:
        item.contentOrigin === "translation" ? "translation fallback fill" : "original fallback fill"
    });
  }

  return { items: selected, reasons };
}
