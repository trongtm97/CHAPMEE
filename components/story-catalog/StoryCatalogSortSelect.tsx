"use client";

import { useRouter } from "next/navigation";
import { buildCatalogViewHref, type CatalogViewState } from "@/lib/stories/story-filters";
import type { StoryCatalogSort } from "@/types/story";

import { STORY_CATALOG_SORT_OPTIONS } from "@/lib/catalog/story-catalog-filter-config";

export { STORY_CATALOG_SORT_OPTIONS };

type StoryCatalogSortSelectProps = CatalogViewState & {
  allowedSorts?: StoryCatalogSort[];
  className?: string;
};

export function StoryCatalogSortSelect({
  allowedSorts,
  className = "",
  filters,
  genre,
  query,
  sort,
  status
}: StoryCatalogSortSelectProps) {
  const router = useRouter();
  const state: CatalogViewState = { filters, genre, query, sort, status };
  const visibleOptions = allowedSorts?.length
    ? STORY_CATALOG_SORT_OPTIONS.filter((option) => allowedSorts.includes(option.value))
    : STORY_CATALOG_SORT_OPTIONS;
  const safeSort = visibleOptions.some((option) => option.value === sort)
    ? sort
    : (visibleOptions[0]?.value ?? "updated");

  return (
    <label className={`inline-flex min-w-0 items-center gap-2 ${className}`.trim()}>
      <span className="shrink-0 text-[11px] font-medium text-zinc-500">Sắp xếp</span>
      <select
        className="h-9 min-w-[9.5rem] max-w-full rounded-lg border border-white/10 bg-[var(--surface)] px-2.5 text-xs text-zinc-100 outline-none focus:border-cyan-300/50 md:h-10 md:min-w-[11rem] md:text-sm"
        onChange={(event) => {
          router.push(
            buildCatalogViewHref(state, { sort: event.target.value as StoryCatalogSort, page: 1 })
          );
        }}
        value={safeSort}
      >
        {visibleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
