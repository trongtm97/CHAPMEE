import { TrackedStoryLink } from "@/components/tracking/TrackedStoryLink";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { DiscoverAuthorLine } from "@/components/discover/DiscoverAuthorLine";
import { Card } from "@/components/ui";
import { getStoryCardMeta } from "@/lib/stories/story-structure";
import type { DiscoverStory } from "@/lib/discover/getDiscoverData";

type DiscoverStoryCardProps = {
  story: DiscoverStory;
  surface?: import("@/types/tracking").TrackingSurface;
  position?: number;
};

export function DiscoverStoryCard({
  story,
  surface = "discover",
  position
}: DiscoverStoryCardProps) {
  const cardMeta = getStoryCardMeta({
    structureType: story.structureType ?? "chaptered",
    standaloneReadingTimeMinutes: story.standaloneReadingTimeMinutes ?? 0,
    episodeCount: story.episodeCount ?? 0
  });
  const metaLine = cardMeta.secondaryLabel
    ? `${cardMeta.primaryLabel} · ${cardMeta.secondaryLabel}`
    : cardMeta.primaryLabel;

  return (
    <TrackedStoryLink
      algorithmVersion={story.feed?.algorithmVersion}
      authorUserId={story.creatorUserId}
      candidatePool={story.feed?.candidatePool}
      className="tap-highlight block"
      href={getStoryDetailHref({ slug: story.slug, public_code: story.publicCode })}
      position={position}
      requestId={story.feed?.requestId}
      sectionKey={story.feed?.sectionKey}
      sourceSurface="discover"
      storyId={story.id}
      surface={surface}
    >
      <Card className="space-y-3 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-[var(--surface-soft)]">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/25 to-sky-300/10 text-base font-black text-white">
            {story.title.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-lg font-black leading-6 tracking-normal text-white">
              {story.title}
            </h3>
            <DiscoverAuthorLine
              creatorName={story.creatorName}
              creatorUsername={story.creatorUsername}
              genreName={story.genreName}
            />
          </div>
        </div>
        <p className="line-clamp-3 text-[0.98rem] leading-7 text-zinc-200">
          {story.hook ?? story.shortDescription ?? "Một truyện mới đang chờ bạn."}
        </p>
        <p className="text-xs text-zinc-500">{metaLine}</p>
        <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black uppercase tracking-[0.12em] text-zinc-950">
          {cardMeta.ctaLabel}
        </span>
      </Card>
    </TrackedStoryLink>
  );
}
