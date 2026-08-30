"use client";

import Link from "next/link";
import type { CatalogQuickFilterDef } from "@/lib/catalog/types";

type CatalogQuickFiltersProps = {
  filters: CatalogQuickFilterDef[];
  buildHref: (patch: Record<string, unknown>) => string;
  isActive: (chipId: string, def: CatalogQuickFilterDef) => boolean;
};

function QuickChip({
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
      className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold sm:text-xs ${
        active
          ? "border-cyan-300/55 bg-cyan-300/18 text-cyan-50"
          : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/18 hover:text-zinc-100"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}

export function CatalogQuickFilters({ filters, buildHref, isActive }: CatalogQuickFiltersProps) {
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
      {filters.map((def) => (
        <QuickChip
          active={isActive(def.id, def)}
          href={buildHref({ ...def.patch, page: 1 })}
          key={def.id}
        >
          {def.label}
        </QuickChip>
      ))}
    </div>
  );
}
