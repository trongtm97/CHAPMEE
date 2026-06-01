import Link from "next/link";
import { Card, EmptyState, SectionHeader } from "@/components/ui";
import { getStoryCardMeta } from "@/lib/stories/story-structure";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import type { PublicCreatorStory } from "@/lib/creators/getPublicCreatorProfile";

type CreatorStoryListProps = {
  stories: PublicCreatorStory[];
};

export function CreatorStoryList({ stories }: CreatorStoryListProps) {
  return (
    <section className="space-y-3">
      <SectionHeader title="Truyện công khai" />
      {stories.length ? (
        <div className="space-y-3">
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
              href={getStoryDetailHref({
                slug: story.slug,
                public_code: story.publicCode
              })}
              key={story.id}
            >
              <Card className="space-y-3 transition hover:border-cyan-300/60 hover:bg-zinc-800">
                <div>
                  <p className="text-sm text-zinc-400">
                    {story.genreName ?? "ChapMee"} · {metaLine}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    {story.title}
                  </h2>
                </div>
                {story.hook ? (
                  <p className="line-clamp-3 text-sm leading-6 text-zinc-300">
                    {story.hook}
                  </p>
                ) : null}
                <span className="inline-flex min-h-10 items-center justify-center rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-zinc-950">
                  Xem truyện
                </span>
              </Card>
            </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          description="Tác giả này chưa có truyện công khai đã duyệt."
          title="Chưa có truyện công khai"
        />
      )}
    </section>
  );
}
