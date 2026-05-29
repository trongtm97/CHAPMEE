export type ReportTabStatus =
  | "all"
  | "pending"
  | "reviewing"
  | "resolved"
  | "rejected"
  | "urgent";

export type ReportSeverity = "low" | "medium" | "high" | "urgent";

export type ReportTargetType =
  | "story"
  | "chapter"
  | "episode"
  | "comment"
  | "community_post"
  | "message"
  | "user"
  | "creator"
  | "author_profile"
  | "community_group"
  | "group";

export type ReportReasonCode =
  | "spam"
  | "harassment"
  | "hate_or_abuse"
  | "hate_speech"
  | "sexual_content"
  | "violence"
  | "violence_self_harm"
  | "scam_or_fraud"
  | "impersonation_scam"
  | "copyright"
  | "impersonation"
  | "privacy_violation"
  | "self_harm"
  | "illegal_content"
  | "low_quality_or_misleading"
  | "wrong_age_rating"
  | "other";

export type ReportResolutionCode =
  | "no_violation"
  | "false_report"
  | "insufficient_evidence"
  | "duplicate"
  | "already_handled"
  | "warning_sent"
  | "content_hidden"
  | "content_removed_from_public"
  | "user_restricted"
  | "messaging_restricted"
  | "sent_to_quality_review"
  | "escalated_to_admin"
  | "no_action_needed";

export type ReportCaseActionKind =
  | "assign"
  | "dismiss"
  | "resolve"
  | "hide_content"
  | "warn_user"
  | "escalate"
  | "quality_review";

export type ReportSummary = {
  pending: number;
  reviewing: number;
  highSeverity: number;
  messageReports: number;
  contentReports: number;
  resolvedToday: number;
};

export type ReportCaseQueueItem = {
  caseKey: string;
  moderationCaseId: string | null;
  targetType: ReportTargetType;
  targetId: string;
  title: string;
  primaryReasonCode: ReportReasonCode | string;
  reportCount: number;
  reporterCount: number;
  severity: ReportSeverity;
  reportedUserName: string | null;
  latestReporterName: string | null;
  status: string;
  assignedToName: string | null;
  latestAt: string;
  preview: string | null;
};

export type ReportChildItem = {
  id: string;
  reporterName: string | null;
  reasonCode: string;
  reasonText: string | null;
  createdAt: string;
};

export type ReportCaseDetail = {
  case: ReportCaseQueueItem;
  targetPreview: string | null;
  targetBody: string | null;
  targetHref: string | null;
  reportedUserName: string | null;
  assignedToName: string | null;
  reports: ReportChildItem[];
  targetReportHistory: number;
  userReportHistory: number;
};

export type RecentlyHandledReportItem = {
  id: string;
  title: string;
  targetType: ReportTargetType;
  actionLabel: string;
  moderatorName: string | null;
  resolutionCode: string | null;
  createdAt: string;
};

export type ReportPageData = {
  summary: ReportSummary;
  cases: ReportCaseQueueItem[];
  recentlyHandled: RecentlyHandledReportItem[];
  canModerate: boolean;
  error: string | null;
};

export type ReportFilterState = {
  search: string;
  targetType: ReportTargetType | "all";
  reasonCode: ReportReasonCode | "all";
  severity: ReportSeverity | "all";
  status: ReportTabStatus;
  dateRange: "all" | "today" | "7d" | "30d";
  assignee: string;
  multiReport: "all" | "2plus" | "10plus";
};
