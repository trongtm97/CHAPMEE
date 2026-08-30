export type {
  AggregationBucket,
  AggregatedActivityMetadata,
  ProjectCommentFeedInput,
  ProjectCommentFeedResult,
  RebuildProgress,
  RebuildProjectionOptions,
  RebuildProjectionResult
} from "@/lib/community-sync/projection/types";

export {
  buildAggregationBucket,
  countEventsInAggregationBucket,
  countIndividualFeedItemsForSource,
  getLatestEventInBucket,
  shouldUseAggregation,
  buildAggregatedExcerpt,
  pickSafeLatestExcerpt,
  isSurfacedEventType,
  isBlockedModeration
} from "@/lib/community-sync/projection/aggregation-bucket";

export {
  upsertAggregatedActivityItem,
  upsertAggregatedActivityFromBucket,
  buildIndividualExcerpt
} from "@/lib/community-sync/projection/aggregate-feed-item";

export { projectCommentToGroupFeed } from "@/lib/community-sync/projection/project-from-event";

export {
  rebuildGroupFeedProjection,
  replayAggregationBucketProjection
} from "@/lib/community-sync/projection/rebuild-projection";
