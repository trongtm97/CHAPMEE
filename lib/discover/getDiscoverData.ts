import type { DiscoverUpdateItem } from "@/lib/discover/latest-updates";
import type { DiscoverSectionView } from "@/lib/discover/getDiscoverSections";
import type { DiscoverTaxonomyPayload } from "@/lib/discovery/types";
import type { StoryImage } from "@/types/story-images";

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
  currentImage?: StoryImage | null;
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
  contentOrigin?: "original" | "translation";
  rightsStatus?: string | null;
  hasPublishedAudio?: boolean;
  hasContinuousPlayback?: boolean;
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
  latestUpdates: DiscoverUpdateItem[];
  taxonomy: DiscoverTaxonomyPayload | null;
  requestId: string | null;
  algorithmVersion: string | null;
  poolCounts: Record<string, number>;
  error: string | null;
  filmTab: {
    items: import("@/src/lib/film-adaptations/public-films").PublicFilmAdaptation[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  } | null;
};

type DiscoverParams = {
  query?: string;
  genre?: string;
  tab?: string;
  page?: number;
};

export async function getDiscoverData(
  params: DiscoverParams = {},
  options?: { userId?: string | null }
): Promise<DiscoverData> {
  const query = params.query?.trim() ?? "";
  const tab = (params.tab ?? "").trim().toLowerCase();
  const page = Number.isFinite(params.page) ? Math.max(1, Math.floor(params.page ?? 1)) : 1;
  const isFilmTab = tab === "films";

  if (query && !isFilmTab) {
    const { getDiscoverSearchResults } = await import("@/lib/discovery/discover-search");
    const search = await getDiscoverSearchResults({
      query,
      genre: params.genre,
      limit: 24
    });
    const { enrichDiscoverStories } = await import("@/src/lib/audio/audio-summary");
    const searchResults = await enrichDiscoverStories(search.stories);

    return {
      genres: search.genres,
      searchResults,
      sections: [],
      latestUpdates: [],
      taxonomy: null,
      requestId: "discover-search",
      algorithmVersion: "search",
      poolCounts: {},
      error: null,
      filmTab: null
    };
  }

  const { getDiscoverSections } = await import("@/lib/discover/getDiscoverSections");
  const { getDiscoverTaxonomySections } = await import("@/lib/discovery/get-discover-taxonomy");
  const [sections, taxonomy, filmTab, latestUpdates] = await Promise.all([
    getDiscoverSections(options?.userId ?? null, {
      query: params.query,
      genre: params.genre
    }),
    getDiscoverTaxonomySections().catch(() => null),
    isFilmTab
      ? import("@/src/lib/film-adaptations/public-films").then((module) =>
          module.getDiscoverPublishedFilms({ page, pageSize: 12 })
        )
      : Promise.resolve(null),
    isFilmTab
      ? Promise.resolve([])
      : import("@/lib/discover/latest-updates").then((module) =>
          module.getDiscoverLatestUpdates({ limit: 20 })
        )
  ]);

  return {
    ...sections,
    taxonomy,
    filmTab,
    latestUpdates
  };
}
