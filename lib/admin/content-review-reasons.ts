import type { ContentReviewReasonCode } from "@/types/admin-content-review";

export const CONTENT_REVIEW_REASON_OPTIONS: Array<{
  code: ContentReviewReasonCode;
  label: string;
}> = [
  { code: "missing_required_fields", label: "Thiếu thông tin bắt buộc" },
  { code: "too_short", label: "Nội dung quá ngắn" },
  { code: "hard_to_read", label: "Trình bày khó đọc" },
  { code: "wrong_category", label: "Sai danh mục/thể loại" },
  { code: "duplicate", label: "Nội dung trùng lặp" },
  { code: "spam", label: "Có dấu hiệu spam" },
  { code: "policy_violation", label: "Vi phạm chính sách" },
  { code: "other", label: "Khác" }
];

export function contentReviewReasonLabel(code: string | null | undefined) {
  return (
    CONTENT_REVIEW_REASON_OPTIONS.find((o) => o.code === code)?.label ?? code ?? "—"
  );
}

export const CONTENT_REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  published: "Đã xuất bản",
  rejected: "Từ chối",
  changes_requested: "Yêu cầu sửa",
  draft: "Bản nháp",
  hidden: "Đã ẩn",
  visible: "Hiển thị",
  archived: "Lưu trữ"
};

export const CONTENT_REVIEW_TYPE_LABELS: Record<string, string> = {
  story: "Truyện",
  episode: "Chương",
  community_post: "Cộng đồng",
  comment: "Bình luận"
};
