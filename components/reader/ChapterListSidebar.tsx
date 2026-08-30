"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ChapterRangeSelector } from "@/components/story/ChapterRangeSelector";
import { ChapterSearchJump } from "@/components/story/ChapterSearchJump";
import { SHORT_STORY_CHAPTER_THRESHOLD } from "@/lib/stories/chapter-ranges";
import { fetchStoryChaptersAction } from "@/lib/stories/fetch-story-chapters-action";
import { getStoryChapterHref, getStoryDetailHref } from "@/lib/stories/story-routes";
import { rangeForChapterNumber } from "@/lib/stories/chapter-ranges";
import type { StoryChaptersResult, StoryReadingProgress } from "@/types/chapter";

type ChapterListSidebarProps = {
  storyId: string;
  storySlug: string;
  storyPublicCode: string;
  storyTitle: string;
  currentEpisodeNumber: number;
  initialChaptersData: StoryChaptersResult;
  shortEpisodes?: StoryChaptersResult["chapters"];
  readingProgress: StoryReadingProgress | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

function chapterStatus(
  episodeNumber: number,
  progress: StoryReadingProgress | null
): "reading" | "read" | null {
  if (!progress) {
    return null;
  }
  if (episodeNumber === progress.episodeNumber) {
    return "reading";
  }
  if (episodeNumber < progress.episodeNumber) {
    return "read";
  }
  return null;
}

export function ChapterListSidebar({
  collapsed,
  currentEpisodeNumber,
  initialChaptersData,
  onToggleCollapse,
  readingProgress,
  shortEpisodes,
  storyId,
  storyPublicCode,
  storySlug,
  storyTitle
}: ChapterListSidebarProps) {
  const isLongStory = initialChaptersData.totalChapters > SHORT_STORY_CHAPTER_THRESHOLD;
  const [data, setData] = useState(initialChaptersData);
  const [pending, startTransition] = useTransition();

  const loadChapters = useCallback(
    (input: { rangeStart?: number; rangeEnd?: number; search?: string }) => {
      startTransition(async () => {
        const next = await fetchStoryChaptersAction({
          storyId,
          rangeStart: input.rangeStart,
          rangeEnd: input.rangeEnd,
          search: input.search
        });
        setData(next);
      });
    },
    [storyId]
  );

  const displayChapters = useMemo(() => {
    const source =
      !isLongStory && shortEpisodes && shortEpisodes.length > 0
        ? shortEpisodes
        : data.chapters;
    return [...source].sort((a, b) => a.episodeNumber - b.episodeNumber);
  }, [data.chapters, isLongStory, shortEpisodes]);

  if (collapsed) {
    return (
      <aside
        aria-label="Danh sách chương"
        className="hidden lg:flex lg:w-12 lg:shrink-0 lg:flex-col lg:items-center lg:pt-2"
      >
        <button
          aria-label="Mở danh sách chương"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
          onClick={onToggleCollapse}
          type="button"
        >
          <ListIcon />
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Danh sách chương"
      className="hidden w-full lg:flex lg:max-h-[calc(100dvh-5.5rem)] lg:flex-col lg:overflow-hidden lg:rounded-xl lg:border lg:border-white/[0.06] lg:bg-[#0b1016]/80"
    >
      <div className="shrink-0 space-y-2 border-b border-white/[0.06] px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[0.625rem] font-bold uppercase tracking-[0.12em] text-zinc-500">
              Danh sách chương
            </p>
            <p className="line-clamp-2 text-sm font-bold text-zinc-100">{storyTitle}</p>
          </div>
          <button
            aria-label="Thu gọn danh sách chương"
            className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-zinc-500 hover:bg-white/[0.05]"
            onClick={onToggleCollapse}
            type="button"
          >
            Thu
          </button>
        </div>
        <Link
          className="inline-flex text-xs font-semibold text-cyan-200/90 hover:text-cyan-100"
          href={getStoryDetailHref({ slug: storySlug, public_code: storyPublicCode })}
        >
          ← Về trang truyện
        </Link>
        {isLongStory ? (
          <ChapterSearchJump
            loading={pending}
            onSearch={(query) => {
              if (!query) {
                const range = rangeForChapterNumber(
                  currentEpisodeNumber,
                  data.totalChapters
                );
                loadChapters({ rangeStart: range.start, rangeEnd: range.end });
                return;
              }
              loadChapters({ search: query });
            }}
          />
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        {isLongStory && data.availableRanges.length > 1 ? (
          <div className="mb-2 px-1">
            <ChapterRangeSelector
              current={data.currentRange}
              onChange={(range) =>
                loadChapters({ rangeStart: range.start, rangeEnd: range.end })
              }
              ranges={data.availableRanges}
            />
          </div>
        ) : null}
        <ul className="space-y-0.5">
          {displayChapters.length === 0 ? (
            <li className="px-2 py-4 text-xs text-zinc-500">Không có chương trong khoảng này.</li>
          ) : (
            displayChapters.map((episode) => {
              const isCurrent = episode.episodeNumber === currentEpisodeNumber;
              const status = chapterStatus(episode.episodeNumber, readingProgress);
              return (
                <li key={episode.id}>
                  <Link
                    className={`block rounded-lg px-2.5 py-2 text-sm transition ${
                      isCurrent
                        ? "bg-cyan-300/12 font-semibold text-cyan-100 ring-1 ring-cyan-300/25"
                        : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                    }`}
                    href={getStoryChapterHref(
                      { slug: storySlug, public_code: storyPublicCode },
                      { slug: episode.slug, public_code: episode.publicCode }
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-black ${
                          isCurrent ? "bg-cyan-300 text-zinc-950" : "bg-white/[0.06] text-zinc-400"
                        }`}
                      >
                        {episode.episodeNumber}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 leading-snug">{episode.title}</span>
                        {status === "reading" ? (
                          <span className="mt-0.5 block text-[0.625rem] text-cyan-200/80">
                            Đang đọc
                            {readingProgress && readingProgress.episodeNumber === episode.episodeNumber
                              ? ` · ${Math.round(readingProgress.progressPercent)}%`
                              : null}
                          </span>
                        ) : status === "read" ? (
                          <span className="mt-0.5 block text-[0.625rem] text-zinc-600">
                            Đã đọc
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </aside>
  );
}

function ListIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}
