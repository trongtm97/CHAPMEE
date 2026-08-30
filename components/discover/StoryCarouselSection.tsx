import Link from "next/link";
import { DiscoverStoryCard } from "@/components/discover/DiscoverStoryCard";
import type { DiscoverStory } from "@/lib/discover/getDiscoverData";
import type { StoryAudioBadgeDisplay } from "@/src/components/story/StoryAudioBadge";
import type { TrackingSurface } from "@/types/tracking";

const MAX_STORIES_DESKTOP = 9;

type StoryCarouselSectionProps = {
  title: string;
  stories: DiscoverStory[];
  href: string;
  subtitle?: string;
  trackingSurface?: TrackingSurface;
  seeAllLabel?: string;
  badgeText?: string;
  badgeTone?: "cyan" | "amber" | "violet" | "ember";
  audioBadgeDisplay?: StoryAudioBadgeDisplay;
};

export function StoryCarouselSection({
  href,
  seeAllLabel = "Xem tất cả",
  stories,
  subtitle,
  title,
  trackingSurface = "discover",
  badgeText,
  badgeTone = "cyan",
  audioBadgeDisplay
}: StoryCarouselSectionProps) {
  if (stories.length === 0) {
    return null;
  }

  const visibleStories = stories.slice(0, MAX_STORIES_DESKTOP);

  const badgeClassName =
    badgeTone === "ember"
      ? "border-orange-400/40 bg-orange-500/15 text-orange-100"
      : badgeTone === "amber"
        ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
        : badgeTone === "violet"
          ? "border-violet-300/35 bg-violet-300/10 text-violet-100"
          : "border-cyan-300/35 bg-cyan-300/10 text-cyan-100";

  return (
    <section className="space-y-2.5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-white md:text-lg">{title}</h2>
            {badgeText ? (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${badgeClassName}`}
              >
                {badgeText}
              </span>
            ) : null}
          </div>
          {subtitle ? <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p> : null}
        </div>
        <Link className="shrink-0 text-xs font-bold text-cyan-200 hover:text-cyan-100" href={href}>
          {seeAllLabel}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-3.5">
        {visibleStories.map((story, index) => (
          <DiscoverStoryCard
            audioBadgeDisplay={audioBadgeDisplay}
            key={story.id}
            position={index}
            prominentCover={visibleStories.length <= 2}
            story={story}
            surface={trackingSurface}
          />
        ))}
      </div>
    </section>
  );
}
