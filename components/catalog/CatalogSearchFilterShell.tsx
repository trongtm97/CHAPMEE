"use client";

import { CatalogActiveFilters } from "@/components/catalog/CatalogActiveFilters";
import { CatalogQuickFilters } from "@/components/catalog/CatalogQuickFilters";
import { CatalogSearchBar } from "@/components/catalog/CatalogSearchBar";
import { CatalogSortControl } from "@/components/catalog/CatalogSortControl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { CatalogSearchFilterShellProps } from "@/lib/catalog/types";

export function CatalogSearchFilterShell({
  config,
  runtime,
  advancedSlot,
  sortVariant = "chips",
  pending,
  compact = false
}: CatalogSearchFilterShellProps) {
  const router = useRouter();
  const [navigationPending, startNavigation] = useTransition();
  const isPending = pending || navigationPending;

  function navigate(href: string) {
    startNavigation(() => {
      router.push(href);
    });
  }

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[var(--surface-soft)] ${
        compact ? "space-y-2 p-2 md:p-2.5" : "space-y-2.5 p-2.5 md:p-3"
      }`}
      aria-busy={isPending || undefined}
    >
      <div
        className={
          compact && sortVariant === "select"
            ? "flex flex-col gap-2"
            : "flex flex-col gap-2 md:flex-row md:items-center md:gap-3"
        }
      >
        <div className="min-w-0 flex-1">
          <CatalogSearchBar
            onSubmit={(q) => navigate(runtime.buildHref({ q: q || undefined, page: 1 }))}
            pending={isPending}
            placeholder={config.searchPlaceholder}
            query={runtime.query}
          />
        </div>
        {sortVariant === "select" ? (
          <CatalogSortControl
            buildSortHref={(sortId) => runtime.buildHref({ sort: sortId, page: 1 })}
            className={compact ? "w-full sm:w-auto" : "md:shrink-0"}
            onNavigate={navigate}
            options={config.sortOptions}
            sort={runtime.sort}
            variant="select"
          />
        ) : null}
      </div>

      {sortVariant === "chips" ? (
        <CatalogSortControl
          buildSortHref={(sortId) => runtime.buildHref({ sort: sortId, page: 1 })}
          onNavigate={navigate}
          options={config.sortOptions}
          sort={runtime.sort}
          variant="chips"
        />
      ) : null}

      <CatalogQuickFilters
        buildHref={runtime.buildHref}
        filters={config.quickFilters}
        isActive={runtime.isQuickFilterActive}
      />

      {advancedSlot ? (
        <div className="border-t border-white/8 pt-2">{advancedSlot}</div>
      ) : null}

      {runtime.hasActiveFilters ? (
        <CatalogActiveFilters chips={runtime.activeChips} clearAllHref={runtime.clearAllHref} />
      ) : null}
    </div>
  );
}
