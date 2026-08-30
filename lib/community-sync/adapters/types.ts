import type { SourceEntityType, SyncSurface } from "@/lib/community-sync/constants";

/** Payload for syncing external-surface comments into a story group. */
export type CommunitySyncAdapterPayload = {
  storyId: string;
  commentId: string;
  actorUserId: string;
  content: string;
  surface: SyncSurface;
  sourceEntityType: SourceEntityType;
  sourceEntityId: string;
  targetUrl: string | null;
  episodeId?: string | null;
  sourceChapterOrder?: number | null;
  spoilerLevel?: "none" | "mild" | "major";
  metadataJson?: Record<string, unknown>;
  parentCommentId?: string | null;
  moderationStatus?: string | null;
  spamSuspected?: boolean;
};

export type ReelsCommentSyncContext = {
  storyId: string;
  reelItemId: string;
  chapterId?: string | null;
  reelSlug?: string | null;
  reelPublicCode?: string | null;
  reelHref?: string | null;
  contentSource?: "chapter" | "story";
};

export type AudioCommentSyncContext = {
  storyId: string;
  audioItemId: string;
  commentId: string;
  actorUserId: string;
  content: string;
  timestampSeconds?: number | null;
  chapterId?: string | null;
  parentCommentId?: string | null;
  moderationStatus?: string | null;
  spamSuspected?: boolean;
};

export type AdaptationCommentSyncContext = {
  storyId: string;
  filmAdaptationId: string;
  commentId: string;
  actorUserId: string;
  content: string;
  relationType?: "adaptation" | "trailer";
  chapterId?: string | null;
  parentCommentId?: string | null;
  moderationStatus?: string | null;
  spamSuspected?: boolean;
};

export type StoryGroupFeedFilterId =
  | "all"
  | "chapters"
  | "reels"
  | "audio"
  | "films"
  | "reviews";

export type StoryGroupFeedFilterPresence = {
  hasChapters: boolean;
  hasReels: boolean;
  hasAudio: boolean;
  hasFilms: boolean;
  hasReviews: boolean;
};
