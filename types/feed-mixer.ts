export const CANDIDATE_POOL_IDS = [
  "personalized",
  "trending_quality",
  "fresh",
  "new_author",
  "under_exposed",
  "long_tail_quality",
  "followed_author",
  "category",
  "admin_boost",
  "growing",
  "completed_story",
  "cold_start",
  "original_pool",
  "translation_pool",
  "mixed_pool"
] as const;

export type CandidatePoolId = (typeof CANDIDATE_POOL_IDS)[number];

export type FeedSurface = "reels" | "discover" | "search" | "ranking";

export type FeedItemKind = "episode" | "manual" | "story_description";

export type FeedCandidate = {
  pool: CandidatePoolId;
  itemType: "story" | "chapter" | "reel";
  itemId: string;
  kind?: FeedItemKind;
  storyId: string;
  authorUserId: string;
  creatorId: string | null;
  genreName: string | null;
  genreSlug: string | null;
  mainGenreTermId?: string | null;
  taxonomyTermIds?: string[];
  presentationModeSlug?: string | null;
  publishedAt: string | null;
  mixerScore: number;
  qualityScore: number;
  discoveryScore: number;
  freshnessScore: number;
  scoreBase?: number;
  boostScore?: number;
  contentOrigin?: "original" | "translation";
  rightsStatus?: string | null;
  selectionReason?: string | null;
  isCompleted?: boolean;
};

export type CandidatePools = Partial<Record<CandidatePoolId, FeedCandidate[]>>;

export type FeedMixerContext = {
  surface: FeedSurface;
  userId: string | null;
  genreSlug?: string | null;
  categorySlug?: string | null;
  query?: string;
  section?: DiscoverSectionId;
  excludeKeys?: Set<string>;
  recentlySeenKeys?: Set<string>;
  shuffleSeed?: number;
};

export type DiscoverSectionId =
  | "recommended"
  | "hot24h"
  | "hot7d"
  | "newStories"
  | "updatedStories"
  | "completedStories"
  | "shortReads"
  | "searchResults";

export type PoolWeights = Partial<Record<CandidatePoolId, number>>;

export type FeedDeliveryMeta = {
  requestId: string;
  candidatePool: CandidatePoolId;
  algorithmVersion: string;
  rankPosition?: number;
  sectionKey?: string;
};

export type ReelsFeedCursorPayload = {
  v: 1;
  requestId: string;
  offset: number;
  seenKeys: string[];
  shuffleSeed?: number;
};

export type ReelsFeedResult = {
  items: import("@/lib/reels/getReelsItems").ReelsItem[];
  error: string | null;
  hasMore: boolean;
  nextOffset: number;
  nextCursor: string | null;
  requestId: string;
  algorithmVersion: string;
  poolCounts: Record<string, number>;
};
