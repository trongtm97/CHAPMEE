"use client";

import Link from "next/link";
import { useState } from "react";
import { EpisodeListSheet } from "@/components/reader/EpisodeListSheet";
import type { StoryEpisode } from "@/lib/stories/getStoryBySlug";

type StoryEpisodesTabProps = {
  storySlug: string;
  storyTitle: string;
  episodes: StoryEpisode[];
  previewCount?: number;
};

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function StoryEpisodesTab({
  episodes,
  previewCount = 3,
  storySlug,
  storyTitle
}: StoryEpisodesTabProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const preview = episodes.slice(0, previewCount);

  if (episodes.length === 0) {
    return (
      <p className="text-sm leading-6 text-zinc-500">
        Truyện này chưa có chương công khai.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {preview.map((episode) => (
          <li key={episode.id}>
            <Link
              className="tap-highlight block rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3 transition hover:border-cyan-300/25 hover:bg-white/[0.04]"
              href={`/stories/${storySlug}/episodes/${episode.episodeNumber}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-200/90">
                    Chap {episode.episodeNumber}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-sm font-bold text-white">
                    {episode.title}
                  </p>
                  {episode.excerpt ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                      {episode.excerpt}
                    </p>
                  ) : null}
                </div>
                {formatDate(episode.publishedAt) ? (
                  <span className="shrink-0 text-[0.68rem] text-zinc-500">
                    {formatDate(episode.publishedAt)}
                  </span>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {episodes.length > previewCount ? (
        <button
          className="text-sm font-semibold text-cyan-200"
          onClick={() => setSheetOpen(true)}
          type="button"
        >
          Xem tất cả chương ({episodes.length})
        </button>
      ) : null}
      <EpisodeListSheet
        currentEpisodeNumber={0}
        episodes={episodes}
        onClose={() => setSheetOpen(false)}
        open={sheetOpen}
        storySlug={storySlug}
        storyTitle={storyTitle}
      />
    </div>
  );
}
