export type ScheduledTargetType = "story" | "chapter" | "swipe";

export type ScheduledPublicationStatus =
  | "scheduled"
  | "published"
  | "canceled"
  | "failed";

export type SchedulePublishMode = "draft" | "publish_now" | "schedule";

export type CalendarListTab = "upcoming" | "published" | "failed" | "canceled";

/** @deprecated Dùng `PublishChecklistRule` từ `@/types/publish-checklist`. */
export type PublishChecklistItem = {
  id: string;
  label: string;
  passed: boolean;
};

export type ScheduledPublicationListItem = {
  id: string;
  targetType: ScheduledTargetType;
  targetId: string;
  storyId: string | null;
  storyTitle: string | null;
  chapterTitle: string | null;
  chapterNumber: number | null;
  scheduledAt: string;
  timezone: string;
  status: ScheduledPublicationStatus;
  publishAttempts: number;
  lastError: string | null;
  publishedAt: string | null;
  canceledAt: string | null;
  editHref: string | null;
  draftHref: string | null;
};

export const STUDIO_DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
