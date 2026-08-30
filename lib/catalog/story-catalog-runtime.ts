import { buildActiveCatalogFilterChips } from "@/lib/discovery/catalog-active-filters";
import type { CatalogFilterShellRuntime } from "@/lib/catalog/types";
import type { CatalogQuickFilterDef } from "@/lib/catalog/types";
import {
  buildCatalogViewHref,
  getCatalogClearHref,
  type CatalogViewState
} from "@/lib/stories/story-filters";
import type { CatalogFilterOptions } from "@/lib/discovery/types";

export function buildStoryCatalogFilterRuntime(
  state: CatalogViewState,
  filterOptions: CatalogFilterOptions
): CatalogFilterShellRuntime {
  const buildHref = (patch: Record<string, unknown>) => {
    const { q, genre, sort, status, page, ...filterPatch } = patch;
    return buildCatalogViewHref(state, {
      ...filterPatch,
      ...(q !== undefined ? { q: String(q) } : {}),
      ...(genre !== undefined ? { genre: String(genre) } : {}),
      ...(sort !== undefined ? { sort: sort as CatalogViewState["sort"] } : {}),
      ...(status !== undefined ? { status: status as CatalogViewState["status"] } : {}),
      page: typeof page === "number" ? page : 1
    });
  };

  return {
    query: state.query,
    sort: state.sort,
    buildHref,
    isQuickFilterActive(chipId, def) {
      const origin = state.filters.contentOrigin;
      const status = state.status;
      if (chipId === "all") {
        return !origin && status === "all" && !state.filters.hasAudio && !state.filters.hasVideo;
      }
      if (chipId === "origin-original") return origin === "original";
      if (chipId === "origin-translation") return origin === "translation";
      if (chipId === "status-ongoing") return status === "ongoing";
      if (chipId === "status-completed") return status === "completed";
      if (chipId === "has-audio") return state.filters.hasAudio === "yes";
      if (chipId === "has-video") return state.filters.hasVideo === "yes";
      return false;
    },
    activeChips: buildActiveCatalogFilterChips(state.filters, filterOptions, state.query),
    clearAllHref: getCatalogClearHref(state.query),
    hasActiveFilters: buildActiveCatalogFilterChips(state.filters, filterOptions, state.query).length > 0
  };
}
