"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { StoryCatalogFilterDropdown } from "@/components/story-catalog/StoryCatalogFilterDropdown";
import { hasAdvancedCatalogFilters, type CatalogViewState } from "@/lib/stories/story-filters";
import type { CatalogFilterOptions } from "@/lib/discovery/types";
import type { StoryCatalogGenre } from "@/types/story";

const StoryCatalogMobileFilterSheet = dynamic(
  () =>
    import("@/components/story-catalog/StoryCatalogMobileFilterSheet").then(
      (mod) => mod.StoryCatalogMobileFilterSheet
    ),
  { loading: () => null }
);

type StoryCatalogAdvancedFiltersProps = CatalogViewState & {
  filterOptions: CatalogFilterOptions;
  genres: StoryCatalogGenre[];
  hideAccessFilters?: boolean;
  hideMonetizationFilters?: boolean;
};

function resolveActiveName(
  slug: string | undefined,
  options: Array<{ slug: string; name: string }>
) {
  if (!slug) return null;
  return options.find((item) => item.slug === slug)?.name ?? slug;
}

export function StoryCatalogAdvancedFilters({
  filterOptions,
  filters,
  genre,
  genres,
  hideAccessFilters = false,
  hideMonetizationFilters = false,
  query,
  sort,
  status
}: StoryCatalogAdvancedFiltersProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const state: CatalogViewState = { filters, genre, query, sort, status };
  const advancedActive = hasAdvancedCatalogFilters(state);
  const genreActiveName = resolveActiveName(genre || filters.genre, genres);

  return (
    <>
      <div className="hidden flex-wrap items-center gap-1.5 lg:flex">
        <StoryCatalogFilterDropdown
          activeName={genreActiveName}
          label="Thể loại"
          options={genres.map((item) => ({ slug: item.slug, name: item.name }))}
          paramKey="genre"
          searchable
          state={state}
        />
        <StoryCatalogFilterDropdown
          activeName={resolveActiveName(filters.experience, filterOptions.experiences)}
          label="Cảm giác"
          options={filterOptions.experiences}
          paramKey="experience"
          state={state}
        />
        <StoryCatalogFilterDropdown
          activeName={resolveActiveName(filters.setting, filterOptions.settings)}
          label="Bối cảnh"
          options={filterOptions.settings}
          paramKey="setting"
          searchable
          state={state}
        />
        <StoryCatalogFilterDropdown
          activeName={resolveActiveName(filters.presentation, filterOptions.presentations)}
          label="Format"
          options={filterOptions.presentations}
          paramKey="presentation"
          state={state}
        />
        <StoryCatalogFilterDropdown
          activeName={resolveActiveName(filters.tag, filterOptions.tags)}
          label="Tag"
          options={filterOptions.tags}
          paramKey="tag"
          searchable
          state={state}
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
        <StoryCatalogMobileFilterSheet
          filterOptions={filterOptions}
          filters={filters}
          genre={genre}
          genres={genres}
          hideAccessFilters={hideAccessFilters}
          hideMonetizationFilters={hideMonetizationFilters}
          onClose={() => setSheetOpen(false)}
          open={sheetOpen}
          query={query}
          sort={sort}
          status={status}
        />
      ) : null}
    </>
  );
}
