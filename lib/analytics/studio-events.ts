import { analyticsEvents } from "@/lib/analytics/events";

/** Tên sự kiện dùng cho Thống kê Studio (map tới analytics_events.event_name). */
export const studioAnalyticsEvents = {
  chapterComplete: analyticsEvents.chapterCompleted,
  chapterView: analyticsEvents.chapterOpened,
  commentCreate: analyticsEvents.commentCreated,
  creatorFollow: analyticsEvents.followCreator,
  storySave: analyticsEvents.storySaved,
  storyView: analyticsEvents.storyViewed,
  reelsComment: analyticsEvents.reelsCommentOpened,
  reelsCtaClick: analyticsEvents.reelsReadMoreClicked,
  reelsLike: analyticsEvents.reelsLikeClicked,
  reelsSave: analyticsEvents.reelsSaveClicked,
  reelsView: analyticsEvents.reelsItemViewed
} as const;
