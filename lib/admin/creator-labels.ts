import type { CreatorMonetizationStatus } from "@/types/creator-monetization";
import type { CreatorStudioStatus } from "@/types/admin-creator";

export function formatMonetizationStatusLabel(
  status: CreatorMonetizationStatus | "none"
): string {
  const map: Record<CreatorMonetizationStatus | "none", string> = {
    none: "—",
    not_eligible: "Chưa đủ điều kiện",
    eligible: "Đủ điều kiện",
    pending_review: "Chờ duyệt",
    approved: "Đã bật kiếm tiền",
    rejected: "Bị từ chối",
    suspended: "Tạm dừng",
    permanently_disabled: "Khóa kiếm tiền vĩnh viễn"
  };
  return map[status] ?? status;
}

export function formatStudioStatusLabel(status: CreatorStudioStatus): string {
  if (status === "none") return "Chưa có Studio";
  if (status === "suspended") return "Tạm khóa Studio";
  return "Đang hoạt động";
}

export function monetizationStatusBadgeClass(
  status: CreatorMonetizationStatus | "none"
): string {
  if (status === "approved") return "bg-emerald-500/15 text-emerald-300";
  if (status === "pending_review") return "bg-amber-500/15 text-amber-300";
  if (status === "rejected" || status === "permanently_disabled") {
    return "bg-red-500/15 text-red-300";
  }
  if (status === "suspended") return "bg-orange-500/15 text-orange-300";
  return "bg-zinc-500/15 text-zinc-400";
}

export const MONETIZATION_REJECT_REASONS = [
  { code: "incomplete_profile", label: "Thiếu thông tin hồ sơ" },
  { code: "low_quality", label: "Nội dung chất lượng thấp" },
  { code: "policy_violation", label: "Vi phạm chính sách" },
  { code: "fraud_risk", label: "Rủi ro gian lận" },
  { code: "other", label: "Khác" }
] as const;
