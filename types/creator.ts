import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";

export type CreatorEpisodeWorkflowStatus = "draft" | "pending" | "rejected";

export type CreatorDashboardContinueItem = {
  storyId: string;
  storyTitle: string;
  episodeId: string;
  episodeTitle: string;
  episodeNumber: number;
  updatedAt: string;
  status: CreatorEpisodeWorkflowStatus;
  statusLabel: string;
  editHref: string;
};

export type CreatorScheduledChapter = {
  storyId: string;
  storyTitle: string;
  episodeId: string;
  episodeTitle: string;
  episodeNumber: number;
  publishAt: string;
  statusLabel: string;
  editHref: string;
};

export type CreatorDashboardAlertType =
  | "missing_cover"
  | "missing_description"
  | "draft_no_schedule"
  | "new_comments"
  | "pending_review"
  | "moderation"
  | "rejected_chapter"
  | "content_quality";

export type CreatorDashboardAlert = {
  id: string;
  type: CreatorDashboardAlertType;
  title: string;
  description: string;
  href?: string;
  severity: "info" | "warning";
};

export type CreatorDashboardOverview = {
  activeStories: number;
  draftChapters: number;
  scheduledUpcoming: number;
  reads7d: number;
};

export type CreatorDashboardPerformance7d = {
  reads: number;
  saves: number;
  comments: number;
  newFollowers: number;
};

export type StudioAccountStatusLabel =
  | "active"
  | "pending"
  | "suspended"
  | "limited";

export type StudioVerificationBadgeLabel =
  | "verified"
  | "blue_tick"
  | "unverified"
  | "pending";

export type StudioAccountStatus = {
  statusLabel: StudioAccountStatusLabel;
  statusDisplay: string;
  verificationLabel: StudioVerificationBadgeLabel;
  verificationDisplay: string;
  monetizationDisplay: string | null;
  monetizationEnabled: boolean;
  availableRevenueVnd: number | null;
  qualityDisplay: string;
  qualityHasWarning: boolean;
};

export type StudioTodayActionPriority = "high" | "medium" | "low";

export type StudioTodayAction = {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  priority: StudioTodayActionPriority;
  priorityLabel: string;
};

export type StudioHeroSummaryLine = {
  id: string;
  label: string;
  value: number;
  href?: string;
};

export type StudioAttentionPreviewItem = {
  id: string;
  title: string;
  href: string;
};

export type StudioAttentionGroup = {
  id: string;
  type: CreatorDashboardAlertType | "grouped";
  title: string;
  description: string;
  count: number;
  severity: "info" | "warning" | "error";
  href: string;
  previewItems: StudioAttentionPreviewItem[];
};

export type StudioQuickStat = {
  id: string;
  label: string;
  value: number;
  href?: string;
  deltaPercent: number | null;
  format?: "number" | "currency";
  hint?: string;
};

export type StudioPerformanceTopStory = {
  id: string;
  title: string;
  reads: number;
  href: string;
};

export type StudioPerformanceTopChapter = {
  id: string;
  storyTitle: string;
  episodeNumber: number;
  title: string;
  reads: number;
  href: string;
};

export type StudioPerformanceSnapshot = {
  topStories: StudioPerformanceTopStory[];
  topChapters: StudioPerformanceTopChapter[];
  comments: number;
  newFollowers: number;
  reelsViews: number | null;
};

export type CreatorStudioDashboardData = {
  creatorProfile: CreatorProfile;
  qualityNeedsActionCount: number;
  overview: CreatorDashboardOverview;
  continueWriting: CreatorDashboardContinueItem[];
  scheduledChapters: CreatorScheduledChapter[];
  performance7d: CreatorDashboardPerformance7d;
  /** @deprecated Use attentionGroups */
  alerts: CreatorDashboardAlert[];
  attentionGroups: StudioAttentionGroup[];
  todayActions: StudioTodayAction[];
  quickStats: StudioQuickStat[];
  heroSummary: StudioHeroSummaryLine[];
  accountStatus: StudioAccountStatus;
  performanceSnapshot: StudioPerformanceSnapshot;
  hasStories: boolean;
  writeChapterHref: string;
  writeActionLabel: string;
  writeToolLabel: string;
  defaultStoryId: string | null;
  defaultStorySlug: string | null;
  pendingEpisodes: number;
  pendingStories: number;
  error: string | null;
};
