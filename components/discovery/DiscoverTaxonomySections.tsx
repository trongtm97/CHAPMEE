import Link from "next/link";
import { StoryCarouselSection } from "@/components/discover/StoryCarouselSection";
import { TaxonomyChipSection } from "@/components/discovery/TaxonomyChipSection";
import type { DiscoverStory } from "@/lib/discover/getDiscoverData";
import type { DiscoverTaxonomyPayload } from "@/lib/discovery/types";
import type { StoryCatalogStory } from "@/types/story";

type DiscoverTaxonomySectionsProps = {
  taxonomy: DiscoverTaxonomyPayload;
};

function toDiscoverStory(story: StoryCatalogStory): DiscoverStory {
  return {
    id: story.id,
    title: story.title,
    slug: story.slug,
    publicCode: story.publicCode,
    coverUrl: story.coverUrl,
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
    score: story.score
  };
}

export function DiscoverTaxonomySections({ taxonomy }: DiscoverTaxonomySectionsProps) {
  return (
    <div className="space-y-7 md:space-y-8">
      <TaxonomyChipSection section={taxonomy.featuredGenres} />
      <TaxonomyChipSection section={taxonomy.readerExperiences} />
      <TaxonomyChipSection section={taxonomy.settingTags} />
      <TaxonomyChipSection section={taxonomy.presentationModes} />

      {taxonomy.storySections.map((section) => (
        <StoryCarouselSection
          href={section.seeAllHref}
          key={section.key}
          stories={section.stories.map(toDiscoverStory)}
          title={section.title}
          trackingSurface="discover"
        />
      ))}

      <p className="text-center">
        <Link className="text-xs font-bold text-cyan-200 hover:text-cyan-100" href="/kham-pha">
          Xem tất cả nhóm taxonomy →
        </Link>
      </p>
    </div>
  );
}
