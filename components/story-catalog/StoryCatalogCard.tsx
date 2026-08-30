import { TrackedStoryLink } from "@/components/tracking/TrackedStoryLink";
import { AuthorNameLink } from "@/components/profile/AuthorNameLink";
import { StoryCatalogCover } from "@/components/story-catalog/StoryCatalogCover";
import { buildStoryCatalogCardView } from "@/lib/stories/story-catalog-card";
import type { StoryCatalogTrackingContext } from "@/types/story-catalog-tracking";
import type { StoryAudioBadgeDisplay } from "@/src/components/story/StoryAudioBadge";
import type { StoryCatalogStory } from "@/types/story";

type StoryCatalogCardProps = {
  story: StoryCatalogStory;
  layout: "grid" | "row";
  surface?: "category" | "search";
  position?: number;
  trackingContext?: StoryCatalogTrackingContext;
  audioBadgeDisplay?: StoryAudioBadgeDisplay;
};

export function StoryCatalogCard({
  audioBadgeDisplay,
  layout,
  position,
  story,
  surface = "category",
  trackingContext
}: StoryCatalogCardProps) {
  const view = buildStoryCatalogCardView(story);
  const isRow = layout === "row";

  const coverProps = {
    audioBadgeDisplay,
    contentOrigin: view.contentOrigin,
    genreLabel: view.genreLabel,
    hasAudio: view.hasAudio,
    hasVideo: view.hasVideo,
    rightsStatus: view.rightsStatus,
    statusLabel: view.statusLabel,
    story
  };

  return (
    <TrackedStoryLink
      className="tap-highlight block h-full"
      href={view.href}
      position={position}
      storyId={story.id}
      surface={surface}
      trackingContext={trackingContext}
    >
      {isRow ? (
        <article className="flex min-h-0 items-start gap-2.5 overflow-hidden rounded-xl border border-white/10 bg-[var(--surface-soft)] p-2 transition hover:border-cyan-300/30 hover:bg-[var(--surface)]">
          <StoryCatalogCover {...coverProps} variant="row" />
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 py-0.5">
            <div className="min-w-0 space-y-1">
              <h3 className="line-clamp-2 text-[13px] font-black leading-[1.25] text-zinc-50">
                {view.title}
              </h3>
              <AuthorNameLink
                className="block truncate text-[11px] text-zinc-400"
                linkToProfile
                name={view.authorDisplayName}
                nameClassName="text-zinc-400 hover:text-cyan-200"
                username={view.authorUsername}
              />
              <p className="line-clamp-2 text-[11px] leading-4 text-zinc-400">{view.description}</p>
            </div>
            <div className="mt-0.5 space-y-0.5">
              <p className="truncate text-[10px] text-zinc-500">{view.statsLine}</p>
              <span className="inline-flex text-[11px] font-bold text-cyan-200">{view.ctaLabel}</span>
            </div>
          </div>
        </article>
      ) : (
        <article className="group/card flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[var(--surface-soft)] transition hover:border-cyan-300/35 hover:shadow-[0_10px_36px_-22px_rgba(34,211,238,0.45)]">
          <div className="p-2 pb-0">
            <StoryCatalogCover {...coverProps} variant="grid" />
          </div>
          <div className="flex flex-1 flex-col p-2.5 pt-2">
            <h3 className="line-clamp-2 text-sm font-black leading-5 text-zinc-50">{view.title}</h3>
            <AuthorNameLink
              className="mt-1 block truncate text-[11px] text-zinc-400"
              linkToProfile
              name={view.authorDisplayName}
              nameClassName="text-zinc-400 hover:text-cyan-200"
              username={view.authorUsername}
            />
            <p className="mt-1.5 line-clamp-2 flex-1 text-[11px] leading-4 text-zinc-400">
              {view.description}
            </p>
            <p className="mt-1.5 truncate text-[10px] text-zinc-500">{view.statsLine}</p>
            <span className="mt-1 inline-flex text-[11px] font-bold text-cyan-200 group-hover:text-cyan-100">
              {view.ctaLabel}
            </span>
          </div>
        </article>
      )}
    </TrackedStoryLink>
  );
}
