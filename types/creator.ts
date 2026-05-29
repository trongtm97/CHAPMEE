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

export type CreatorStudioDashboardData = {
  creatorProfile: CreatorProfile;
  qualityNeedsActionCount: number;
  overview: CreatorDashboardOverview;
  continueWriting: CreatorDashboardContinueItem[];
  scheduledChapters: CreatorScheduledChapter[];
  performance7d: CreatorDashboardPerformance7d;
  alerts: CreatorDashboardAlert[];
  hasStories: boolean;
  writeChapterHref: string;
  defaultStoryId: string | null;
  defaultStorySlug: string | null;
  error: string | null;
};
