import { getStoryDetailHref } from "@/lib/stories/story-routes";
import type { StoryCatalogStory } from "@/types/story";

export function enrichCatalogStories(stories: StoryCatalogStory[]): StoryCatalogStory[] {
  return stories.map((story) => ({
    ...story,
    href: getStoryDetailHref({ slug: story.slug, public_code: story.publicCode })
  }));
}
