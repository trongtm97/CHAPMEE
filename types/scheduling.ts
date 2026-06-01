export type ScheduledTargetType = "story" | "chapter" | "reels";

export function isReelsScheduledTarget(targetType: ScheduledTargetType): boolean {
  return targetType === "reels";
}

export type ScheduledPublicationStatus =
  | "scheduled"
  | "published"
  | "canceled"
  | "failed";

export type SchedulePublishMode = "draft" | "publish_now" | "schedule";

export type CalendarListTab =
  | "upcoming"
  | "today"
  | "published"
  | "failed"
  | "canceled"
  | "all";

export type CalendarContentFilter = "all" | ScheduledTargetType;

export type CalendarTimeFilter = "all" | "today" | "7d" | "30d" | "month";

export type CalendarViewMode = "list" | "week" | "month";

export const CALENDAR_PAGE_SIZE_DEFAULT = 15;
export const CALENDAR_PAGE_SIZES = [10, 15, 20] as const;
export type CalendarPageSize = (typeof CALENDAR_PAGE_SIZES)[number];

export type CalendarStats = {
  upcoming: number;
  today: number;
  published7d: number;
  failed: number;
  canceled: number;
};

export type CalendarScheduleSource = "manual" | "editor" | "import";

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
  storyStructureType?: "chaptered" | "standalone" | null;
  storyTitle: string | null;
  storySlug: string | null;
  chapterTitle: string | null;
  chapterNumber: number | null;
  reelTitle: string | null;
  displayTitle: string;
  scheduledAt: string;
  timezone: string;
  status: ScheduledPublicationStatus;
  publishAttempts: number;
  lastError: string | null;
  publishedAt: string | null;
  canceledAt: string | null;
  editHref: string | null;
  draftHref: string | null;
  previewHref: string | null;
  sourceLabel: string;
  isScheduledToday: boolean;
  friendlyScheduleLabel: string;
};

export const STUDIO_DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
