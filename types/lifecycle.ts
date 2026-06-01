export const readerLifecycleSegments = [
  "new_user_no_action",
  "reels_viewer_no_follow",
  "reader_no_comment",
  "active_reader",
  "dormant_reader_3d",
  "dormant_reader_7d",
  "early_fan_user",
  "top_fan_user"
] as const;

export const authorLifecycleSegments = [
  "author_no_story",
  "author_first_story_no_chapter",
  "author_has_story_no_recent_update",
  "author_has_comments_unreplied",
  "active_author",
  "author_milestone_ready"
] as const;

export const lifecycleSegments = [
  ...readerLifecycleSegments,
  ...authorLifecycleSegments
] as const;

export type LifecycleSegment = (typeof lifecycleSegments)[number];

export type LifecycleState = {
  id: string;
  userId: string;
  currentSegments: LifecycleSegment[];
  lastActiveAt: string | null;
  lastCalculatedAt: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export const lifecycleNudgeKeys = [
  "new_user_no_action",
  "reels_viewer_no_follow",
  "reader_no_comment",
  "author_no_story",
  "author_has_story_no_recent_update",
  "author_has_comments_unreplied"
] as const;

export type LifecycleNudgeKey = (typeof lifecycleNudgeKeys)[number];

export type LifecycleNudgePlacement = "reels" | "me" | "creator";

export type LifecycleNudgeConfig = {
  key: LifecycleNudgeKey;
  segment: LifecycleSegment;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  placements: LifecycleNudgePlacement[];
  cooldownHours: number;
  dismissCooldownHours: number;
};
