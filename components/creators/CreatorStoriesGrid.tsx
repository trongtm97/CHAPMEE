"use client";

import Link from "next/link";
import { useState } from "react";
import { ChapMeeStoryCover } from "@/components/common/ChapMeeCover";
import { EmptyState } from "@/components/ui";
import { getStoryCardMeta } from "@/lib/stories/story-structure";
import { getStoryChapterHref, getStoryDetailHref } from "@/lib/stories/story-routes";
import type {
  PublicCreatorFeaturedEpisode,
  PublicCreatorStory
} from "@/lib/creators/getPublicCreatorProfile";

type CreatorStoriesGridProps = {
  featuredEpisodes: PublicCreatorFeaturedEpisode[];
  stories: PublicCreatorStory[];
};

export function CreatorStoriesGrid({
  featuredEpisodes,
  stories
}: CreatorStoriesGridProps) {
  const [tab, setTab] = useState<"episodes" | "stories">("stories");

  if (!stories.length) {
    return (
      <EmptyState
        description="Tác giả này chưa có truyện công khai đã duyệt."
        title="Chưa có truyện công khai"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          className={`chap-pill shrink-0 px-4 py-2 text-sm font-semibold ${
            tab === "stories"
              ? "border-cyan-300/20 bg-cyan-300/12 text-cyan-100"
              : "text-zinc-300"
          }`}
          onClick={() => setTab("stories")}
          type="button"
        >
          Truyện
        </button>
        {featuredEpisodes.length ? (
          <button
            className={`chap-pill shrink-0 px-4 py-2 text-sm font-semibold ${
              tab === "episodes"
                ? "border-cyan-300/20 bg-cyan-300/12 text-cyan-100"
                : "text-zinc-300"
            }`}
            onClick={() => setTab("episodes")}
            type="button"
          >
            Chương nổi bật
          </button>
        ) : null}
      </div>

      {tab === "stories" ? (
        <div className="grid grid-cols-1 gap-4">
          {stories.map((story) => {
            const cardMeta = getStoryCardMeta({
              structureType: story.structureType,
              standaloneReadingTimeMinutes: story.standaloneReadingTimeMinutes,
              episodeCount: story.episodeCount
            });
            const metaLine = cardMeta.secondaryLabel
              ? `${cardMeta.primaryLabel} · ${cardMeta.secondaryLabel}`
              : cardMeta.primaryLabel;

            return (
            <Link
              className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-3 transition hover:border-cyan-300/35 hover:bg-white/[0.06]"
              href={getStoryDetailHref({
                slug: story.slug,
                public_code: story.publicCode
              })}
              key={story.id}
            >
              <div className="flex gap-3">
                <ChapMeeStoryCover
                  className="rounded-[1.2rem]"
                  size="md"
                  story={{ title: story.title, coverUrl: story.coverUrl }}
                  usage="libraryCard"
                />
                <div className="min-w-0 py-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chap-pill px-2.5 py-1 text-[0.64rem] font-bold uppercase tracking-[0.18em] text-cyan-200">
                      {story.genreName ?? "ChapMee"}
                    </span>
                    <span className="text-[0.72rem] font-medium text-zinc-400">
                      {metaLine}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-black leading-6 text-white">
                    {story.title}
                  </h2>
                  {story.hook ? (
                    <p className="mt-2 line-clamp-4 text-sm leading-6 text-zinc-300">
                      {story.hook}
                    </p>
                  ) : null}
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      ) : (
        <section className="space-y-3">
          <div>
            <p className="text-sm font-bold text-white">Chương nổi bật</p>
            <p className="text-sm text-zinc-400">
              Những chap public mới và dễ mở tiếp.
            </p>
          </div>
          <div className="space-y-3">
            {featuredEpisodes.map((episode) => (
              <Link
                className="block rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/35 hover:bg-white/[0.06]"
                href={getStoryChapterHref(
                  {
                    slug: episode.storySlug,
                    public_code: episode.storyPublicCode
                  },
                  {
                    slug: episode.episodeSlug,
                    public_code: episode.episodePublicCode
                  }
                )}
                key={episode.id}
              >
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  {episode.storyTitle}
                </p>
                <h3 className="mt-2 text-base font-bold text-white">
                  Chương {episode.episodeNumber} · {episode.title}
                </h3>
                {episode.excerpt ? (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-300">
                    {episode.excerpt}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
