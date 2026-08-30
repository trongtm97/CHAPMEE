import { buildMediaActiveChips } from "@/lib/catalog/media-catalog-filter-config";
import type { CatalogFilterOptions } from "@/lib/discovery/types";
import type { CatalogFilterShellRuntime } from "@/lib/catalog/types";
import type { CatalogQuickFilterDef } from "@/lib/catalog/types";
import {
  buildMediaHubHref,
  hasActiveMediaFilters,
  type MediaHubParams
} from "@/lib/media/media-query-params";

export function buildMediaCatalogFilterRuntime(
  params: MediaHubParams,
  filterOptions?: CatalogFilterOptions
): CatalogFilterShellRuntime {
  const buildHref = (patch: Record<string, unknown>) =>
    buildMediaHubHref(params.tab, { ...params, ...patch, page: (patch.page as number) ?? 1 });

  return {
    query: params.q,
    sort: params.sort,
    buildHref,
    isQuickFilterActive(chipId, def: CatalogQuickFilterDef) {
      if (chipId === "audio-all") return params.audioSource === "all" && params.sort === "new";
      if (chipId === "video-all") return params.videoFilter === "all" && !params.relation;
      if (chipId === "video-adaptation") {
        return params.relation === "official_adaptation";
      }
      if (chipId === "audio-continuous") return params.audioSource === "continuous";
      if (def.patch.origin && params.origin === def.patch.origin) return true;
      if (def.patch.status && params.status === def.patch.status) return true;
      return false;
    },
    activeChips: buildMediaActiveChips(
      params,
      (patch) => buildMediaHubHref(params.tab, { ...params, ...patch }),
      filterOptions
    ),
    clearAllHref: buildMediaHubHref(params.tab, {
      tab: params.tab,
      page: 1,
      sort: "new",
      q: "",
      origin: undefined,
      status: undefined,
      genre: undefined,
      subgenre: undefined,
      tag: undefined,
      character: undefined,
      relationship: undefined,
      narrativeStyle: undefined,
      mood: undefined,
      setting: undefined,
      format: undefined,
      contentType: undefined,
      ageRating: undefined,
      contentWarning: undefined,
      storyStatus: undefined,
      relation: undefined,
      audioSource: "all",
      videoFilter: "all",
      pageSize: params.pageSize
    }),
    hasActiveFilters: hasActiveMediaFilters(params)
  };
}
