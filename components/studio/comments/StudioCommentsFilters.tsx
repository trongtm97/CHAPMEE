"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppSearchField } from "@/components/ui/AppSearchField";
import { StudioManagerTabs } from "@/components/studio/StudioManagerTabs";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import {
  commentsBtnPrimary,
  commentsBtnSecondary,
  commentsInput
} from "@/components/studio/comments/shared/styles";
import type {
  CommentListPageSize,
  StudioCommentFilter,
  StudioCommentSort,
  StudioCommentStoryOption,
  StudioCommentTimeFilter
} from "@/types/comments";
import { COMMENT_LIST_PAGE_SIZES } from "@/types/comments";

type StudioCommentsFiltersProps = {
  activeFilter: StudioCommentFilter;
  activePageSize: CommentListPageSize;
  activeSort: StudioCommentSort;
  activeTime: StudioCommentTimeFilter;
  basePath: string;
  counts: Record<StudioCommentFilter, number>;
  query: Record<string, string | undefined>;
  search: string;
  stories: StudioCommentStoryOption[];
  storyId?: string;
};

const TAB_ITEMS: Array<{ label: string; value: StudioCommentFilter }> = [
  { label: "Tất cả", value: "all" },
  { label: "Chưa trả lời", value: "unreplied" },
  { label: "Đã trả lời", value: "replied" },
  { label: "Được ghim", value: "pinned" },
  { label: "Bị báo cáo", value: "reported" },
  { label: "Đã ẩn", value: "hidden" }
];

const TIME_OPTIONS: Array<{ label: string; value: StudioCommentTimeFilter }> = [
  { label: "Hôm nay", value: "today" },
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "Tất cả", value: "all" }
];

const SORT_OPTIONS: Array<{ label: string; value: StudioCommentSort }> = [
  { label: "Mới nhất", value: "newest" },
  { label: "Cũ nhất", value: "oldest" },
  { label: "Ưu tiên chưa trả lời", value: "unreplied_first" },
  { label: "Bị báo cáo trước", value: "reported_first" }
];

export function StudioCommentsFilters({
  activeFilter,
  activePageSize,
  activeSort,
  activeTime,
  basePath,
  counts,
  query,
  search,
  stories,
  storyId
}: StudioCommentsFiltersProps) {
  const router = useRouter();
  const [localSearch, setLocalSearch] = useState(search);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [draftStory, setDraftStory] = useState(storyId ?? "");
  const [draftTime, setDraftTime] = useState(activeTime);
  const [draftSort, setDraftSort] = useState(activeSort);
  const [draftSize, setDraftSize] = useState(String(activePageSize));

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (localSearch === search) {
        return;
      }

      router.push(
        buildStudioManagerHref(basePath, {
          ...query,
          filter: activeFilter !== "all" ? activeFilter : undefined,
          page: undefined,
          q: localSearch.trim() || undefined
        })
      );
    }, 400);

    return () => window.clearTimeout(handle);
  }, [activeFilter, basePath, localSearch, query, router, search]);

  function applyFilters() {
    router.push(
      buildStudioManagerHref(basePath, {
        ...query,
        filter: activeFilter !== "all" ? activeFilter : undefined,
        page: undefined,
        q: localSearch.trim() || undefined,
        size: draftSize !== "20" ? draftSize : undefined,
        sort: draftSort !== "newest" ? draftSort : undefined,
        story: draftStory || undefined,
        time: draftTime !== "all" ? draftTime : undefined
      })
    );
  }

  function clearFilters() {
    router.push(basePath);
  }

  const filterFields = (
    <>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-zinc-500">Truyện</span>
        <select
          className={commentsInput}
          onChange={(event) => setDraftStory(event.target.value)}
          value={draftStory}
        >
          <option value="">Tất cả truyện</option>
          {stories.map((story) => (
            <option key={story.id} value={story.id}>
              {story.title}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-zinc-500">Thời gian</span>
        <select
          className={commentsInput}
          onChange={(event) =>
            setDraftTime(event.target.value as StudioCommentTimeFilter)
          }
          value={draftTime}
        >
          {TIME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-zinc-500">Sắp xếp</span>
        <select
          className={commentsInput}
          onChange={(event) => setDraftSort(event.target.value as StudioCommentSort)}
          value={draftSort}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-zinc-500">Mỗi trang</span>
        <select
          className={commentsInput}
          onChange={(event) => setDraftSize(event.target.value)}
          value={draftSize}
        >
          {COMMENT_LIST_PAGE_SIZES.map((size) => (
            <option key={size} value={String(size)}>
              {size}
            </option>
          ))}
        </select>
      </label>
    </>
  );

  return (
    <div className="space-y-3">
      <AppSearchField
        onChange={setLocalSearch}
        placeholder="Tìm theo nội dung, độc giả, truyện/chương..."
        showSubmit={false}
        value={localSearch}
        variant="field"
      />

      <StudioManagerTabs
        active={activeFilter}
        basePath={basePath}
        counts={counts}
        filterParam="filter"
        query={query}
        tabs={TAB_ITEMS}
      />

      <div className="hidden gap-2 lg:grid lg:grid-cols-2 xl:grid-cols-4">
        {filterFields}
      </div>

      <div className="hidden flex-wrap gap-2 lg:flex">
        <button className={commentsBtnPrimary} onClick={applyFilters} type="button">
          Lọc
        </button>
        <button className={commentsBtnSecondary} onClick={clearFilters} type="button">
          Xóa lọc
        </button>
      </div>

      <div className="lg:hidden">
        <button
          className={`${commentsBtnSecondary} w-full`}
          onClick={() => setMobileOpen((open) => !open)}
          type="button"
        >
          {mobileOpen ? "Đóng bộ lọc" : "Bộ lọc"}
        </button>
        {mobileOpen ? (
          <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-[#111820]/80 p-3">
            {filterFields}
            <div className="flex flex-wrap gap-2">
              <button className={commentsBtnPrimary} onClick={applyFilters} type="button">
                Lọc
              </button>
              <button className={commentsBtnSecondary} onClick={clearFilters} type="button">
                Xóa lọc
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
        {TIME_OPTIONS.map((option) => {
          const active = activeTime === option.value;
          return (
            <Link
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                active
                  ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100"
                  : "border-white/10 text-zinc-400"
              }`}
              href={buildStudioManagerHref(basePath, {
                ...query,
                page: undefined,
                time: option.value !== "all" ? option.value : undefined
              })}
              key={option.value}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
