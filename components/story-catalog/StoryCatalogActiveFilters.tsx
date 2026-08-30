import Link from "next/link";
import { buildActiveCatalogFilterChips } from "@/lib/discovery/catalog-active-filters";
import { getCatalogClearHref, type CatalogViewState } from "@/lib/stories/story-filters";
import type { CatalogFilterOptions } from "@/lib/discovery/types";

type StoryCatalogActiveFiltersProps = CatalogViewState & {
  filterOptions: CatalogFilterOptions;
};

export function StoryCatalogActiveFilters({
  filterOptions,
  filters,
  query
}: StoryCatalogActiveFiltersProps) {
  const chips = buildActiveCatalogFilterChips(filters, filterOptions, query);

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] px-2.5 py-2">
      <span className="text-[11px] font-medium text-zinc-500">Đang lọc:</span>
      {chips.map((chip) => (
        <Link
          className="inline-flex items-center gap-1 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-300/15"
          href={chip.clearHref}
          key={chip.key}
        >
          <span>{chip.label}</span>
          <span aria-hidden className="text-cyan-200/80">
            ×
          </span>
        </Link>
      ))}
      <Link
        className="ml-auto text-[11px] font-semibold text-zinc-500 hover:text-zinc-300"
        href={getCatalogClearHref(query)}
      >
        Xóa tất cả
      </Link>
    </div>
  );
}
