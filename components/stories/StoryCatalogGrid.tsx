import Link from "next/link";
import { DesktopStoryGridCard } from "@/components/stories/DesktopStoryGridCard";
import type { StoryCatalogTrackingContext } from "@/types/story-catalog-tracking";
import type { StoryCatalogStory } from "@/types/story";

type StoryCatalogGridProps = {
  stories: StoryCatalogStory[];
  trackingSurface?: "category" | "search";
  trackingContext?: StoryCatalogTrackingContext;
};

export function StoryCatalogGrid({
  stories,
  trackingSurface = "category",
  trackingContext
}: StoryCatalogGridProps) {
  if (stories.length === 0) {
    return (
      <div className="chap-card hidden space-y-3 p-5 text-sm text-zinc-300 lg:block">
        <p>Chưa có truyện phù hợp.</p>
        <Link className="text-xs font-bold text-cyan-200" href="/reels">
          Khám phá bằng Reels →
        </Link>
      </div>
    );
  }

  return (
    <div className="hidden gap-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {stories.map((story, index) => (
        <DesktopStoryGridCard
          key={story.id}
          position={index}
          story={story}
          surface={trackingSurface}
          trackingContext={trackingContext}
        />
      ))}
    </div>
  );
}
