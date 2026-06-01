import type { DiscoverSectionView } from "@/lib/discover/getDiscoverSections";
import type { DiscoverTaxonomyPayload } from "@/lib/discovery/types";

export type { DiscoverSectionView };

export type DiscoverGenre = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type DiscoverStory = {
  id: string;
  title: string;
  slug: string;
  publicCode: string;
  structureType?: "chaptered" | "standalone";
  episodeCount?: number;
  standaloneReadingTimeMinutes?: number;
  coverUrl: string | null;
  hook: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  genreName: string | null;
  genreSlug: string | null;
  creatorName: string | null;
  creatorUsername: string | null;
  creatorUserId: string | null;
  isCompleted: boolean;
  publishedAt: string | null;
  tagNames: string[];
  score: number;
  feed?: import("@/types/feed-mixer").FeedDeliveryMeta;
};

export type DiscoverCreatorSpotlight = {
  id: string;
  displayName: string;
  username: string | null;
  storyCount: number;
};

export type DiscoverData = {
  genres: DiscoverGenre[];
  searchResults: DiscoverStory[];
  sections: DiscoverSectionView[];
  taxonomy: DiscoverTaxonomyPayload | null;
  requestId: string | null;
  algorithmVersion: string | null;
  poolCounts: Record<string, number>;
  error: string | null;
};

type DiscoverParams = {
  query?: string;
  genre?: string;
};

export async function getDiscoverData(
  params: DiscoverParams = {},
  options?: { userId?: string | null }
): Promise<DiscoverData> {
  const query = params.query?.trim() ?? "";

  if (query) {
    const { getDiscoverSearchResults } = await import("@/lib/discovery/discover-search");
    const search = await getDiscoverSearchResults({
      query,
      genre: params.genre,
      limit: 24
    });
    return {
      genres: search.genres,
      searchResults: search.stories,
      sections: [],
      taxonomy: null,
      requestId: "discover-search",
      algorithmVersion: "search",
      poolCounts: {},
      error: null
    };
  }

  const { getDiscoverSections } = await import("@/lib/discover/getDiscoverSections");
  const { getDiscoverTaxonomySections } = await import("@/lib/discovery/get-discover-taxonomy");
  const [sections, taxonomy] = await Promise.all([
    getDiscoverSections(options?.userId ?? null, {
      query: params.query,
      genre: params.genre
    }),
    getDiscoverTaxonomySections().catch(() => null)
  ]);

  return {
    ...sections,
    taxonomy
  };
}
