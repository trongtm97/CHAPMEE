"use client";

import Link from "next/link";
import {
  setOriginFilter,
  toggleStatusFilter,
  toggleTriStateFilter,
  type CatalogViewState
} from "@/lib/stories/story-filters";

type StoryCatalogTopFiltersProps = CatalogViewState;

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
      className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition md:px-3 md:py-1.5 md:text-xs ${
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

export function StoryCatalogTopFilters({ filters, genre, query, sort, status }: StoryCatalogTopFiltersProps) {
  const state: CatalogViewState = { filters, genre, query, sort, status };
  const origin = filters.contentOrigin;

  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
      <QuickChip active={!origin} href={setOriginFilter(state, undefined)}>
        Tất cả
      </QuickChip>
      <QuickChip active={origin === "original"} href={setOriginFilter(state, "original")}>
        Truyện sáng tác
      </QuickChip>
      <QuickChip active={origin === "translation"} href={setOriginFilter(state, "translation")}>
        Truyện dịch
      </QuickChip>
      <span aria-hidden className="mx-0.5 w-px shrink-0 self-stretch bg-white/10" />
      <QuickChip active={status === "ongoing"} href={toggleStatusFilter(state, "ongoing")}>
        Đang ra
      </QuickChip>
      <QuickChip active={status === "completed"} href={toggleStatusFilter(state, "completed")}>
        Hoàn thành
      </QuickChip>
      <span aria-hidden className="mx-0.5 w-px shrink-0 self-stretch bg-white/10" />
      <QuickChip active={filters.hasAudio === "yes"} href={toggleTriStateFilter(state, "hasAudio")}>
        Có audio
      </QuickChip>
      <QuickChip active={filters.hasVideo === "yes"} href={toggleTriStateFilter(state, "hasVideo")}>
        Có video
      </QuickChip>
    </div>
  );
}
