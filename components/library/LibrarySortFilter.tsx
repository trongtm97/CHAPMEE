"use client";

import type { LibraryFilterOption, LibrarySortOption } from "@/types/library";

type LibrarySortFilterProps = {
  sort: LibrarySortOption;
  filter: LibraryFilterOption;
  onSortChange: (value: LibrarySortOption) => void;
  onFilterChange: (value: LibraryFilterOption) => void;
  showProgressSort?: boolean;
};

const sortLabels: Record<LibrarySortOption, string> = {
  recent: "Gần đây",
  updated: "Mới cập nhật",
  title: "Tên A–Z",
  progress: "Tiến độ đọc"
};

const filterLabels: Record<LibraryFilterOption, string> = {
  all: "Tất cả",
  new_chapters: "Có chương mới",
  reading: "Đang đọc",
  finished: "Đã đọc xong"
};

export function LibrarySortFilter({
  filter,
  onFilterChange,
  onSortChange,
  showProgressSort = true,
  sort
}: LibrarySortFilterProps) {
  const sortOptions = (
    showProgressSort
      ? (["recent", "updated", "title", "progress"] as LibrarySortOption[])
      : (["recent", "updated", "title"] as LibrarySortOption[])
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <details className="group relative">
        <summary className="tap-highlight inline-flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-2.5 text-[0.65rem] font-semibold text-zinc-300 [&::-webkit-details-marker]:hidden">
          <FilterIcon />
          {filterLabels[filter]}
        </summary>
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[9rem] rounded-xl border border-white/10 bg-[#121820] p-1 shadow-xl">
          {(["all", "new_chapters", "reading", "finished"] as LibraryFilterOption[]).map(
            (option) => (
              <button
                className={`flex w-full rounded-lg px-2.5 py-2 text-left text-xs ${
                  filter === option
                    ? "bg-cyan-300/15 font-semibold text-cyan-100"
                    : "text-zinc-300 hover:bg-white/5"
                }`}
                key={option}
                onClick={() => {
                  onFilterChange(option);
                }}
                type="button"
              >
                {filterLabels[option]}
              </button>
            )
          )}
        </div>
      </details>

      <select
        aria-label="Sắp xếp"
        className="min-h-8 rounded-full border border-white/8 bg-white/[0.03] px-2.5 text-[0.65rem] font-semibold text-zinc-300 outline-none focus:border-cyan-300/30"
        onChange={(event) => onSortChange(event.target.value as LibrarySortOption)}
        value={sort}
      >
        {sortOptions.map((option) => (
          <option key={option} value={option}>
            {sortLabels[option]}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterIcon() {
  return (
    <svg aria-hidden="true" className="size-3" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 7h14M8 12h8M10 17h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
