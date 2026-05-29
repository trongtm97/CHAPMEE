"use client";

import Link from "next/link";
import { useState } from "react";
import { StoryFilterSheet } from "@/components/stories/StoryFilterSheet";
import { StorySortControl } from "@/components/stories/StorySortControl";
import {
  buildCatalogHref,
  featuredGenreLabels,
  featuredGenreSlugs,
  getGenreDisplayName,
  hasAdvancedCatalogFilters,
  resolveCatalogGenres
} from "@/lib/stories/catalog-url";
import { AppSearchField } from "@/components/ui/AppSearchField";
import type { StoryCatalogGenre, StoryCatalogSort, StoryCatalogStatus } from "@/types/story";

type StoryCatalogFiltersProps = {
  query: string;
  genre: string;
  status: StoryCatalogStatus;
  sort: StoryCatalogSort;
  genres: StoryCatalogGenre[];
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

export function StoryCatalogFilters({ genre, genres, query, sort, status }: StoryCatalogFiltersProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const catalogGenres = resolveCatalogGenres(genres);
  const genreMap = new Map(catalogGenres.map((item) => [item.slug, item.name]));
  const filterActive = hasAdvancedCatalogFilters({ q: query, genre, status, sort });
  const activeGenreLabel = getGenreDisplayName(genre, catalogGenres);

  return (
    <>
      <form action="/truyen" className="chap-card-soft space-y-2 p-2.5">
        {genre ? <input name="genre" type="hidden" value={genre} /> : null}
        {status !== "all" ? <input name="status" type="hidden" value={status} /> : null}
        {sort !== "updated" ? <input name="sort" type="hidden" value={sort} /> : null}

        <AppSearchField defaultValue={query} name="q" />

        <div className="flex items-center gap-2">
          <button
            className={`relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition ${
              filterActive || Boolean(genre)
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
            <CategoryIcon />
            Chọn Danh Mục
            {filterActive ? (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-cyan-300" />
            ) : null}
          </button>
          <div className="min-w-0 flex-1">
            <StorySortControl currentSort={sort} genre={genre} query={query} status={status} />
          </div>
        </div>

        {genre ? <p className="truncate text-[11px] text-cyan-200">Đang chọn: {activeGenreLabel}</p> : null}

        <div className="no-scrollbar -mx-0.5 overflow-x-auto px-0.5">
          <div className="flex min-w-max gap-1.5 pb-0.5">
            {featuredGenreSlugs.map((slug) => (
              <FilterChip
                active={genre === slug}
                href={buildCatalogHref({ q: query, genre: slug, sort, status })}
                key={slug || "all"}
              >
                {slug ? (genreMap.get(slug) ?? featuredGenreLabels[slug] ?? slug) : "Tất cả"}
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
      </form>

      <StoryFilterSheet
        genre={genre}
        genres={catalogGenres}
        onClose={() => setSheetOpen(false)}
        open={sheetOpen}
        query={query}
        sort={sort}
        status={status}
      />
    </>
  );
}

function CategoryIcon() {
  return (
    <svg aria-hidden="true" className="size-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path
        d="M5.5 4h3v16h-3A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4ZM10.5 4h4v16h-4V4Zm6 0h2A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-2V4Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
