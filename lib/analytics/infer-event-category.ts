import { analyticsCategories, analyticsEvents } from "@/lib/analytics/events";

export function inferEventCategory(eventName: string) {
  if (
    eventName.startsWith("reels_") ||
    eventName.startsWith("feed_")
  ) {
    return analyticsCategories.reels;
  }
  if (
    [
      analyticsEvents.storyViewed,
      analyticsEvents.chapterOpened,
      analyticsEvents.chapterCompleted,
      analyticsEvents.nextChapterClicked,
      analyticsEvents.readingTimeTracked,
      analyticsEvents.startReading,
      analyticsEvents.completeChap,
      analyticsEvents.nextChapClick,
      analyticsEvents.scroll25,
      analyticsEvents.scroll50,
      analyticsEvents.scroll75
    ].includes(eventName as never)
  ) {
    return analyticsCategories.reading;
  }
  if (
    eventName.startsWith("creator_") ||
    eventName.startsWith("story_created") ||
    eventName.startsWith("chapter_")
  ) {
    return analyticsCategories.creator;
  }
  if (
    eventName.startsWith("comment_") ||
    eventName.startsWith("share_") ||
    eventName.startsWith("author_followed") ||
    eventName.startsWith("story_saved") ||
    eventName.startsWith("story_liked")
  ) {
    return analyticsCategories.social;
  }
  if (eventName.startsWith("onboarding_")) {
    return analyticsCategories.onboarding;
  }
  if (eventName.startsWith("notification_") || eventName.startsWith("referral_")) {
    return analyticsCategories.retention;
  }
  if (
    eventName.startsWith("report_") ||
    eventName.startsWith("content_reported") ||
    eventName.startsWith("moderation_")
  ) {
    return analyticsCategories.moderation;
  }
  if (eventName.startsWith("experiment_")) {
    return analyticsCategories.experiment;
  }
  if (
    eventName.startsWith("taxonomy_") ||
    eventName === analyticsEvents.storyImpression ||
    eventName === analyticsEvents.storyClick ||
    eventName === analyticsEvents.chapterStart ||
    eventName === analyticsEvents.chapterComplete ||
    eventName === analyticsEvents.storySave ||
    eventName === analyticsEvents.storyPurchase ||
    eventName === analyticsEvents.reportWrongTag ||
    eventName === analyticsEvents.reportMissingWarning ||
    eventName === analyticsEvents.taxonomyFilterApply ||
    eventName.startsWith("search_result_")
  ) {
    return analyticsCategories.taxonomy;
  }
  return analyticsCategories.app;
}
