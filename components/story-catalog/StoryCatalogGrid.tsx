import { StoryCatalogCard } from "@/components/story-catalog/StoryCatalogCard";
import { StoryCatalogEmptyState } from "@/components/story-catalog/StoryCatalogEmptyState";
import type { StoryCatalogTrackingContext } from "@/types/story-catalog-tracking";
import type { StoryAudioBadgeDisplay } from "@/src/components/story/StoryAudioBadge";
import type { StoryCatalogStory } from "@/types/story";

type StoryCatalogGridProps = {
  stories: StoryCatalogStory[];
  trackingSurface?: "category" | "search";
  trackingContext?: StoryCatalogTrackingContext;
  audioBadgeDisplay?: StoryAudioBadgeDisplay;
  query?: string;
};

export function StoryCatalogGrid({
  audioBadgeDisplay,
  query = "",
  stories,
  trackingContext,
  trackingSurface = "category"
}: StoryCatalogGridProps) {
  if (stories.length === 0) {
    return <StoryCatalogEmptyState query={query} />;
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {stories.map((story, index) => (
        <StoryCatalogCard
          audioBadgeDisplay={audioBadgeDisplay}
          key={story.id}
          layout="grid"
          position={index}
          story={story}
          surface={trackingSurface}
          trackingContext={trackingContext}
        />
      ))}
    </div>
  );
}
