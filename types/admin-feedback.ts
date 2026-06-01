import type {
  FeedbackPriority,
  FeedbackStatus,
  FeedbackType
} from "@/types/contact-settings";

export type FeedbackAssigneeFilter = "all" | "me" | "unassigned";

export type FeedbackDashboardFilters = {
  search: string;
  status: FeedbackStatus | "all";
  category: FeedbackType | "all" | string;
  priority: FeedbackPriority | "all";
  hasScreenshot: "yes" | "no" | "all";
  assignee: FeedbackAssigneeFilter;
  from?: string;
  to?: string;
  userId?: string;
  page: number;
  pageSize: number;
  selectedFeedbackId?: string;
};

export type FeedbackKpiSummary = {
  newCount: number;
  reviewingCount: number;
  needReplyCount: number;
  resolvedTodayCount: number;
  urgentCount: number;
  withAttachmentCount: number;
};

export type FeedbackAdminCapabilities = {
  canView: boolean;
  canUpdateStatus: boolean;
  canAssign: boolean;
  canReply: boolean;
  canExport: boolean;
};

export type AdminFeedbackListItemExtended = import("@/types/contact-settings").AdminFeedbackListItem & {
  code: string | null;
  assigned_admin_label: string | null;
  attachment_count: number;
  user_feedback_count_24h: number;
};

export type AdminFeedbackDetailExtended = import("@/types/contact-settings").AdminFeedbackDetail & {
  code: string | null;
  admin_reply: string | null;
  assigned_admin_label: string | null;
  attachments: import("@/types/contact-settings").FeedbackAttachmentRow[];
  user_avatar_url: string | null;
  user_feedback_count_24h: number;
};
