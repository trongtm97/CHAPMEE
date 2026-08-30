"use client";

import { getStoryCardMeta } from "@/lib/stories/story-structure";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  fetchChaptersExportV2Action,
  fetchStoriesExportV2ByScopeAction,
  searchStoriesForQuickPickAction
} from "@/lib/studio/import-export-actions";
import { downloadTextFile, formatExportFileName } from "@/lib/studio/csv";
import { getStoryStatusLabel, STORY_STATUS_BADGE_CLASS } from "@/lib/studio/status-labels";
import { studioPath } from "@/lib/studio/constants";
import type { StoryQuickPickItem } from "@/types/studio-import";

type StoryQuickPickerProps = {
  initialStories: StoryQuickPickItem[];
  totalStories: number;
  onExportChapters?: (storyId: string) => void;
};

export function StoryQuickPicker({
  initialStories,
  totalStories,
  onExportChapters
}: StoryQuickPickerProps) {
  const [stories, setStories] = useState(initialStories);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(totalStories);
  const [pending, startTransition] = useTransition();

  function loadStories(nextSearch: string, nextPage: number) {
    startTransition(async () => {
      const result = await searchStoriesForQuickPickAction({ page: nextPage, search: nextSearch });
      setStories(result.stories);
      setTotal(result.total);
      setPage(nextPage);
      setSearch(nextSearch);
    });
  }

  function handleExportChapters(storyId: string) {
    if (onExportChapters) {
      onExportChapters(storyId);
      return;
    }

    startTransition(async () => {
      const result = await fetchChaptersExportV2Action({
        mode: "selected_stories",
        storyIds: [storyId]
      });

      if (result.error || !result.csv) {
        return;
      }

      downloadTextFile(result.csv, formatExportFileName("chapters_v2", "csv"));
    });
  }

  function handleExportStory(storyId: string) {
    startTransition(async () => {
      const result = await fetchStoriesExportV2ByScopeAction({
        mode: "selected_stories",
        storyIds: [storyId]
      });

      if (result.error || !result.csv) {
        return;
      }

      downloadTextFile(result.csv, formatExportFileName("stories_v2", "csv"));
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Chọn nhanh truyện</h3>
          <p className="mt-1 text-sm text-zinc-500">Tối đa 10 truyện mỗi trang</p>
        </div>
        <input
          className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 sm:max-w-xs"
          onChange={(event) => loadStories(event.target.value, 1)}
          placeholder="Tìm truyện..."
          type="search"
          value={search}
        />
      </div>

      {stories.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Không tìm thấy truyện.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {stories.map((story) => {
            const isStandalone = story.structureType === "standalone";
            const cardMeta = getStoryCardMeta({
              structureType: story.structureType,
              episodeCount: story.episodeCount
            });
            const metaLine = cardMeta.secondaryLabel
              ? `${cardMeta.primaryLabel} · ${cardMeta.secondaryLabel}`
              : cardMeta.primaryLabel;

            return (
            <li
              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-950/40 p-3 sm:flex-row sm:items-center sm:justify-between"
              key={story.id}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-zinc-100">{story.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded-full border px-2 py-0.5 ${STORY_STATUS_BADGE_CLASS[story.displayStatus]}`}
                  >
                    {getStoryStatusLabel(story.displayStatus)}
                  </span>
                  <span className="text-zinc-500">{metaLine}</span>
                  {story.publicCode ? (
                    <span className="font-mono text-zinc-500">{story.publicCode}</span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {isStandalone ? (
                  <Link
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs font-semibold text-zinc-100"
                    href={studioPath(`/stories/${story.id}/content`)}
                  >
                    Soạn nội dung
                  </Link>
                ) : (
                  <>
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs font-semibold text-zinc-100"
                  href={studioPath(`/stories/${story.id}/import`)}
                >
                  Nhập chương
                </Link>
                <Button
                  className="min-h-10 px-3 text-xs"
                  disabled={pending}
                  onClick={() => handleExportStory(story.id)}
                  type="button"
                  variant="secondary"
                >
                  Xuất truyện
                </Button>
                <Button
                  className="min-h-10 px-3 text-xs"
                  disabled={pending}
                  onClick={() => handleExportChapters(story.id)}
                  type="button"
                  variant="secondary"
                >
                  Xuất chương
                </Button>
                  </>
                )}
              </div>
            </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            disabled={pending || page <= 1}
            onClick={() => loadStories(search, page - 1)}
            type="button"
            variant="secondary"
          >
            Trước
          </Button>
          <span className="text-xs text-zinc-500">
            Trang {page}/{totalPages}
          </span>
          <Button
            disabled={pending || page >= totalPages}
            onClick={() => loadStories(search, page + 1)}
            type="button"
            variant="secondary"
          >
            Xem thêm
          </Button>
        </div>
      ) : null}
    </div>
  );
}
