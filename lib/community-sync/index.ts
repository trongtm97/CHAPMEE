export {
  SOURCE_ENTITY_TYPES,
  INTERACTION_EVENT_TYPES,
  GROUP_FEED_ITEM_TYPES,
  SYNC_SURFACES,
  GROUP_FEED_FILTERS,
  type SourceEntityType,
  type InteractionEventType,
  type GroupFeedItemType,
  type SyncSurface,
  type ExternalCommentSyncPayload,
  type GroupFeedFilterId
} from "@/lib/community-sync/constants";
export {
  createInteractionEvent,
  projectEventToGroupFeedItem,
  countRecentInteractionEventsForSource,
  upsertAggregatedFeedItem
} from "@/lib/community-sync/interaction-events";
export {
  projectCommentToGroupFeed,
  rebuildGroupFeedProjection,
  replayAggregationBucketProjection
} from "@/lib/community-sync/projection";
export {
  syncCommentToStoryGroup,
  syncReplyToStoryGroup,
  syncAuthorReplyToStoryGroup,
  syncStoryCommentToGroup,
  syncExternalCommentToStoryGroup,
  updateGroupFeedItemVisibilityFromCommentStatus,
  refreshGroupFeedVisibilityForComment
} from "@/lib/community-sync/comment-sync";
export {
  getStoryGroupFeed,
  getStoryGroupFeedByStoryId
} from "@/lib/community-sync/get-story-group-feed";
export {
  getCommunitySyncSettings,
  getCommunitySyncSettingValue,
  isAutoCreateStoryGroupEnabled
} from "@/lib/community-sync/sync-settings";
export {
  syncStoryReviewToGroup,
  getStoryGroupFeedFilterPresence
} from "@/lib/community-sync/review-sync";
export {
  syncReelsCommentToStoryGroup,
  syncAudioCommentToStoryGroup,
  syncAdaptationCommentToStoryGroup
} from "@/lib/community-sync/adapters";
export {
  DEFAULT_COMMUNITY_SYNC_SETTINGS,
  COMMUNITY_SYNC_SETTING_KEYS,
  mergeCommunitySyncSettings
} from "@/lib/community-sync/sync-settings-defaults";
export {
  backfillStoryGroupsForPublishedStories,
  getOrCreateStoryGroup
} from "@/lib/community-sync/story-groups";
