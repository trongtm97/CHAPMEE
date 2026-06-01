import type {
  CampaignNotificationType,
  CampaignStatus
} from "@/types/platform-content";

export const NOTIFICATION_CAMPAIGN_SEGMENTS = [
  "all_users",
  "readers",
  "creators",
  "creators_with_story",
  "creators_with_published_story",
  "monetization_enabled",
  "monetization_disabled",
  "verified_users",
  "unverified_users",
  "users_with_coin",
  "inactive_7_days",
  "inactive_30_days",
  "new_users_7_days",
  "active_7_days"
] as const;

export type NotificationCampaignSegment = (typeof NOTIFICATION_CAMPAIGN_SEGMENTS)[number];

export const NOTIFICATION_CAMPAIGN_SEGMENT_LABELS: Record<
  NotificationCampaignSegment,
  string
> = {
  all_users: "Tất cả người dùng",
  readers: "Độc giả",
  creators: "Tác giả",
  creators_with_story: "Tác giả có truyện",
  creators_with_published_story: "Tác giả có truyện đã đăng",
  monetization_enabled: "Đã bật kiếm tiền",
  monetization_disabled: "Chưa bật kiếm tiền",
  verified_users: "Đã xác thực",
  unverified_users: "Chưa xác thực",
  users_with_coin: "Đã nạp Coin",
  inactive_7_days: "Không hoạt động 7 ngày",
  inactive_30_days: "Không hoạt động 30 ngày",
  new_users_7_days: "Người dùng mới 7 ngày",
  active_7_days: "Hoạt động trong 7 ngày"
};

export type AdminNotificationCampaignCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canSend: boolean;
  canPause: boolean;
  canCancel: boolean;
  canDelete: boolean;
  canAuditView: boolean;
};

export function buildAdminNotificationCampaignCapabilities(
  permissions: string[]
): AdminNotificationCampaignCapabilities {
  const has = (code: string) => permissions.includes(code);
  const admin = has("admin.dashboard.view");

  return {
    canView: has("notification.campaign.view") || has("notification.view") || admin,
    canCreate: has("notification.campaign.create") || has("notification.create") || admin,
    canUpdate: has("notification.campaign.update") || has("notification.edit") || admin,
    canSend: has("notification.campaign.update") || has("notification.send") || admin,
    canPause: has("notification.campaign.update") || has("notification.pause") || admin,
    canCancel: has("notification.campaign.update") || has("notification.cancel") || admin,
    canDelete: has("notification.campaign.update") || has("notification.delete") || admin,
    canAuditView: has("notification.campaign.view") || has("notification.audit.view") || admin
  };
}

export type NotificationCampaignActionResult = {
  ok: boolean;
  message: string | null;
  id?: string;
};

export type CampaignUserSearchResult = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type NotificationCampaignSort =
  | "updated"
  | "created"
  | "scheduled"
  | "sent"
  | "recipients"
  | "open_rate"
  | "errors";

export type NotificationCampaignChannelFilter = "all" | "in_app" | "push" | "email";

export type NotificationCampaignListFilters = {
  search: string;
  status: "all" | CampaignStatus;
  notificationType: "all" | CampaignNotificationType;
  channel: NotificationCampaignChannelFilter;
  segment: "all" | NotificationCampaignSegment;
  createdFrom: string;
  createdTo: string;
  sentFrom: string;
  sentTo: string;
  sort: NotificationCampaignSort;
  page: number;
  pageSize: number;
};

export const NOTIFICATION_CAMPAIGN_PAGE_SIZE_DEFAULT = 25;

export const NOTIFICATION_CAMPAIGN_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export const CAMPAIGN_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "draft", label: "Nháp" },
  { value: "scheduled", label: "Đã lên lịch" },
  { value: "sending", label: "Đang gửi" },
  { value: "sent", label: "Đã gửi" },
  { value: "paused", label: "Tạm dừng" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "failed", label: "Lỗi" },
  { value: "archived", label: "Lưu trữ" }
] as const;

