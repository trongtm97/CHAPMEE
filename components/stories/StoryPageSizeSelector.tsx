"use client";

import { useRouter } from "next/navigation";
import { buildCatalogHref } from "@/lib/stories/catalog-url";
import type { StoryCatalogSort, StoryCatalogStatus } from "@/types/story";

type StoryPageSizeSelectorProps = {
  page: number;
  query: string;
  genre: string;
  status: StoryCatalogStatus;
  sort: StoryCatalogSort;
  pageSize: number;
};

const options = [20, 24, 30];

export function StoryPageSizeSelector({
  genre,
  pageSize,
  query,
  sort,
  status
}: StoryPageSizeSelectorProps) {
  const router = useRouter();

  return (
    <label className="inline-flex items-center gap-2 text-xs text-zinc-400">
      <span>Hiển thị</span>
      <select
        className="h-9 rounded-lg border border-white/10 bg-[var(--surface)] px-2 text-sm text-zinc-100 outline-none focus:border-cyan-300/50"
        onChange={(event) => {
          const nextSize = Number(event.target.value);
          router.push(
            buildCatalogHref({
              q: query,
              genre,
              status,
              sort,
              page: 1,
              pageSize: nextSize
            })
          );
        }}
        value={String(pageSize)}
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size} / trang
          </option>
        ))}
      </select>
    </label>
  );
}
