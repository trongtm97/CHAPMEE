import { buildActiveCatalogFilterChips } from "@/lib/discovery/catalog-active-filters";
import type { CatalogFilterOptions, StoryCatalogFilterParams } from "@/lib/discovery/types";
import type { MediaHubParams } from "@/lib/media/media-query-params";
import { hasAdvancedCatalogFilters, type CatalogViewState } from "@/lib/stories/story-filters";
import type { StoryCatalogGenre, StoryCatalogSort, StoryCatalogStatus } from "@/types/story";

/** Map /media URL state to catalog taxonomy filters (same slugs as /truyen). */
export function mediaParamsToCatalogFilters(params: MediaHubParams): StoryCatalogFilterParams {
  return {
    q: params.q || undefined,
    genre: params.genre,
    subgenre: params.subgenre,
    tag: params.tag,
    character: params.character,
    relationship: params.relationship,
    narrativeStyle: params.narrativeStyle,
    setting: params.setting,
    experience: params.mood,
    presentation: params.format,
    contentType: params.contentType,
    ageRating: params.ageRating,
    contentWarning: params.contentWarning,
    storyStatus: params.storyStatus,
    contentOrigin: params.origin,
    status: params.status
  };
}

export function catalogFiltersToMediaPatch(
  filters: StoryCatalogFilterParams
): Partial<MediaHubParams> {
  return {
    genre: filters.genre,
    subgenre: filters.subgenre,
    tag: filters.tag,
    character: filters.character,
    relationship: filters.relationship,
    narrativeStyle: filters.narrativeStyle,
    setting: filters.setting,
    mood: filters.experience,
    format: filters.presentation,
    contentType: filters.contentType,
    ageRating: filters.ageRating,
    contentWarning: filters.contentWarning,
    storyStatus: filters.storyStatus,
    origin: filters.contentOrigin,
    status:
      filters.status === "ongoing" || filters.status === "completed" ? filters.status : undefined
  };
}

const CATALOG_CHIP_CLEAR_KEYS: Record<string, keyof StoryCatalogFilterParams> = {
  subgenre: "subgenre",
  tag: "tag",
  character: "character",
  relationship: "relationship",
  narrativeStyle: "narrativeStyle",
  setting: "setting",
  experience: "experience",
  presentation: "presentation",
  contentType: "contentType",
  ageRating: "ageRating",
  contentWarning: "contentWarning",
  storyStatus: "storyStatus",
  monetization: "monetization",
  access: "access",
  hasWarning: "hasWarning",
  hasNewChapter: "hasNewChapter"
};

export function clearMediaCatalogChip(
  params: MediaHubParams,
  chipKey: string
): Partial<MediaHubParams> {
  const catalogKey = CATALOG_CHIP_CLEAR_KEYS[chipKey];
  if (!catalogKey) {
    return { page: 1 };
  }
  const filters = mediaParamsToCatalogFilters(params);
  delete filters[catalogKey];
  return { ...catalogFiltersToMediaPatch(filters), page: 1 };
}

export function hasMediaAdvancedCatalogFilters(params: MediaHubParams) {
  const state: CatalogViewState = {
    filters: mediaParamsToCatalogFilters(params),
    genre: params.genre ?? "",
    query: params.q,
    sort: "updated" as StoryCatalogSort,
    status: (params.status ?? "all") as StoryCatalogStatus
  };
  return hasAdvancedCatalogFilters(state);
}

export function buildMediaTaxonomyActiveChips(
  params: MediaHubParams,
  filterOptions: CatalogFilterOptions,
  buildHref: (patch: Partial<MediaHubParams>) => string
) {
  const filters = mediaParamsToCatalogFilters(params);
  return buildActiveCatalogFilterChips(filters, filterOptions, params.q).map((chip) => ({
    key: chip.key,
    label: chip.label,
    clearHref: buildHref(clearMediaCatalogChip(params, chip.key))
  }));
}

export function genresFromFilterOptions(
  filterOptions: CatalogFilterOptions
): StoryCatalogGenre[] {
  return filterOptions.genres.map((genre) => ({
    slug: genre.slug,
    name: genre.name,
    storyCount: genre.storyCount ?? 0
  }));
}

export function hasMediaTaxonomyFilters(params: MediaHubParams) {
  return Boolean(
    params.genre ||
      params.subgenre ||
      params.tag ||
      params.character ||
      params.relationship ||
      params.narrativeStyle ||
      params.mood ||
      params.setting ||
      params.format ||
      params.contentType ||
      params.ageRating ||
      params.contentWarning ||
      params.storyStatus
  );
}
