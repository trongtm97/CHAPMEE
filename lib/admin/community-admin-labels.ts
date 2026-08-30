import type {
  CommunityPostStatus,
  CommunityPostType,
  CommunityRejectReasonCode,
  CommunityRiskLevel
} from "@/types/community-admin";

export const COMMUNITY_POST_TYPE_LABELS: Record<CommunityPostType, string> = {
  discussion: "Thảo luận",
  review: "Review",
  poll_placeholder: "Poll",
  challenge: "Challenge"
};

export const COMMUNITY_POST_STATUS_LABELS: Record<CommunityPostStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Đã từ chối",
  hidden: "Đã ẩn"
};

export const COMMUNITY_RISK_LABELS: Record<CommunityRiskLevel, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao"
};

export const COMMUNITY_REJECT_REASON_OPTIONS: Array<{
  code: CommunityRejectReasonCode;
  label: string;
}> = [
  { code: "spam", label: "Spam/rác" },
  { code: "wrong_group", label: "Sai nhóm/sai chủ đề" },
  { code: "provocative", label: "Nội dung gây hấn" },
  { code: "profanity", label: "Nội dung tục tĩu" },
  { code: "external_link", label: "Quảng cáo/link ngoài" },
  { code: "spoiler", label: "Spoiler không cảnh báo" },
  { code: "policy", label: "Vi phạm chính sách" },
  { code: "low_effort", label: "Nội dung quá sơ sài" },
  { code: "other", label: "Khác" }
];

export function communityRejectReasonLabel(code: string | null | undefined) {
  return (
    COMMUNITY_REJECT_REASON_OPTIONS.find((o) => o.code === code)?.label ?? code ?? ""
  );
}

export const COMMUNITY_AUDIT_ACTIONS = [
  "community_post_approved",
  "community_post_rejected",
  "community_post_hidden",
  "community_post_restored",
  "community_post_pinned",
  "community_post_unpinned",
  "community_post_featured",
  "community_post_unfeatured",
  "community_comments_locked",
  "community_comments_unlocked",
  "community_group_restricted",
  "community_group_unrestricted",
  "community_group_hidden_from_recommendation",
  "community_poll_closed",
  "community_challenge_closed",
  "community_spam_rule_updated",
  "community_sync_setting_updated",
  "community_sync_settings_saved",
  "community_sync_backfill_dry_run",
  "community_sync_backfill_apply",
  "community_sync_rebuild_projection_dry_run",
  "community_sync_rebuild_projection_apply",
  "community_post_approve"
] as const;

export function communityAuditActionLabel(action: string) {
  const map: Record<string, string> = {
    community_post_approved: "Đã duyệt bài",
    community_post_approve: "Đã duyệt bài",
    community_post_rejected: "Từ chối bài",
    community_post_hidden: "Ẩn bài",
    community_post_restored: "Khôi phục bài",
    community_post_pinned: "Ghim bài",
    community_post_unpinned: "Bỏ ghim",
    community_post_featured: "Nổi bật",
    community_post_unfeatured: "Bỏ nổi bật",
    community_comments_locked: "Khóa bình luận",
    community_comments_unlocked: "Mở bình luận",
    community_group_restricted: "Hạn chế nhóm",
    community_group_unrestricted: "Mở nhóm",
    community_group_hidden_from_recommendation: "Ẩn nhóm khỏi đề xuất",
    community_poll_closed: "Đóng poll",
    community_challenge_closed: "Kết thúc challenge",
    community_spam_rule_updated: "Cập nhật cấu hình spam",
    community_sync_setting_updated: "Cập nhật setting đồng bộ nhóm truyện",
    community_sync_settings_saved: "Lưu cấu hình đồng bộ nhóm truyện",
    community_sync_backfill_dry_run: "Dry-run backfill nhóm truyện",
    community_sync_backfill_apply: "Backfill nhóm truyện",
    community_sync_rebuild_projection_dry_run: "Dry-run rebuild feed projection",
    community_sync_rebuild_projection_apply: "Rebuild feed projection"
  };
  return map[action] ?? action;
}

export const DEFAULT_COMMUNITY_SPAM_SETTINGS = {
  maxPostsPerDayNewUser: 5,
  maxCommentsPerHour: 30,
  preModerateExternalLinks: true,
  preModerateNewUsers: true,
  blockedKeywords: [] as string[],
  reviewKeywords: [] as string[],
  reportQueueThreshold: 2,
  autoHideReportThreshold: 10
};
