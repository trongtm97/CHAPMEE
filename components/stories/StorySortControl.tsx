"use client";

import { useRouter } from "next/navigation";
import { buildCatalogHref } from "@/lib/stories/catalog-url";
import type { StoryCatalogFilterParams } from "@/lib/discovery/types";
import type { StoryCatalogSort } from "@/types/story";

type StorySortControlProps = {
  currentSort: StoryCatalogSort;
  filters: StoryCatalogFilterParams;
  className?: string;
  hideLabel?: boolean;
};

const options: Array<{ value: StoryCatalogSort; label: string }> = [
  { value: "updated", label: "Mới cập nhật" },
  { value: "new", label: "Mới đăng" },
  { value: "hot", label: "Đang lên" },
  { value: "reads", label: "Đọc nhiều" },
  { value: "saved", label: "Được lưu nhiều" },
  { value: "chapters", label: "Nhiều chương" },
  { value: "completed", label: "Hoàn thành gần đây" },
  { value: "title", label: "Tên A–Z" },
  { value: "price_asc", label: "Giá trọn bộ thấp" },
  { value: "price_desc", label: "Giá trọn bộ cao" },
  { value: "chapter_price_asc", label: "Giá chương thấp" },
  { value: "chapter_price_desc", label: "Giá chương cao" },
  { value: "quick", label: "Đọc nhanh" }
];

export function StorySortControl({
  className = "",
  currentSort,
  filters,
  hideLabel = false
}: StorySortControlProps) {
  const router = useRouter();

  return (
    <label
      className={`inline-flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-zinc-400 ${className}`.trim()}
    >
      {hideLabel ? null : <span className="shrink-0">Sắp xếp</span>}
      <select
        className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-[var(--surface)] px-2 text-xs text-zinc-100 outline-none focus:border-cyan-300/50 lg:h-10 lg:px-2.5 lg:text-sm"
        name="sort"
        onChange={(event) => {
          const nextSort = event.target.value as StoryCatalogSort;
          router.push(buildCatalogHref({ ...filters, sort: nextSort, page: 1 }));
        }}
        value={currentSort}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
