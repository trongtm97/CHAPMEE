import { buildCatalogHref, catalogHasDeepFilters } from "@/lib/discovery/catalog-url";
import { buildActiveCatalogFilterChips } from "@/lib/discovery/catalog-active-filters";
import type { CatalogFilterOptions, StoryCatalogFilterParams } from "@/lib/discovery/types";
import type { StoryCatalogGenre, StoryCatalogSort, StoryCatalogStatus } from "@/types/story";

export type CatalogViewState = {
  filters: StoryCatalogFilterParams;
  query: string;
  genre: string;
  sort: StoryCatalogSort;
  status: StoryCatalogStatus;
};

export function buildCatalogViewHref(
  state: CatalogViewState,
  patch: Partial<StoryCatalogFilterParams> & {
    q?: string;
    genre?: string;
    sort?: StoryCatalogSort;
    status?: StoryCatalogStatus;
    page?: number;
  } = {}
) {
  const { q, genre, sort, status, page, ...filterPatch } = patch;
  return buildCatalogHref({
    ...state.filters,
    ...filterPatch,
    q: q !== undefined ? q : state.query || state.filters.q,
    genre: genre !== undefined ? genre : state.genre || state.filters.genre,
    sort: sort ?? state.sort,
    status: status ?? state.status,
    page: page ?? 1
  });
}

export function getCatalogClearHref(query = "") {
  return query.trim() ? buildCatalogHref({ q: query.trim() }) : "/truyen";
}

export function hasTopBarCatalogFilters(state: CatalogViewState, featuredGenreSlugs: string[] = []) {
  const featured = new Set(["", ...featuredGenreSlugs.filter(Boolean)]);
  return (
    catalogHasDeepFilters({ ...state.filters, q: state.query }) ||
    Boolean(state.filters.contentOrigin) ||
    Boolean(state.filters.status && state.filters.status !== "all") ||
    Boolean(state.filters.hasAudio) ||
    Boolean(state.filters.hasVideo) ||
    Boolean(state.genre && !featured.has(state.genre)) ||
    Boolean(state.sort && state.sort !== "updated")
  );
}

export function buildCatalogFilterSummaryLine(
  state: CatalogViewState,
  filterOptions: CatalogFilterOptions,
  genres: StoryCatalogGenre[]
): string | null {
  const parts: string[] = [];

  if (state.filters.contentOrigin === "original") {
    parts.push("Truyện sáng tác");
  } else if (state.filters.contentOrigin === "translation") {
    parts.push("Truyện dịch");
  }

  if (state.genre) {
    const match = genres.find((item) => item.slug === state.genre);
    parts.push(match?.name ?? state.genre);
  }

  if (state.filters.status === "ongoing") {
    parts.push("Đang ra");
  } else if (state.filters.status === "completed") {
    parts.push("Hoàn thành");
  }

  if (state.filters.hasAudio === "yes") {
    parts.push("Có audio");
  }
  if (state.filters.hasVideo === "yes") {
    parts.push("Có video");
  }

  const chips = buildActiveCatalogFilterChips(state.filters, filterOptions, state.query);
  for (const chip of chips) {
    const label = chip.label.replace(/^[^:]+:\s*/, "");
    if (!parts.includes(label)) {
      parts.push(label);
    }
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" · ");
}

export function toggleTriStateFilter(
  state: CatalogViewState,
  key: "hasAudio" | "hasVideo",
  enabledValue: "yes" = "yes"
) {
  const current = state.filters[key];
  return buildCatalogViewHref(state, {
    [key]: current === enabledValue ? undefined : enabledValue
  });
}

export function toggleStatusFilter(state: CatalogViewState, target: "ongoing" | "completed") {
  const next = state.status === target ? "all" : target;
  return buildCatalogViewHref(state, { status: next });
}

export function hasAdvancedCatalogFilters(state: CatalogViewState) {
  const { filters, genre } = state;
  return Boolean(
    genre ||
      filters.experience ||
      filters.setting ||
      filters.presentation ||
      filters.tag ||
      filters.subgenre ||
      filters.character ||
      filters.relationship ||
      filters.narrativeStyle ||
      filters.contentType ||
      filters.ageRating ||
      filters.monetization ||
      filters.contentWarning ||
      filters.storyStatus ||
      filters.access ||
      filters.hasWarning ||
      filters.hasNewChapter
  );
}

export function setOriginFilter(
  state: CatalogViewState,
  origin: "original" | "translation" | undefined
) {
  return buildCatalogViewHref(state, { contentOrigin: origin });
}
