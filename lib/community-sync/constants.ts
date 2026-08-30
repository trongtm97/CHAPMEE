export const SOURCE_ENTITY_TYPES = {
  chapter: "chapter",
  story: "story",
  reel: "reel",
  audioEpisode: "audio_episode",
  adaptationEpisode: "adaptation_episode",
  trailer: "trailer",
  review: "review",
  comment: "comment"
} as const;

export type SourceEntityType =
  (typeof SOURCE_ENTITY_TYPES)[keyof typeof SOURCE_ENTITY_TYPES];

export const INTERACTION_EVENT_TYPES = {
  commentCreated: "comment_created",
  commentReply: "comment_reply",
  authorReply: "author_reply",
  reviewCreated: "review_created"
} as const;

export type InteractionEventType =
  (typeof INTERACTION_EVENT_TYPES)[keyof typeof INTERACTION_EVENT_TYPES];

export const GROUP_FEED_ITEM_TYPES = {
  comment: "comment",
  authorReply: "author_reply",
  aggregatedComments: "aggregated_comments",
  review: "review"
} as const;

export type GroupFeedItemType =
  (typeof GROUP_FEED_ITEM_TYPES)[keyof typeof GROUP_FEED_ITEM_TYPES];

export const SYNC_SURFACES = {
  storyPage: "story_page",
  chapterReader: "chapter_reader",
  reels: "reels",
  audio: "audio",
  adaptation: "adaptation",
  trailer: "trailer"
} as const;

export type SyncSurface = (typeof SYNC_SURFACES)[keyof typeof SYNC_SURFACES];

/** Wire from audio/adaptation comment modules when available. */
export type ExternalCommentSyncPayload = {
  storyId: string;
  commentId: string;
  sourceEntityType: SourceEntityType;
  sourceEntityId: string;
  actorUserId: string;
  content: string;
  targetUrl?: string | null;
  sourceChapterOrder?: number | null;
  spoilerLevel?: "none" | "mild" | "major";
  metadata?: Record<string, unknown>;
};

export const GROUP_FEED_FILTERS = {
  all: "all",
  chapters: "chapters",
  reels: "reels",
  audio: "audio",
  films: "films",
  reviews: "reviews"
} as const;

export type GroupFeedFilterId =
  (typeof GROUP_FEED_FILTERS)[keyof typeof GROUP_FEED_FILTERS];
