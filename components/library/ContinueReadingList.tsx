"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LibraryContinueCard } from "@/components/library/LibraryContinueCard";
import { LibraryEmptyState } from "@/components/library/LibraryEmptyState";
import { LibrarySortFilter } from "@/components/library/LibrarySortFilter";
import type {
  ContinueReadingEnriched,
  LibraryFilterOption,
  LibrarySortOption
} from "@/types/library";

const PREVIEW_LIMIT = 5;

type ContinueReadingListProps = {
  items: ContinueReadingEnriched[];
  total: number;
  searchQuery: string;
};

function sortItems(items: ContinueReadingEnriched[], sort: LibrarySortOption) {
  const copy = [...items];
  switch (sort) {
    case "title":
      return copy.sort((a, b) => a.story.title.localeCompare(b.story.title, "vi"));
    case "progress":
      return copy.sort((a, b) => b.progressPercent - a.progressPercent);
    case "updated":
      return copy.sort((a, b) => {
        const aTime = a.lastReadAt ? new Date(a.lastReadAt).getTime() : 0;
        const bTime = b.lastReadAt ? new Date(b.lastReadAt).getTime() : 0;
        return bTime - aTime;
      });
    case "recent":
    default:
      return copy;
  }
}

function filterItems(items: ContinueReadingEnriched[], filter: LibraryFilterOption) {
  switch (filter) {
    case "new_chapters":
      return items.filter((item) => item.hasNewChapter);
    case "reading":
      return items.filter((item) => item.progressPercent > 0 && item.progressPercent < 95);
    case "finished":
      return items.filter((item) => item.isCaughtUp);
    case "all":
    default:
      return items;
  }
}

export function ContinueReadingList({ items, searchQuery, total }: ContinueReadingListProps) {
  const [sort, setSort] = useState<LibrarySortOption>("recent");
  const [filter, setFilter] = useState<LibraryFilterOption>("all");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let result = items;
    if (query) {
      result = result.filter(
        (item) =>
          item.story.title.toLowerCase().includes(query) ||
          (item.story.creatorName?.toLowerCase().includes(query) ?? false)
      );
    }
    result = filterItems(result, filter);
    return sortItems(result, sort);
  }, [filter, items, searchQuery, sort]);

  const visible = showAll ? filtered : filtered.slice(0, PREVIEW_LIMIT);

  if (items.length === 0) {
    return (
      <LibraryEmptyState
        action={
          <Link
            className="inline-flex min-h-8 items-center justify-center rounded-full bg-cyan-300 px-3.5 text-xs font-bold text-zinc-950"
            href="/discover"
          >
            Khám phá truyện
          </Link>
        }
        description="Mở một chap để bắt đầu hành trình đọc."
        title="Bạn chưa đọc truyện nào."
      />
    );
  }

  return (
    <div className="space-y-2.5">
      <LibrarySortFilter
        filter={filter}
        onFilterChange={setFilter}
        onSortChange={setSort}
        sort={sort}
      />

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-500">Không có truyện phù hợp bộ lọc.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((item) => (
            <LibraryContinueCard item={item} key={item.id} />
          ))}
        </div>
      )}

      {!showAll && filtered.length > PREVIEW_LIMIT ? (
        <button
          className="w-full py-1 text-center text-xs font-semibold text-cyan-200"
          onClick={() => setShowAll(true)}
          type="button"
        >
          Xem tất cả ({filtered.length})
        </button>
      ) : null}

      {showAll && total > items.length ? (
        <p className="text-center text-[0.65rem] text-zinc-500">
          Hiển thị {items.length}/{total} truyện gần nhất.
        </p>
      ) : null}
    </div>
  );
}
