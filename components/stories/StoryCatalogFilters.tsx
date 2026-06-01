"use client";

import Link from "next/link";
import { useState } from "react";
import { CatalogActiveFilterChips } from "@/components/stories/CatalogActiveFilterChips";
import { StoryFilterSheet } from "@/components/stories/StoryFilterSheet";
import { StorySortControl } from "@/components/stories/StorySortControl";
import {
  buildCatalogHref,
  getGenreDisplayName,
  hasAdvancedCatalogFilters
} from "@/lib/stories/catalog-url";
import { AppSearchField } from "@/components/ui/AppSearchField";
import type { CatalogFilterOptions, StoryCatalogFilterParams } from "@/lib/discovery/types";
import type { StoryCatalogGenre, StoryCatalogSort, StoryCatalogStatus } from "@/types/story";

type StoryCatalogFiltersProps = {
  query: string;
  genre: string;
  status: StoryCatalogStatus;
  sort: StoryCatalogSort;
  genres: StoryCatalogGenre[];
  filters: StoryCatalogFilterParams;
  filterOptions: CatalogFilterOptions;
  featuredGenreSlugs?: string[];
};

function FilterChip({
  active,
  children,
  href
}: {
  active: boolean;
  children: string;
  href: string;
}) {
  return (
    <Link
      className={`whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition ${
        active
          ? "border-cyan-300/50 bg-cyan-300/20 text-cyan-100"
          : "border-white/10 text-zinc-300 hover:border-white/20"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}

export function StoryCatalogFilters({
  featuredGenreSlugs = [],
  filterOptions,
  filters,
  genre,
  genres,
  query,
  sort,
  status
}: StoryCatalogFiltersProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const genreMap = new Map(genres.map((item) => [item.slug, item.name]));
  const chipSlugs = ["", ...featuredGenreSlugs.filter(Boolean)];
  const filterActive = hasAdvancedCatalogFilters(
    { ...filters, q: query, genre, status, sort },
    featuredGenreSlugs
  );
  const activeGenreLabel = getGenreDisplayName(genre, genres);

  return (
    <>
      <form action="/truyen" className="chap-card-soft space-y-2 p-2.5">
        <AppSearchField defaultValue={query} name="q" placeholder="Tìm truyện, thể loại, tag…" />

        <div className="flex items-center gap-2">
          <button
            className={`relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition ${
              filterActive
                ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                : "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
            }`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setSheetOpen(true);
            }}
            type="button"
          >
            Bộ lọc
            {filterActive ? (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-cyan-300" />
            ) : null}
          </button>
          <div className="min-w-0 flex-1">
            <StorySortControl currentSort={sort} filters={filters} />
          </div>
        </div>

        {genre ? <p className="truncate text-[11px] text-cyan-200">Đang chọn: {activeGenreLabel}</p> : null}

        <div className="no-scrollbar -mx-0.5 overflow-x-auto px-0.5">
          <div className="flex min-w-max gap-1.5 pb-0.5">
            {chipSlugs.map((slug) => (
              <FilterChip
                active={genre === slug}
                href={buildCatalogHref({ ...filters, q: query, genre: slug || undefined, sort, status, page: 1 })}
                key={slug || "all"}
              >
                {slug ? (genreMap.get(slug) ?? slug) : "Tất cả"}
              </FilterChip>
            ))}
            <button
              className="whitespace-nowrap rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-100"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setSheetOpen(true);
              }}
              type="button"
            >
              + Thêm
            </button>
          </div>
        </div>

        <CatalogActiveFilterChips filterOptions={filterOptions} filters={filters} query={query} />
      </form>

      <StoryFilterSheet
        filterOptions={filterOptions}
        filters={filters}
        genre={genre}
        genres={genres}
        onClose={() => setSheetOpen(false)}
        open={sheetOpen}
        query={query}
        sort={sort}
        status={status}
      />
    </>
  );
}