export const CAMPAIGN_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả loại" },
  { value: "system", label: "Hệ thống" },
  { value: "policy", label: "Chính sách" },
  { value: "monetization", label: "Kiếm tiền" },
  { value: "account", label: "Tài khoản" },
  { value: "story", label: "Truyện" },
  { value: "chapter", label: "Chương" },
  { value: "event", label: "Sự kiện / Tính năng" },
  { value: "warning", label: "Cảnh báo" },
  { value: "marketing", label: "Khuyến mãi" }
] as const;

export const CAMPAIGN_CHANNEL_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả kênh" },
  { value: "in_app", label: "In-app" },
  { value: "push", label: "Push (sắp có)" },
  { value: "email", label: "Email (sắp có)" }
] as const;

export const CAMPAIGN_SEGMENT_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả nhóm" },
  ...NOTIFICATION_CAMPAIGN_SEGMENTS.map((value) => ({
    value,
    label: NOTIFICATION_CAMPAIGN_SEGMENT_LABELS[value]
  }))
] as const;

export const CAMPAIGN_SORT_OPTIONS = [
  { value: "updated", label: "Mới cập nhật" },
  { value: "created", label: "Ngày tạo mới nhất" },
  { value: "scheduled", label: "Ngày lên lịch" },
  { value: "sent", label: "Ngày gửi gần nhất" },
  { value: "recipients", label: "Số người nhận cao nhất" },
  { value: "open_rate", label: "Tỷ lệ mở cao nhất" },
  { value: "errors", label: "Lỗi nhiều nhất" }
] as const;

export type NotificationCampaignStats = {
  total: number;
  draft: number;
  scheduled: number;
  sending: number;
  sent: number;
  paused: number;
  failed: number;
  cancelled: number;
  archived: number;
  avgOpenRate: number;
  latestEstimatedRecipients: number;
};

export const CAMPAIGN_PRIORITY_OPTIONS = [
  { value: "low", label: "Thấp" },
  { value: "normal", label: "Bình thường" },
  { value: "high", label: "Cao" },
  { value: "critical", label: "Khẩn cấp" }
] as const;

export const CAMPAIGN_VISUAL_STYLE_OPTIONS = [
  { value: "default", label: "Mặc định" },
  { value: "info", label: "Thông tin" },
  { value: "success", label: "Thành công" },
  { value: "warning", label: "Cảnh báo" },
  { value: "monetization", label: "Kiếm tiền" },
  { value: "creator", label: "Tác giả" },
  { value: "reader", label: "Độc giả" }
] as const;

export const CAMPAIGN_ACTION_TYPE_OPTIONS = [
  { value: "none", label: "Không có hành động" },
  { value: "page", label: "Mở trang trong app" },
  { value: "story", label: "Mở truyện" },
  { value: "chapter", label: "Mở chương" },
  { value: "reels", label: "Mở Reels" },
  { value: "wallet", label: "Mở ví / Coin" },
  { value: "studio", label: "Mở Studio" },
  { value: "verification", label: "Mở trang xác thực" },
  { value: "announcement", label: "Mở thông báo nền tảng" },
  { value: "content_post", label: "Mở bài viết Content Hub" },
  { value: "community", label: "Mở cộng đồng" }
] as const;

export const CAMPAIGN_AUDIT_ACTION_LABELS: Record<string, string> = {
  create: "Tạo campaign",
  update: "Sửa campaign",
  target_change: "Đổi đối tượng nhận",
  test_send: "Gửi test",
  schedule: "Lên lịch gửi",
  send_now: "Gửi ngay",
  pause: "Tạm dừng",
  cancel: "Hủy",
  delete: "Xóa",
  archive: "Lưu trữ",
  clone: "Nhân bản",
  status_change: "Thay đổi trạng thái",
  bulk_pause: "Tạm dừng hàng loạt",
  bulk_cancel: "Hủy hàng loạt",
  bulk_delete: "Xóa nháp hàng loạt",
  bulk_archive: "Lưu trữ hàng loạt"
};
