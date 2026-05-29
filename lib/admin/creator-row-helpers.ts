import type { AdminCreatorListRow } from "@/types/admin-creator";

export function formatCreatorContentLine(row: AdminCreatorListRow): string {
  const parts = [
    `${row.storyCount.toLocaleString("vi-VN")} truyện`,
    `${row.chapterCount.toLocaleString("vi-VN")} chương`,
    `${row.totalReads.toLocaleString("vi-VN")} lượt đọc`
  ];
  return parts.join(" · ");
}

export function getCreatorNeedsActionLabels(row: AdminCreatorListRow): string[] {
  const labels: string[] = [];
  if (row.monetizationStatus === "pending_review") {
    labels.push("Chờ duyệt kiếm tiền");
  }
  if (row.monetizationStatus === "suspended") {
    labels.push("Tạm dừng kiếm tiền");
  }
  if (row.monetizationStatus === "rejected") {
    labels.push("Kiếm tiền bị từ chối");
  }
  if (row.pendingPayoutCount > 0) {
    labels.push("Có yêu cầu rút tiền");
  }
  if (row.qualityWarningCount > 0) {
    labels.push("Nội dung chất lượng thấp");
  }
  if (row.hiddenStoryCount > 0) {
    labels.push("Có truyện bị ẩn");
  }
  if (row.violationCount > 0) {
    labels.push("Có vi phạm");
  }
  if (row.monetizationEnabled && !row.payoutEnabled) {
    labels.push("Payout bị tắt");
  }
  if (row.hasActiveWarning && !labels.includes("Có vi phạm")) {
    labels.push("Có cảnh báo");
  }
  return labels;
}

export function getCreatorActionStatusLabel(row: AdminCreatorListRow): string {
  const needs = getCreatorNeedsActionLabels(row);
  return needs.length > 0 ? needs[0] : "Bình thường";
}

export function computeNeedsActionTotal(summary: {
  pendingVerification: number;
  lowQualityContent: number;
  warnedCreators: number;
  pendingPayoutRequests: number;
  pendingMonetization: number;
  monetizationSuspended: number;
}): number {
  return (
    summary.pendingVerification +
    summary.lowQualityContent +
    summary.warnedCreators +
    summary.pendingPayoutRequests +
    summary.pendingMonetization +
    summary.monetizationSuspended
  );
}
