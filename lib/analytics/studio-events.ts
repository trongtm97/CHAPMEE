import { analyticsEvents } from "@/lib/analytics/events";

/**
 * Tên sự kiện dùng cho Thống kê Studio (map tới analytics_events.event_name).
 * Một số alias legacy vẫn được đọc song song trong get-studio-analytics.
 */
export const studioAnalyticsEvents = {
  chapterComplete: analyticsEvents.chapterCompleted,
  chapterView: analyticsEvents.chapterOpened,
  commentCreate: analyticsEvents.commentCreated,
  creatorFollow: analyticsEvents.followCreator,
  storySave: analyticsEvents.storySaved,
  storyView: analyticsEvents.storyViewed,
  swipeComment: analyticsEvents.swipeCommentOpened,
  swipeCtaClick: analyticsEvents.swipeReadMoreClicked,
  swipeLike: analyticsEvents.swipeLikeClicked,
  swipeSave: analyticsEvents.swipeSaveClicked,
  swipeView: analyticsEvents.swipeItemViewed
  // TODO: swipe_to_read_conversion — bắn khi đọc chương sau CTA Swipe
} as const;
