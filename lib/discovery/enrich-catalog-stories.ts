import { getLegacyStoryPath, getStoryUrl } from "@/lib/urls/paths";
import type { StoryCatalogStory } from "@/types/story";

function buildCatalogStoryHref(story: StoryCatalogStory): string {
  const publicCode = story.publicCode?.trim();
  if (publicCode) {
    return getStoryUrl({ slug: story.slug, public_code: publicCode });
  }
  return getLegacyStoryPath(story.slug);
}

export function enrichCatalogStories(stories: StoryCatalogStory[]): StoryCatalogStory[] {
  return stories.map((story) => ({
    ...story,
    href: buildCatalogStoryHref(story)
  }));
}
