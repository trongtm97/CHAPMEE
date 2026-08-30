import Link from "next/link";
import type { CatalogEmptyStateConfig } from "@/lib/catalog/types";

type CatalogEmptyStateProps = CatalogEmptyStateConfig & {
  hasFilters?: boolean;
  clearFiltersHref?: string;
  compact?: boolean;
};

export function CatalogEmptyState({
  title,
  description,
  filterDescription,
  primaryCta,
  secondaryCta,
  hasFilters,
  clearFiltersHref,
  compact = false
}: CatalogEmptyStateProps) {
  const body = hasFilters && filterDescription ? filterDescription : description;

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-center ${
        compact
          ? "min-h-[8rem] px-4 py-5 sm:min-h-[9rem]"
          : "min-h-[11rem] px-5 py-8 sm:min-h-[13rem]"
      }`}
    >
      <h2 className={`font-bold text-white ${compact ? "text-sm sm:text-base" : "text-base sm:text-lg"}`}>
        {title}
      </h2>
      <p className={`max-w-md leading-relaxed text-zinc-400 ${compact ? "mt-1.5 text-xs sm:text-sm" : "mt-2 text-sm"}`}>
        {body}
      </p>
      <div className={`flex flex-wrap items-center justify-center gap-2 ${compact ? "mt-3" : "mt-5"}`}>
        <Link
          className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-300"
          href={primaryCta.href}
        >
          {primaryCta.label}
        </Link>
        {hasFilters && clearFiltersHref ? (
          <Link
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5"
            href={clearFiltersHref}
          >
            Xóa bộ lọc
          </Link>
        ) : secondaryCta ? (
          <Link
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5"
            href={secondaryCta.href}
          >
            {secondaryCta.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
