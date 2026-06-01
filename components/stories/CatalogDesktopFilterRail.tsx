import Link from "next/link";
import { buildCatalogHref } from "@/lib/discovery/catalog-url";
import type { CatalogFilterOptions, StoryCatalogFilterParams } from "@/lib/discovery/types";

type CatalogDesktopFilterRailProps = {
  filterOptions: CatalogFilterOptions;
  filters: StoryCatalogFilterParams;
  query: string;
  genre: string;
};

function RailSection({
  activeSlug,
  filters,
  genre,
  items,
  paramKey,
  query,
  title
}: {
  activeSlug?: string;
  filters: StoryCatalogFilterParams;
  genre: string;
  items: Array<{ slug: string; name: string }>;
  paramKey: keyof StoryCatalogFilterParams;
  query: string;
  title: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">{title}</h2>
      <ul className="space-y-0.5">
        <li>
          <Link
            className={`block rounded-lg px-2 py-1.5 text-xs font-medium transition ${
              !activeSlug
                ? "bg-cyan-300/15 text-cyan-100"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
            }`}
            href={buildCatalogHref({
              ...filters,
              q: query,
              genre: genre || filters.genre,
              [paramKey]: undefined,
              page: 1
            })}
          >
            Tất cả
          </Link>
        </li>
        {items.slice(0, 12).map((item) => (
          <li key={item.slug}>
            <Link
              className={`block rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                activeSlug === item.slug
                  ? "bg-cyan-300/15 text-cyan-100"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
              href={buildCatalogHref({
                ...filters,
                q: query,
                genre: genre || filters.genre,
                [paramKey]: item.slug,
                page: 1
              })}
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CatalogDesktopFilterRail({
  filterOptions,
  filters,
  genre,
  query
}: CatalogDesktopFilterRailProps) {
  return (
    <aside
      aria-label="Lọc nhanh danh mục"
      className="sticky top-20 max-h-[calc(100dvh-6rem)] space-y-5 overflow-y-auto rounded-2xl border border-white/10 bg-[var(--surface)] p-3"
    >
      <RailSection
        activeSlug={filters.experience}
        filters={filters}
        genre={genre}
        items={filterOptions.experiences}
        paramKey="experience"
        query={query}
        title="Cảm giác đọc"
      />
      <RailSection
        activeSlug={filters.setting}
        filters={filters}
        genre={genre}
        items={filterOptions.settings}
        paramKey="setting"
        query={query}
        title="Bối cảnh"
      />
      <RailSection
        activeSlug={filters.tag}
        filters={filters}
        genre={genre}
        items={filterOptions.tags}
        paramKey="tag"
        query={query}
        title="Tag"
      />
      <RailSection
        activeSlug={filters.presentation}
        filters={filters}
        genre={genre}
        items={filterOptions.presentations}
        paramKey="presentation"
        query={query}
        title="Format"
      />
    </aside>
  );
}
