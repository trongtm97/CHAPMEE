import type {
  VerificationSource,
  VerificationStatus,
  VerificationType
} from "@/types/verification";

export type VerificationSummaryCardKey =
  | "pending"
  | "approved"
  | "blueTick"
  | "officialAccount"
  | "rejected"
  | "revoked"
  | "needsReview"
  | "manualGranted7d";

export type VerificationOperationsSummary = Record<VerificationSummaryCardKey, number>;

export type VerificationStatusFilter =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "revoked"
  | "needs_more_info";

export type VerificationTypeFilter =
  | "all"
  | "author_verified"
  | "official_account"
  | "blue_tick"
  | "organization"
  | "partner"
  | "admin_manual";

export type VerificationSourceFilter =
  | "all"
  | "user_request"
  | "admin_direct"
  | "studio"
  | "moderation";

export type VerificationTimeFilter = "all" | "today" | "7d" | "30d";

export type VerificationSort =
  | "newest"
  | "oldest"
  | "pending_longest"
  | "revenue_priority"
  | "follower_priority";

export type VerificationDashboardFilters = {
  query: string;
  status: VerificationStatusFilter;
  verificationType: VerificationTypeFilter;
  source: VerificationSourceFilter;
  timeRange: VerificationTimeFilter;
  sort: VerificationSort;
  summaryCard: VerificationSummaryCardKey | null;
  page: number;
  pageSize: 25 | 50 | 100;
  selectedId: string | null;
};

export type VerificationListResult = {
  items: import("@/types/verification").AdminVerificationListItem[];
  total: number;
  page: number;
  pageSize: number;
  error: string | null;
};

export type VerificationNoteTag = "normal" | "watch" | "partner" | "risk";

export type VerificationNote = {
  id: string;
  verificationId: string;
  adminId: string;
  adminName: string | null;
  note: string;
  tag: VerificationNoteTag | null;
  createdAt: string;
};

export type VerificationHistoryEntry = {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  note: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
};

export type VerificationAuditEntry = {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  createdAt: string;
};

export type VerificationRiskFlag =
  | "new_account"
  | "email_unverified"
  | "sensitive_username"
  | "has_reports"
  | "has_strikes"
  | "restricted"
  | "no_public_content"
  | "no_studio";

export type VerificationUserProfile = {
  userId: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: string | null;
  accountStatus: string | null;
  createdAt: string | null;
  isAuthor: boolean;
  studioName: string | null;
  storyCount: number;
  followerCount: number;
  readCount: number;
  monetizationStatus: string | null;
  violationStatus: string | null;
  lastActiveAt: string | null;
  communityPostCount: number;
  commentCount: number;
  reportCount: number;
  strikeCount: number;
  revenueVnd: number;
  pendingPayout: boolean;
};

export type VerificationDetail = {
  id: string;
  userId: string;
  verificationType: VerificationType;
  status: VerificationStatus;
  source: VerificationSource;
  publicBadgeEnabled: boolean;
  publicLabel: string | null;
  requestReason: string | null;
  rejectionReason: string | null;
  publicNote: string | null;
  adminNote: string | null;
  revokeReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  revokedAt: string | null;
  revokedById: string | null;
  revokedByName: string | null;
  needsMoreInfoDeadline: string | null;
  createdAt: string;
  updatedAt: string;
  profile: VerificationUserProfile;
  riskFlags: VerificationRiskFlag[];
  usernameRiskWarning: string | null;
  notes: VerificationNote[];
  history: VerificationHistoryEntry[];
  auditLogs: VerificationAuditEntry[];
};

export type VerificationAdminCapabilities = {
  canView: boolean;
  canManage: boolean;
  canGrantManual: boolean;
  canViewInternalNotes: boolean;
  isSupportLimited: boolean;
};

export type VerificationActionType =
  | "approve"
  | "reject"
  | "needs_more_info"
  | "revoke"
  | "grant_manual";

export const VERIFICATION_NOTE_TAG_LABELS: Record<VerificationNoteTag, string> = {
  normal: "Bình thường",
  watch: "Cần theo dõi",
  partner: "Đối tác",
  risk: "Rủi ro"
};

export const VERIFICATION_RISK_LABELS: Record<VerificationRiskFlag, string> = {
  new_account: "Tài khoản mới (dưới 30 ngày)",
  email_unverified: "Chưa xác minh email",
  sensitive_username: "Username nhạy cảm hoặc được bảo lưu",
  has_reports: "Đang có báo cáo",
  has_strikes: "Đang có strike",
  restricted: "Đang bị hạn chế",
  no_public_content: "Chưa có nội dung công khai",
  no_studio: "Chưa có Studio (xin tác giả xác thực)"
};

export const REJECT_REASON_OPTIONS = [
  { value: "insufficient_info", label: "Không đủ thông tin" },
  { value: "identity_unproven", label: "Không chứng minh được danh tính/tác giả" },
  { value: "low_activity", label: "Tài khoản chưa đủ hoạt động" },
  { value: "violation", label: "Có vi phạm" },
  { value: "policy", label: "Không phù hợp chính sách" },
  { value: "other", label: "Khác" }
] as const;

export const REVOKE_REASON_OPTIONS = [
  { value: "policy_violation", label: "Vi phạm chính sách" },
  { value: "impersonation", label: "Giả mạo" },
  { value: "no_longer_official", label: "Không còn là tài khoản chính thức" },
  { value: "owner_request", label: "Chủ thể yêu cầu" },
  { value: "admin_adjustment", label: "Admin điều chỉnh" },
  { value: "other", label: "Khác" }
] as const;
