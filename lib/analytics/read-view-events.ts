import { analyticsEvents } from "@/lib/analytics/events";

/** Story detail / catalog opens — target_id is story UUID. */
export const STORY_VIEW_EVENT_NAMES = [
  analyticsEvents.openStory,
  analyticsEvents.storyViewed,
  "open_story",
  "story_viewed"
] as const;

/** Chapter / episode reads — target_id is episode UUID. */
export const CHAPTER_VIEW_EVENT_NAMES = [
  analyticsEvents.chapterOpened,
  analyticsEvents.startReading,
  "chapter_opened",
  "start_reading"
] as const;

/** Reels impressions — target_id is reel item or episode UUID. */
export const REELS_VIEW_EVENT_NAMES = [
  analyticsEvents.reelsItemViewed,
  analyticsEvents.feedImpression,
  "reels_item_viewed",
  "feed_impression"
] as const;

/** Bài viết / content hub — target_id is post UUID. */
export const CONTENT_POST_VIEW_EVENT_NAMES = [
  analyticsEvents.contentPostViewed,
  "content_post_viewed"
] as const;

/** Tiện ích — target_id is utility slug (e.g. dem-tu-ky-tu). */
export const UTILITY_USE_EVENT_NAMES = [
  analyticsEvents.utilityUsed,
  "utility_used"
] as const;

export const STORY_AND_CHAPTER_VIEW_EVENT_NAMES = [
  ...STORY_VIEW_EVENT_NAMES,
  ...CHAPTER_VIEW_EVENT_NAMES
] as const;
