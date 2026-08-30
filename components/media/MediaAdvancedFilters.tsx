"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MediaFilterDropdown } from "@/components/media/MediaFilterDropdown";
import {
  catalogFiltersToMediaPatch,
  genresFromFilterOptions,
  hasMediaAdvancedCatalogFilters,
  mediaParamsToCatalogFilters
} from "@/lib/media/media-catalog-filter-bridge";
import { buildMediaHubHref, type MediaHubParams } from "@/lib/media/media-query-params";
import type { CatalogFilterFacet, CatalogFilterOptions } from "@/lib/discovery/types";
import type { StoryCatalogSort, StoryCatalogStatus } from "@/types/story";

const StoryFilterSheet = dynamic(
  () => import("@/components/stories/StoryFilterSheet").then((mod) => mod.StoryFilterSheet),
  { loading: () => null }
);

type MediaAdvancedFiltersProps = {
  params: MediaHubParams;
  filterOptions: CatalogFilterOptions;
};

function resolveActiveName(slug: string | undefined, options: CatalogFilterFacet[]) {
  if (!slug) return null;
  return options.find((item) => item.slug === slug)?.name ?? slug;
}

export function hasMediaAdvancedFilters(params: MediaHubParams) {
  return hasMediaAdvancedCatalogFilters(params);
}

export function MediaAdvancedFilters({ params, filterOptions }: MediaAdvancedFiltersProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const advancedActive = hasMediaAdvancedCatalogFilters(params);
  const genres = genresFromFilterOptions(filterOptions);
  const catalogFilters = mediaParamsToCatalogFilters(params);

  const genreOptions = filterOptions.genres.map((item) => ({
    slug: item.slug,
    name: item.name
  }));

  return (
    <>
      <div className="hidden flex-wrap items-center gap-1.5 lg:flex">
        <MediaFilterDropdown
          activeName={resolveActiveName(params.genre, filterOptions.genres)}
          label="Thể loại"
          options={genreOptions}
          paramKey="genre"
          params={params}
          searchable
        />
        <MediaFilterDropdown
          activeName={resolveActiveName(params.mood, filterOptions.experiences)}
          label="Cảm giác"
          options={filterOptions.experiences}
          paramKey="mood"
          params={params}
        />
        <MediaFilterDropdown
          activeName={resolveActiveName(params.setting, filterOptions.settings)}
          label="Bối cảnh"
          options={filterOptions.settings}
          paramKey="setting"
          params={params}
          searchable
        />
        <MediaFilterDropdown
          activeName={resolveActiveName(params.format, filterOptions.presentations)}
          label="Format"
          options={filterOptions.presentations}
          paramKey="format"
          params={params}
        />
        <MediaFilterDropdown
          activeName={resolveActiveName(params.tag, filterOptions.tags)}
          label="Tag"
          options={filterOptions.tags}
          paramKey="tag"
          params={params}
          searchable
        />
      </div>

      <button
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition lg:hidden ${
          advancedActive
            ? "border-cyan-300/45 bg-cyan-300/12 text-cyan-50"
            : "border-white/10 bg-white/[0.03] text-zinc-300"
        }`}
        onClick={() => setSheetOpen(true)}
        type="button"
      >
        Bộ lọc nâng cao
        {advancedActive ? <span className="size-1.5 rounded-full bg-cyan-300" /> : null}
      </button>

      {sheetOpen ? (
        <StoryFilterSheet
          filterOptions={filterOptions}
          filters={catalogFilters}
          genre={params.genre ?? ""}
          genres={genres}
          hideAccessFilters
          hideMonetizationFilters
          onClose={() => setSheetOpen(false)}
          open={sheetOpen}
          query={params.q}
          resolveApplyHref={(draft) =>
            buildMediaHubHref(params.tab, {
              ...params,
              ...catalogFiltersToMediaPatch(draft),
              page: 1
            })
          }
          resolveClearHref={() =>
            buildMediaHubHref(params.tab, {
              tab: params.tab,
              q: params.q,
              sort: params.sort,
              page: 1,
              audioSource: "all",
              videoFilter: "all"
            })
          }
          sort={"updated" as StoryCatalogSort}
          status={(params.status ?? "all") as StoryCatalogStatus}
          variant="media"
        />
      ) : null}
    </>
  );
}
