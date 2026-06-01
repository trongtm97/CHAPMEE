import Link from "next/link";
import { buildActiveCatalogFilterChips } from "@/lib/discovery/catalog-active-filters";
import type { CatalogFilterOptions, StoryCatalogFilterParams } from "@/lib/discovery/types";

type CatalogActiveFilterChipsProps = {
  filters: StoryCatalogFilterParams;
  filterOptions: CatalogFilterOptions;
  query: string;
};

export function CatalogActiveFilterChips({
  filterOptions,
  filters,
  query
}: CatalogActiveFilterChipsProps) {
  const chips = buildActiveCatalogFilterChips(filters, filterOptions, query);
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <Link
          className="inline-flex items-center gap-1 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-2 py-1 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-300/20"
          href={chip.clearHref}
          key={chip.key}
        >
          <span>{chip.label}</span>
          <span aria-hidden="true" className="text-cyan-200/80">
            ×
          </span>
        </Link>
      ))}
      <Link
        className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-300"
        href={query ? `/truyen?q=${encodeURIComponent(query)}` : "/truyen"}
      >
        Xóa tất cả lọc
      </Link>
    </div>
  );
}
