export const VERIFICATION_TYPES = [
  "author_verified",
  "official_account",
  "blue_tick",
  "organization",
  "partner",
  "admin_manual",
  "identity_verified",
  "notable_author",
  "brand_account"
] as const;

export type VerificationType = (typeof VERIFICATION_TYPES)[number];

export const ADMIN_VERIFICATION_TYPES = [
  "author_verified",
  "official_account",
  "blue_tick",
  "organization",
  "partner",
  "admin_manual"
] as const;

export type AdminVerificationType = (typeof ADMIN_VERIFICATION_TYPES)[number];

export const VERIFICATION_STATUSES = [
  "none",
  "pending",
  "approved",
  "rejected",
  "revoked",
  "needs_more_info",
  "expired"
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VERIFICATION_SOURCES = [
  "user_request",
  "admin_direct",
  "studio",
  "moderation"
] as const;

export type VerificationSource = (typeof VERIFICATION_SOURCES)[number];

export const VERIFICATION_TYPE_LABELS: Record<VerificationType, string> = {
  author_verified: "Tác giả xác thực",
  official_account: "Tài khoản chính thức",
  blue_tick: "Tick xanh",
  organization: "Tổ chức",
  partner: "Đối tác",
  admin_manual: "Admin cấp thủ công",
  identity_verified: "Tác giả xác thực",
  notable_author: "Tác giả xác thực",
  brand_account: "Tổ chức"
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  none: "Chưa xác thực",
  pending: "Chờ duyệt",
  approved: "Đã xác thực",
  rejected: "Bị từ chối",
  revoked: "Đã thu hồi",
  needs_more_info: "Cần bổ sung",
  expired: "Hết hạn"
};

export const VERIFICATION_SOURCE_LABELS: Record<VerificationSource, string> = {
  user_request: "Người dùng gửi",
  admin_direct: "Admin cấp trực tiếp",
  studio: "Từ trang Tác giả",
  moderation: "Từ kiểm duyệt"
};

export type AccountVerificationRow = {
  id: string;
  user_id: string;
  verification_type: VerificationType;
  status: VerificationStatus;
  source: VerificationSource;
  display_badge: boolean;
  public_label: string | null;
  request_reason: string | null;
  rejection_reason: string | null;
  public_note: string | null;
  admin_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  revoke_reason: string | null;
  needs_more_info_deadline: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicVerificationBadge = {
  type: VerificationType;
  label: string;
};

export type UserVerificationSummary = {
  records: AccountVerificationRow[];
  publicBadge: PublicVerificationBadge | null;
  requestsEnabled: boolean;
  latestPending: AccountVerificationRow | null;
  latestRejected: AccountVerificationRow | null;
  latestRevoked: AccountVerificationRow | null;
};

export type AdminVerificationListItem = {
  id: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  isAuthor: boolean;
  verificationType: VerificationType;
  status: VerificationStatus;
  source: VerificationSource;
  publicBadgeEnabled: boolean;
  publicLabel: string | null;
  requestReason: string | null;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type AdminVerificationTab =
  | "pending"
  | "approved"
  | "rejected"
  | "revoked"
  | "all";

export type AdminVerificationQueueResult = {
  items: AdminVerificationListItem[];
  counts: Record<AdminVerificationTab, number>;
  error: string | null;
};
