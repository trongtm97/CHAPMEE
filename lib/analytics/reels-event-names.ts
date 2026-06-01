/** Canonical Reels analytics event names stored in `analytics_events.event_name`. */
export const REELS_ANALYTICS_EVENT_NAMES = [
  "reels_feed_viewed",
  "reels_item_viewed",
  "reels_item_changed",
  "reels_read_more_clicked",
  "reels_like_clicked",
  "reels_save_clicked",
  "reels_comment_opened",
  "reels_share_clicked",
  "reels_follow_author_clicked"
] as const;

/** Parallel feed_* events emitted alongside Reels (same surface, different pipeline). */
export const REELS_FEED_ALIAS_EVENT_NAMES = [
  "feed_impression",
  "feed_read_more",
  "feed_save",
  "feed_follow",
  "feed_comment",
  "feed_share",
  "feed_skip",
  "feed_dwell_time"
] as const;

export function reelsViewEventNames() {
  return ["reels_item_viewed", "reels_feed_viewed", "feed_impression"] as const;
}

export function reelsReadMoreEventNames() {
  return ["reels_read_more_clicked", "feed_read_more"] as const;
}

export function reelsLikeEventNames() {
  return ["reels_like_clicked"] as const;
}

export function reelsSaveEventNames() {
  return ["reels_save_clicked", "feed_save"] as const;
}

export function reelsFollowEventNames() {
  return ["reels_follow_author_clicked", "feed_follow", "follow_creator"] as const;
}

export function reelsCommentEventNames() {
  return ["reels_comment_opened", "feed_comment", "comment_created"] as const;
}

export function reelsShareEventNames() {
  return ["reels_share_clicked", "feed_share", "share_clicked"] as const;
}

export function reelsFeedViewedEventNames() {
  return ["reels_feed_viewed"] as const;
}

/** All event names used when aggregating Reels KPIs in admin/studio dashboards. */
export function allReelsDashboardEventNames() {
  return [...REELS_ANALYTICS_EVENT_NAMES, ...REELS_FEED_ALIAS_EVENT_NAMES];
}
