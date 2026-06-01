"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ReaderSheet } from "@/components/reader/ReaderSheet";
import { AppSearchField } from "@/components/ui/AppSearchField";
import { getStoryChapterHref } from "@/lib/stories/story-routes";
import type { StoryEpisode } from "@/lib/stories/getStoryBySlug";

type EpisodeListSheetProps = {
  open: boolean;
  onClose: () => void;
  storyTitle: string;
  storySlug: string;
  storyPublicCode: string;
  episodes: StoryEpisode[];
  currentEpisodeNumber: number;
};

export function EpisodeListSheet({
  currentEpisodeNumber,
  episodes,
  onClose,
  open,
  storyPublicCode,
  storySlug,
  storyTitle
}: EpisodeListSheetProps) {
  const [query, setQuery] = useState("");
  const showSearch = episodes.length > 12;

  const filteredEpisodes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return episodes;
    }

    return episodes.filter((episode) => {
      const numberText = String(episode.episodeNumber);
      return (
        numberText.includes(q) ||
        episode.title.toLowerCase().includes(q) ||
        `chương ${numberText}`.includes(q) ||
        `chap ${numberText}`.includes(q)
      );
    });
  }, [episodes, query]);

  return (
    <ReaderSheet onClose={onClose} open={open} title="Danh sách chương">
      <div className="space-y-4">
        <p className="text-sm font-semibold text-zinc-300">{storyTitle}</p>
        {showSearch ? (
          <AppSearchField
            onChange={setQuery}
            placeholder="Tìm chương..."
            showSubmit={false}
            value={query}
            variant="field"
          />
        ) : null}
        <ul className="space-y-1">
          {filteredEpisodes.length === 0 ? (
            <li className="px-1 py-3 text-sm text-zinc-500">Không tìm thấy chương phù hợp.</li>
          ) : (
            filteredEpisodes.map((episode) => {
              const isCurrent =
                currentEpisodeNumber > 0 && episode.episodeNumber === currentEpisodeNumber;
              return (
                <li key={episode.id}>
                  <Link
                    className={`tap-highlight flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                      isCurrent
                        ? "bg-cyan-300/12 text-cyan-100 ring-1 ring-cyan-300/30"
                        : "text-zinc-200 hover:bg-white/[0.04]"
                    }`}
                    href={getStoryChapterHref(
                      { slug: storySlug, public_code: storyPublicCode },
                      { slug: episode.slug, public_code: episode.publicCode }
                    )}
                    onClick={onClose}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        isCurrent ? "bg-cyan-300 text-zinc-950" : "bg-white/[0.06] text-zinc-300"
                      }`}
                    >
                      {episode.episodeNumber}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{episode.title}</span>
                      {isCurrent ? (
                        <span className="text-xs text-cyan-200/80">Đang đọc</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </ReaderSheet>
  );
}
