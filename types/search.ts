export const SEARCH_RESULT_TYPES = [
  "story",
  "chapter",
  "author",
  "content_post",
  "tag",
  "category"
] as const;

export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[number];

export type SearchFilterType = "all" | SearchResultType;

export type SearchFilters = {
  type?: SearchFilterType;
  origin?: "all" | "original" | "translation";
  genre?: string;
  page?: number;
  pageSize?: number;
};

export type SearchResultItem = {
  resultType: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  href: string;
  imageUrl: string | null;
  storyId: string | null;
  storySlug: string | null;
  storyPublicCode?: string | null;
  authorUserId: string | null;
  authorUsername: string | null;
  authorDisplayName: string | null;
  episodeNumber: number | null;
  contentOrigin?: "original" | "translation";
  searchScore: number;
  textRelevance: number;
  exactMatchScore: number;
  qualityScore: number;
  freshnessScore: number;
  fairnessScore: number;
  safetyPenalty: number;
};

export type SearchAllResult = {
  query: string;
  requestId: string;
  algorithmVersion: string;
  items: SearchResultItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  countsByType: Partial<Record<SearchResultType, number>>;
  error: string | null;
};
