import Link from "next/link";
import { MobileStoryCard } from "@/components/discover/MobileStoryCard";
import type { DiscoverStory } from "@/lib/discover/getDiscoverData";
import type { TrackingSurface } from "@/types/tracking";

type StoryCarouselSectionProps = {
  title: string;
  stories: DiscoverStory[];
  href: string;
  subtitle?: string;
  trackingSurface?: TrackingSurface;
  seeAllLabel?: string;
};

export function StoryCarouselSection({
  href,
  seeAllLabel = "Xem thêm",
  stories,
  subtitle,
  title,
  trackingSurface = "discover"
}: StoryCarouselSectionProps) {
  if (stories.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-zinc-400">{subtitle}</p> : null}
        </div>
        <Link className="text-xs font-bold text-cyan-200" href={href}>
          {seeAllLabel}
        </Link>
      </div>

      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex min-w-max snap-x snap-mandatory gap-3 pb-0.5 pr-4 md:gap-4">
          {stories.map((story, index) => (
            <MobileStoryCard
              key={story.id}
              position={index}
              story={story}
              surface={trackingSurface}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
