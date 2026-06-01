"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { StudioStoryCard } from "@/components/studio/stories/StudioStoryCard";
import { StudioStoriesBulkBar } from "@/components/studio/stories/StudioStoriesBulkBar";
import { StudioStoriesConfirmModal } from "@/components/studio/stories/StudioStoriesConfirmModal";
import { StudioStoriesSummary } from "@/components/studio/stories/StudioStoriesSummary";
import {
  storiesBtnPrimary,
  storiesBtnSecondary
} from "@/components/studio/stories/shared/styles";
import { studioPath } from "@/lib/studio/constants";
import type { StudioStory } from "@/lib/studio/get-studio-stories";
import type { StudioStoryGenreOption } from "@/types/studio-stories";
import type { StudioTaxonomyFilterOptions } from "@/lib/studio/get-studio-taxonomy-filters";
import type { StudioListPageSize } from "@/types/studio";

type StudioStoriesListSectionProps = {
  filteredStoryIds: string[];
  genres: StudioStoryGenreOption[];
  taxonomyOptions?: StudioTaxonomyFilterOptions | null;
  hasActiveFilters: boolean;
  page: number;
  pageSize: StudioListPageSize;
  stories: StudioStory[];
  totalFiltered: number;
  totalPages: number;
};

export function StudioStoriesListSection({
  filteredStoryIds,
  genres,
  taxonomyOptions,
  hasActiveFilters,
  page,
  pageSize,
  stories,
  totalFiltered,
  totalPages
}: StudioStoriesListSectionProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllResults, setSelectAllResults] = useState(false);
  const [confirmSelectAllOpen, setConfirmSelectAllOpen] = useState(false);

  const effectiveIds = useMemo(() => {
    if (selectAllResults) {
      return filteredStoryIds;
    }

    return [...selectedIds];
  }, [filteredStoryIds, selectAllResults, selectedIds]);

  function toggleSelect(storyId: string, selected: boolean) {
    setSelectAllResults(false);
    setSelectedIds((current) => {
      const next = new Set(current);

      if (selected) {
        next.add(storyId);
      } else {
        next.delete(storyId);
      }

      return next;
    });
  }

  function confirmSelectAllFiltered() {
    setSelectAllResults(true);
    setSelectedIds(new Set(stories.map((story) => story.id)));
    setConfirmSelectAllOpen(false);
  }

  if (stories.length === 0) {
    if (hasActiveFilters) {
      return (
        <EmptyState
          action={
            <Link className={storiesBtnSecondary} href={studioPath("/stories")}>
              Xóa bộ lọc
            </Link>
          }
          description="Thử đổi từ khóa hoặc bộ lọc khác."
          title="Không có truyện phù hợp bộ lọc"
        />
      );
    }

    return (
      <EmptyState
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link className={storiesBtnPrimary} href={studioPath("/stories/new")}>
              Tạo truyện mới
            </Link>
            <Link className={storiesBtnSecondary} href={studioPath("/import")}>
              Nhập hàng loạt
            </Link>
          </div>
        }
        description="Tạo truyện đầu tiên hoặc nhập hàng loạt từ file .txt."
        title="Bạn chưa có truyện nào"
      />
    );
  }

  const pageAllSelected =
    stories.length > 0 && stories.every((story) => selectedIds.has(story.id));

  return (
    <div className={`space-y-2 ${effectiveIds.length > 0 ? "pb-24 lg:pb-2" : ""}`}>
      <StudioStoriesSummary
        page={page}
        pageSize={pageSize}
        pageStoryCount={stories.length}
        totalCount={totalFiltered}
        totalPages={totalPages}
      />

      {effectiveIds.length > 0 ? (
        <StudioStoriesBulkBar
          count={effectiveIds.length}
          genres={genres}
          onClear={() => {
            setSelectedIds(new Set());
            setSelectAllResults(false);
          }}
          selectedIds={effectiveIds}
          taxonomyOptions={taxonomyOptions}
        />
      ) : null}

      <div className="flex flex-col gap-2 px-3 sm:px-4">
        <label className="flex shrink-0 items-start gap-2 pt-0.5 text-xs text-zinc-400">
          <input
            aria-label="Chọn trang này"
            checked={pageAllSelected && !selectAllResults}
            className="h-5 w-5 rounded border-white/20 bg-zinc-950 text-cyan-300 focus:ring-cyan-300/40 sm:h-4 sm:w-4"
            onChange={(event) => {
              setSelectAllResults(false);
              if (event.target.checked) {
                setSelectedIds(new Set(stories.map((story) => story.id)));
              } else {
                setSelectedIds(new Set());
              }
            }}
            type="checkbox"
          />
          <span className="pt-0.5">Chọn trang này</span>
        </label>
        <div className="flex flex-col gap-1.5 pl-7 text-xs text-zinc-400 sm:pl-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        {totalFiltered > stories.length ? (
          <button
            className="font-semibold text-cyan-300 hover:text-cyan-200"
            onClick={() => setConfirmSelectAllOpen(true)}
            type="button"
          >
            Chọn toàn bộ {totalFiltered} truyện phù hợp bộ lọc
          </button>
        ) : null}
        {selectAllResults ? (
          <span className="text-amber-200">Đang chọn toàn bộ kết quả lọc</span>
        ) : null}
        </div>
      </div>

      <ul className="space-y-2">
        {stories.map((story) => (
          <li key={story.id}>
            <StudioStoryCard
              onSelect={toggleSelect}
              selected={selectAllResults || selectedIds.has(story.id)}
              showCheckbox
              story={story}
            />
          </li>
        ))}
      </ul>

      <StudioStoriesConfirmModal
        confirmLabel="Chọn tất cả"
        description={`Chọn toàn bộ ${totalFiltered} truyện phù hợp bộ lọc hiện tại? Thao tác hàng loạt sẽ áp dụng cho tất cả.`}
        onClose={() => setConfirmSelectAllOpen(false)}
        onConfirm={confirmSelectAllFiltered}
        open={confirmSelectAllOpen}
        title="Xác nhận chọn toàn bộ kết quả"
      />
    </div>
  );
}
