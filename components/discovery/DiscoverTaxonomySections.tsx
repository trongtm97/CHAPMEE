import { DiscoverTaxonomyExplorer } from "@/components/discovery/DiscoverTaxonomyExplorer";
import { StoryCarouselSection } from "@/components/discover/StoryCarouselSection";
import type { DiscoverStory } from "@/lib/discover/getDiscoverData";
import type { DiscoverTaxonomyPayload } from "@/lib/discovery/types";
import type { StoryCatalogStory } from "@/types/story";

type DiscoverTaxonomySectionsProps = {
  taxonomy: DiscoverTaxonomyPayload;
  activeGenre?: string;
  query?: string;
};

function toDiscoverStory(story: StoryCatalogStory): DiscoverStory {
  return {
    id: story.id,
    title: story.title,
    slug: story.slug,
    publicCode: story.publicCode,
    coverUrl: story.coverUrl,
    currentImage: story.currentImage ?? null,
    hook: story.hook,
    shortDescription: story.shortDescription,
    longDescription: null,
    genreName: story.genreName,
    genreSlug: story.genreSlug,
    creatorName: story.creatorName,
    creatorUsername: story.creatorUsername,
    creatorUserId: null,
    isCompleted: story.isCompleted,
    publishedAt: story.publishedAt,
    tagNames: story.tagPreview ?? [],
    score: story.score,
    contentOrigin: story.contentOrigin,
    rightsStatus: story.rightsStatus,
    structureType: story.structureType,
    standaloneReadingTimeMinutes: story.standaloneReadingTimeMinutes
  };
}

export function DiscoverTaxonomySections({
  activeGenre = "",
  query = "",
  taxonomy
}: DiscoverTaxonomySectionsProps) {
  const hasStories = taxonomy.storySections.some((section) => section.stories.length > 0);
  const hasChips =
    taxonomy.featuredGenres.terms.length > 0 ||
    taxonomy.readerExperiences.terms.length > 0 ||
    taxonomy.settingTags.terms.length > 0 ||
    taxonomy.presentationModes.terms.length > 0;

  return (
    <div className="space-y-5 md:space-y-6">
      {hasStories ? (
        <div className="space-y-5 md:space-y-6">
          {taxonomy.storySections.map((section) =>
            section.stories.length > 0 ? (
              <StoryCarouselSection
                href={section.seeAllHref}
                key={section.key}
                stories={section.stories.map(toDiscoverStory)}
                subtitle="Gợi ý từ nhãn taxonomy"
                title={section.title}
                trackingSurface="discover"
              />
            ) : null
          )}
        </div>
      ) : null}

      {hasChips ? (
        <DiscoverTaxonomyExplorer activeGenre={activeGenre} query={query} taxonomy={taxonomy} />
      ) : null}
    </div>
  );
}
