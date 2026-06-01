import { searchAll } from "@/lib/search/search-all";
import type { StoryCatalogStory } from "@/types/story";

export async function searchStoriesForCatalog(input: {
  q: string;
  genre?: string;
  page: number;
  pageSize: number;
}) {
  const result = await searchAll(
    input.q,
    {
      type: "story",
      genre: input.genre,
      page: input.page,
      pageSize: input.pageSize
    },
    null
  );

  const stories: StoryCatalogStory[] = result.items
    .filter((item) => item.resultType === "story")
    .map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.storySlug ?? item.id,
      publicCode: item.storyPublicCode ?? item.storySlug ?? item.id,
      hook: item.description,
      shortDescription: item.description,
      coverUrl: item.imageUrl,
      creatorName: item.authorDisplayName,
      creatorUsername: item.authorUsername,
      genreName: item.subtitle,
      genreSlug: null,
      publishedAt: null,
      isCompleted: false,
      score: item.searchScore
    }));

  return {
    stories,
    totalCount: result.totalCount,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
    requestId: result.requestId
  };
}
