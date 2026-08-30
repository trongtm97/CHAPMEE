import { ChapMeeStoryCover } from "@/components/common/ChapMeeCover";
import type { ChapMeeCoverSize } from "@/lib/images/cover-sizes";
import { TrackedStoryLink } from "@/components/tracking/TrackedStoryLink";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { DiscoverAuthorLine } from "@/components/discover/DiscoverAuthorLine";
import { DiscoverOriginBadge } from "@/components/discover/DiscoverOriginBadge";
import { StoryAudioBadge, type StoryAudioBadgeDisplay } from "@/src/components/story/StoryAudioBadge";
import { getStoryCardMeta } from "@/lib/stories/story-structure";
import type { DiscoverStory } from "@/lib/discover/getDiscoverData";

type DiscoverStoryCardProps = {
  story: DiscoverStory;
  surface?: import("@/types/tracking").TrackingSurface;
  position?: number;
  audioBadgeDisplay?: StoryAudioBadgeDisplay;
  /** Larger cover for sparse sections (e.g. single story). */
  prominentCover?: boolean;
};

function compactNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(value);
}

function formatUpdated(publishedAt: string | null) {
  if (!publishedAt) return "Mới cập nhật";
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return "Mới cập nhật";
  return `Cập nhật ${date.getDate()}/${date.getMonth() + 1}`;
}

function coverLayout(prominent: boolean): { size: ChapMeeCoverSize; className: string } {
  if (prominent) {
    return {
      size: "discoverLg",
      className:
        "shrink-0 self-start ring-1 ring-white/10 transition group-hover:ring-cyan-400/25 w-[6.25rem] sm:w-[7rem] md:w-[8.25rem]"
    };
  }
  return {
    size: "discoverSm",
    className:
      "shrink-0 self-start ring-1 ring-white/10 transition group-hover:ring-cyan-400/25 w-[5.5rem] sm:w-[5.75rem] md:w-[7.5rem]"
  };
}

export function DiscoverStoryCard({
  story,
  surface = "discover",
  position,
  audioBadgeDisplay,
  prominentCover = false
}: DiscoverStoryCardProps) {
  const cardMeta = getStoryCardMeta({
    structureType: story.structureType ?? "chaptered",
    standaloneReadingTimeMinutes: story.standaloneReadingTimeMinutes ?? 0,
    episodeCount: story.episodeCount ?? 0
  });
  const excerpt = story.hook ?? story.shortDescription ?? "Một truyện mới đang chờ bạn đọc trên ChapMee.";
  const ctaLabel =
    story.contentOrigin === "translation" ? "Đọc miễn phí" : cardMeta.ctaLabel;
  const statusLabel = story.isCompleted ? "Hoàn thành" : "Đang ra";
  const cover = coverLayout(prominentCover);

  const statsParts = [
    cardMeta.primaryLabel,
    cardMeta.secondaryLabel,
    `🔥 ${compactNumber(Math.max(0, story.score))}`,
    formatUpdated(story.publishedAt)
  ].filter(Boolean);

  return (
    <TrackedStoryLink
      algorithmVersion={story.feed?.algorithmVersion}
      authorUserId={story.creatorUserId}
      candidatePool={story.feed?.candidatePool}
      className="tap-highlight group block h-full"
      href={getStoryDetailHref({ slug: story.slug, public_code: story.publicCode })}
      position={position}
      requestId={story.feed?.requestId}
      sectionKey={story.feed?.sectionKey}
      sourceSurface="discover"
      storyId={story.id}
      surface={surface}
    >
      <article className="flex min-h-[6.875rem] gap-3.5 rounded-xl border border-white/10 bg-[var(--surface-soft)] p-3 transition hover:border-cyan-300/35 hover:bg-white/[0.03] sm:min-h-[7.5rem] sm:gap-4 sm:p-3.5 md:min-h-[10rem]">
        <ChapMeeStoryCover
          className={cover.className}
          size={cover.size}
          story={{
            title: story.title,
            coverUrl: story.coverUrl,
            currentImage: story.currentImage ?? null
          }}
          usage="discoverCard"
        />

        <div className="flex min-w-0 flex-1 flex-col py-0.5">
          <h3 className="line-clamp-2 text-[0.9375rem] font-black leading-snug text-white sm:text-base md:leading-tight">
            {story.title}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <DiscoverOriginBadge
              contentOrigin={story.contentOrigin}
              rightsStatus={story.rightsStatus}
            />
            {story.genreName ? (
              <span className="max-w-[8rem] truncate rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[0.625rem] font-medium text-zinc-300">
                {story.genreName}
              </span>
            ) : null}
            <span
              className={`rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold ${
                story.isCompleted
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                  : "border-sky-400/25 bg-sky-400/10 text-sky-100"
              }`}
            >
              {statusLabel}
            </span>
            <StoryAudioBadge
              {...audioBadgeDisplay}
              hasContinuousPlayback={story.hasContinuousPlayback}
              hasPublishedAudio={story.hasPublishedAudio}
            />
          </div>

          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-400 sm:line-clamp-3 sm:text-[0.8125rem]">
            {excerpt}
          </p>

          <DiscoverAuthorLine
            className="mt-2 truncate text-xs font-medium text-zinc-400"
            creatorName={story.creatorName}
            creatorUsername={story.creatorUsername}
            linkAuthor={false}
          />

          <p className="mt-1 line-clamp-1 text-[0.6875rem] text-zinc-500">{statsParts.join(" · ")}</p>

          <span className="mt-auto inline-flex items-center gap-1 pt-2.5 text-sm font-bold text-cyan-200 group-hover:text-cyan-100">
            {ctaLabel}
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </article>
    </TrackedStoryLink>
  );
}
