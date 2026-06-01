export const TRACKING_SURFACES = [
  "reels",
  "discover",
  "search",
  "ranking",
  "category",
  "story_detail",
  "chapter_detail",
  "profile",
  "community",
  "notification",
  "other"
] as const;

export type TrackingSurface = (typeof TRACKING_SURFACES)[number];

export const TRACKING_ITEM_TYPES = [
  "story",
  "chapter",
  "reel",
  "author_profile",
  "content_post",
  "announcement",
  "community_post"
] as const;

export type TrackingItemType = (typeof TRACKING_ITEM_TYPES)[number];

export const TRACKING_ACTION_TYPES = [
  "impression",
  "click",
  "open_story",
  "open_chapter",
  "read_start",
  "read_progress",
  "read_complete",
  "next_chapter_click",
  "like",
  "unlike",
  "comment",
  "save",
  "unsave",
  "follow_author",
  "unfollow_author",
  "hide",
  "report",
  "share",
  "unlock_paid",
  "tip",
  "purchase_bundle",
  "scroll_pass",
  "dwell"
] as const;

export type TrackingActionType = (typeof TRACKING_ACTION_TYPES)[number];

export const TRACKING_CANDIDATE_POOLS = [
  "personalized",
  "trending",
  "fresh",
  "new_author",
  "long_tail",
  "followed_author",
  "category",
  "admin_boost"
] as const;

export type TrackingCandidatePool = (typeof TRACKING_CANDIDATE_POOLS)[number];

export type TrackingMetadata = Record<
  string,
  string | number | boolean | null | string[] | number[]
>;

export type TrackingContextFields = {
  itemType: TrackingItemType;
  itemId: string;
  storyId?: string | null;
  chapterId?: string | null;
  reelId?: string | null;
  authorUserId?: string | null;
};

export type TrackExposureInput = TrackingContextFields & {
  surface: TrackingSurface;
  userId?: string | null;
  anonymousId?: string | null;
  position?: number | null;
  sessionId?: string | null;
  algorithmVersion?: string | null;
  candidatePool?: TrackingCandidatePool | string | null;
  requestId?: string | null;
  deviceType?: string | null;
};

export type TrackUserActionInput = TrackingContextFields & {
  surface: TrackingSurface;
  actionType: TrackingActionType;
  userId?: string | null;
  anonymousId?: string | null;
  valueNumeric?: number | null;
  valueText?: string | null;
  metadata?: TrackingMetadata;
  sessionId?: string | null;
  algorithmVersion?: string | null;
};

export type TrackStoryActionMetadata = {
  surface?: TrackingSurface;
  storyId?: string;
  authorUserId?: string | null;
  slug?: string;
  episodeNumber?: number;
  progressPercent?: number;
  candidatePool?: string | null;
  position?: number | null;
  sessionId?: string | null;
  algorithmVersion?: string | null;
  requestId?: string | null;
};
