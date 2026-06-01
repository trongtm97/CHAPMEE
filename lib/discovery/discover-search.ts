import { searchStoriesForCatalog } from "@/lib/search/catalog-bridge";
import { loadDiscoverGenresFromTaxonomy } from "@/lib/taxonomy/discover-bridge";
import type { DiscoverStory } from "@/lib/discover/getDiscoverData";
import { createPublicClient } from "@/lib/supabase/public-client";
import type { StoryCatalogStory } from "@/types/story";

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
    score: story.score,
    feed: {
      requestId: "discover-search",
      algorithmVersion: "search",
      candidatePool: "category",
      rankPosition: 0,
      sectionKey: "search"
    }
  };
}

export async function getDiscoverSearchResults(input: {
  query: string;
  genre?: string;
  limit?: number;
}) {
  const q = input.query.trim();
  if (!q) {
    return { stories: [] as DiscoverStory[], genres: [] };
  }

  const supabase = createPublicClient();
  const [search, genres] = await Promise.all([
    searchStoriesForCatalog({
      q,
      genre: input.genre,
      page: 1,
      pageSize: input.limit ?? 24
    }),
    loadDiscoverGenresFromTaxonomy(supabase)
  ]);

  return {
    stories: search.stories.map(toDiscoverStory),
    genres: genres.map((genre) => ({
      id: genre.id,
      name: genre.name,
      slug: genre.slug,
      description: genre.description
    }))
  };
}
