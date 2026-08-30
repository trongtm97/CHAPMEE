"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { ChapterListItem } from "@/components/story/ChapterListItem";
import { ChapterRangeSelector } from "@/components/story/ChapterRangeSelector";
import { ChapterSearchJump } from "@/components/story/ChapterSearchJump";
import { ContinueReadingCard } from "@/components/story/ContinueReadingCard";
import { SHORT_STORY_CHAPTER_THRESHOLD } from "@/lib/stories/chapter-ranges";
import { fetchStoryChaptersAction } from "@/lib/stories/fetch-story-chapters-action";
import { rangeForChapterNumber } from "@/lib/stories/chapter-ranges";
import type { ChapterSort, StoryChaptersResult, StoryReadingProgress } from "@/types/chapter";

type StoryChaptersTabProps = {
  storyId: string;
  storySlug: string;
  storyPublicCode: string;
  initialData: StoryChaptersResult;
  readingProgress: StoryReadingProgress | null;
  shortEpisodes?: Array<{
    id: string;
    episodeNumber: number;
    title: string;
    slug: string;
    publicCode: string;
    excerpt: string | null;
    publishedAt: string | null;
  }>;
  isTranslation?: boolean;
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

export function StoryChaptersTab({
  initialData,
  readingProgress,
  shortEpisodes,
  storyId,
  storySlug,
  storyPublicCode,
  isTranslation = false
}: StoryChaptersTabProps) {
  const isLongStory = initialData.totalChapters > SHORT_STORY_CHAPTER_THRESHOLD;
  const [data, setData] = useState(initialData);
  const [sort, setSort] = useState<ChapterSort>(initialData.sort);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadChapters = useCallback(
    (input: {
      rangeStart?: number;
      rangeEnd?: number;
      sort?: ChapterSort;
      search?: string;
    }) => {
      startTransition(async () => {
        const next = await fetchStoryChaptersAction({
          storyId,
          rangeStart: input.rangeStart,
          rangeEnd: input.rangeEnd,
          sort: input.sort ?? sort,
          search: input.search
        });
        setData(next);
        if (input.sort) {
          setSort(input.sort);
        }
      });
    },
    [sort, storyId]
  );

  const displayChapters = useMemo(() => {
    const source =
      !isLongStory && shortEpisodes && shortEpisodes.length > 0
        ? [...shortEpisodes]
        : data.chapters;

    if (sort === "desc") {
      return [...source].sort((a, b) => b.episodeNumber - a.episodeNumber);
    }
    return [...source].sort((a, b) => a.episodeNumber - b.episodeNumber);
  }, [data.chapters, isLongStory, shortEpisodes, sort]);

  if (initialData.totalChapters === 0) {
    return (
      <p className="text-sm leading-6 text-zinc-500">
        Truyện này chưa có chương công khai.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {readingProgress ? (
        <ContinueReadingCard
          progress={readingProgress}
          storyPublicCode={storyPublicCode}
          storySlug={storySlug}
        />
      ) : null}

      {isLongStory ? (
        <>
          <div className="flex flex-wrap gap-2">
            <SortChip
              active={sort === "asc"}
              label="Cũ nhất"
              onClick={() => loadChapters({ rangeStart: data.currentRange?.start, rangeEnd: data.currentRange?.end, sort: "asc" })}
            />
            <SortChip
              active={sort === "desc"}
              label="Mới nhất"
              onClick={() => loadChapters({ rangeStart: data.currentRange?.start, rangeEnd: data.currentRange?.end, sort: "desc" })}
            />
          </div>

          <ChapterSearchJump
            loading={pending}
            onSearch={(query) => {
              setSearchError(null);
              if (!query) {
                loadChapters({
                  rangeStart: data.availableRanges[0]?.start,
                  rangeEnd: data.availableRanges[0]?.end,
                  search: ""
                });
                return;
              }
              startTransition(async () => {
                const next = await fetchStoryChaptersAction({
                  storyId,
                  search: query,
                  sort
                });
                setData(next);
                if (next.chapters.length === 0) {
                  setSearchError("Không tìm thấy chương phù hợp.");
                } else if (/^\d+$/.test(query)) {
                  const num = Number(query);
                  const range = rangeForChapterNumber(num, next.totalChapters);
                  loadChapters({
                    rangeStart: range.start,
                    rangeEnd: range.end,
                    search: ""
                  });
                }
              });
            }}
          />

          {searchError ? <p className="text-sm text-zinc-500">{searchError}</p> : null}

          <ChapterRangeSelector
            current={data.currentRange}
            onChange={(range) =>
              loadChapters({ rangeStart: range.start, rangeEnd: range.end, search: "" })
            }
            ranges={data.availableRanges}
          />

          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
            <span>
              {data.currentRange
                ? `Chương ${data.currentRange.label} / ${data.totalChapters}`
                : `${data.totalChapters} chương`}
            </span>
            {pending ? <span>Đang tải...</span> : null}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <SortChip
            active={sort === "asc"}
            label="Cũ nhất"
            onClick={() => setSort("asc")}
          />
          <SortChip
            active={sort === "desc"}
            label="Mới nhất"
            onClick={() => setSort("desc")}
          />
        </div>
      )}

      <ul className={`relative z-[1] space-y-2 ${pending ? "pointer-events-none opacity-60" : ""}`}>
        {displayChapters.map((chapter) => (
          <li key={chapter.id}>
            <ChapterListItem
              chapter={chapter}
              isTranslation={isTranslation}
              status={chapterStatus(chapter.episodeNumber, readingProgress)}
              storyPublicCode={storyPublicCode}
              storySlug={storySlug}
            />
          </li>
        ))}
      </ul>

      {isLongStory && data.currentRange ? (
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-300 disabled:opacity-40"
            disabled={!data.hasPreviousPage || pending}
            onClick={() => {
              const idx = data.availableRanges.findIndex(
                (r) => r.start === data.currentRange?.start
              );
              const prev = data.availableRanges[idx - 1];
              if (prev) {
                loadChapters({ rangeStart: prev.start, rangeEnd: prev.end });
              }
            }}
            type="button"
          >
            Khoảng trước
          </button>
          <button
            className="flex-1 rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-300 disabled:opacity-40"
            disabled={!data.hasNextPage || pending}
            onClick={() => {
              const idx = data.availableRanges.findIndex(
                (r) => r.start === data.currentRange?.start
              );
              const next = data.availableRanges[idx + 1];
              if (next) {
                loadChapters({ rangeStart: next.start, rangeEnd: next.end });
              }
            }}
            type="button"
          >
            Khoảng sau
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SortChip({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`tap-highlight rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-cyan-300 text-zinc-950" : "bg-white/[0.05] text-zinc-400"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
