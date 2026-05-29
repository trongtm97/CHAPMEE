import type { MessageReportReasonCode } from "@/types/messages";

export type MessagingDateRange = "24h" | "7d" | "30d" | "all";

export type MessagingRiskTab =
  | "overview"
  | "reports"
  | "risky"
  | "blocked"
  | "restrictions"
  | "settings"
  | "audit";

export type MessagingReportStatusFilter =
  | "all"
  | "open"
  | "reviewing"
  | "resolved"
  | "rejected";

export type MessagingRiskLevelFilter =
  | "all"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type MessagingRoleFilter = "all" | "reader" | "creator";

export type MessagingAccountAgeFilter = "all" | "new";

export type MessagingSafetyStatusFilter = "all" | "warning" | "blocked" | "review";

export type MessagingSafetyReasonFilter =
  | "all"
  | "spam_link"
  | "scam"
  | "profanity"
  | "harassment"
  | "external_contact";

export type MessagingRiskOverview = {
  openReports: number;
  blockedMessages24h: number;
  requestsToday: number;
  restrictedUsers: number;
  linkSpamBlocked24h: number;
  newAccountAlerts24h: number;
  heavilyReportedUsers: number;
  authorSpamReports24h: number;
};

export type RiskyMessageUser = {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  accountCreatedAt: string;
  accountAgeHours: number;
  openReports7d: number;
  safetyBlockedCount: number;
  safetyWarningCount: number;
  requests24h: number;
  duplicateSpamCount: number;
  blocksReceived: number;
  riskScore: number;
  activeRestriction: string | null;
};

export type MessageSafetyLogItem = {
  id: string;
  userId: string;
  displayName: string;
  username: string | null;
  conversationId: string | null;
  messageRequestId: string | null;
  textPreview: string;
  status: "warning" | "blocked" | "review";
  reasons: string[];
  createdAt: string;
};

export type MessageUserRiskDetail = {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  accountCreatedAt: string;
  openReports: number;
  reports7d: number;
  blocksReceived: number;
  safetyBlocked: number;
  safetyWarnings: number;
  requests24h: number;
  riskScore: number;
  activeRestrictions: {
    id: string;
    restrictionType: string;
    reason: string | null;
    endsAt: string | null;
  }[];
  recentReports: {
    id: string;
    reasonCode: MessageReportReasonCode;
    status: string;
    createdAt: string;
    reporterName: string;
  }[];
};

export type MessagingDashboardFilters = {
  range: MessagingDateRange;
  reportReason: MessageReportReasonCode | "all";
  reportStatus: MessagingReportStatusFilter;
  riskLevel: MessagingRiskLevelFilter;
  safetyStatus: MessagingSafetyStatusFilter;
  safetyReason: MessagingSafetyReasonFilter;
  role: MessagingRoleFilter;
  accountAge: MessagingAccountAgeFilter;
  tab: MessagingRiskTab;
  search: string;
};
