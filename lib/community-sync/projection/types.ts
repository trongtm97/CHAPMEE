import type { InteractionEventType, GroupFeedItemType, SourceEntityType } from "@/lib/community-sync/constants";

/** Bucket key for collapsing activity on the same story source. */
export type AggregationBucket = {
  storyId: string;
  groupId: string;
  sourceEntityType: SourceEntityType;
  sourceEntityId: string;
  eventType: InteractionEventType;
};

export type AggregatedActivityMetadata = {
  count: number;
  windowMinutes: number;
  windowStartedAt: string;
  windowEndedAt: string;
  latestActorUserId: string | null;
  latestCommentId: string | null;
  latestExcerpt: string | null;
  targetUrl: string | null;
};

export type ProjectCommentFeedInput = {
  eventId: string | null;
  eventCreated: boolean;
  groupId: string;
  storyId: string;
  commentId: string;
  actorUserId: string;
  content: string;
  eventType: InteractionEventType;
  itemType: GroupFeedItemType;
  sourceEntityType: SourceEntityType;
  sourceEntityId: string;
  targetUrl: string | null;
  sourceChapterOrder: number | null;
  spoilerLevel: "none" | "mild" | "major";
  moderationStatus: "pending" | "approved" | "flagged" | "hidden" | "rejected";
  visibility: "visible" | "hidden" | "moderated" | "deleted";
  score: number;
  isAuthorReply: boolean;
  excerptMax: number;
  collapseWindowMinutes: number;
  maxIndividualItemsPerWindow: number;
  syncAuthorReplies: boolean;
};

export type ProjectCommentFeedResult = {
  feedItemId: string | null;
  aggregated: boolean;
  individual: boolean;
  skipped: boolean;
  skipReason?: string;
};

export type RebuildProjectionOptions = {
  dryRun?: boolean;
  batchSize?: number;
  offset?: number;
  maxBatches?: number;
  onProgress?: (progress: RebuildProgress) => void;
};

export type RebuildProgress = {
  batch: number;
  offset: number;
  eventsInBatch: number;
  totalScanned: number;
  projected: number;
  aggregated: number;
  individual: number;
  skipped: number;
  errors: number;
};

export type RebuildProjectionResult = {
  dryRun: boolean;
  eventsScanned: number;
  projected: number;
  aggregated: number;
  individual: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  hasMore: boolean;
  nextOffset: number;
};
