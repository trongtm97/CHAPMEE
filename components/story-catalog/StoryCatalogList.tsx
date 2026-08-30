import { StoryCatalogCard } from "@/components/story-catalog/StoryCatalogCard";
import { StoryCatalogEmptyState } from "@/components/story-catalog/StoryCatalogEmptyState";
import type { StoryCatalogTrackingContext } from "@/types/story-catalog-tracking";
import type { StoryAudioBadgeDisplay } from "@/src/components/story/StoryAudioBadge";
import type { StoryCatalogStory } from "@/types/story";

type StoryCatalogListProps = {
  stories: StoryCatalogStory[];
  trackingSurface?: "category" | "search";
  trackingContext?: StoryCatalogTrackingContext;
  audioBadgeDisplay?: StoryAudioBadgeDisplay;
  query?: string;
};

export function StoryCatalogList({
  audioBadgeDisplay,
  query = "",
  stories,
  trackingContext,
  trackingSurface = "category"
}: StoryCatalogListProps) {
  if (stories.length === 0) {
    return <StoryCatalogEmptyState query={query} />;
  }

  return (
    <ul className="space-y-2 pb-2">
      {stories.map((story, index) => (
        <li key={story.id}>
          <StoryCatalogCard
            audioBadgeDisplay={audioBadgeDisplay}
            layout="row"
            position={index}
            story={story}
            surface={trackingSurface}
            trackingContext={trackingContext}
          />
        </li>
      ))}
    </ul>
  );
}
