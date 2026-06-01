import type { StudioMonetizationGateStatus } from "@/types/studio-monetization";
import type {
  MonetizationProgramBadge,
  MonetizationHeaderCta,
  StudioTransactionFilter
} from "@/types/studio-monetization-dashboard";
import type { StudioMonetizationPageData } from "@/types/studio-monetization";
import type { CreatorAdRevenueDashboard } from "@/types/creator-ad-revenue-dashboard";

export function gateStatusBadge(
  gateStatus: StudioMonetizationGateStatus,
  data: Pick<StudioMonetizationPageData, "eligibility" | "creatorAccess">
): MonetizationProgramBadge {
  switch (gateStatus) {
    case "disabled":
      return {
        label: "Chưa bật kiếm tiền",
        tone: "slate",
        description: "Hệ sinh thái kiếm tiền chưa được bật trên nền tảng."
      };
    case "admin_disabled":
      return {
        label: "Bị hạn chế",
        tone: "rose",
        description:
          data.creatorAccess.monetizationDisabledReason ??
          "Tài khoản bị tắt kiếm tiền bởi quản trị viên."
      };
    case "suspended":
      return {
        label: "Tạm khóa kiếm tiền",
        tone: "rose",
        description: "Tài khoản tạm khóa. Liên hệ hỗ trợ nếu cần."
      };
    case "rejected":
      return {
        label: "Bị hạn chế",
        tone: "rose",
        description: "Hồ sơ kiếm tiền không được duyệt."
      };
    case "approved":
      if (data.eligibility.reasons.length > 0) {
        return {
          label: "Chưa đủ điều kiện",
          tone: "amber",
          description: data.eligibility.reasons[0]
        };
      }
      return {
        label: "Đủ điều kiện",
        tone: "green",
        description: "Bạn có thể cấu hình trả phí và nhận doanh thu theo chính sách."
      };
    default:
      return { label: "Đang xét duyệt", tone: "amber" };
  }
}

export function resolveHeaderCtas(
  gateStatus: StudioMonetizationGateStatus,
  data: StudioMonetizationPageData
): MonetizationHeaderCta[] {
  const ctas: MonetizationHeaderCta[] = [];

  if (gateStatus === "disabled" || gateStatus === "admin_disabled") {
    ctas.push({
      label: "Xem điều kiện",
      href: "/studio/help",
      variant: "secondary"
    });
    return ctas;
  }

  if (data.eligibility.reasons.length > 0 || !data.canConfigure) {
    ctas.push({
      label: "Hoàn tất hồ sơ nhận tiền",
      href: "/studio/settings/verification",
      variant: "primary"
    });
    ctas.push({
      label: "Xem điều kiện",
      href: "#eligibility",
      variant: "ghost"
    });
  } else if (data.withdrawState.canRequestWithdrawal) {
    ctas.push({
      label: "Yêu cầu rút tiền",
      href: "/studio/finance#withdrawal-request",
      variant: "primary"
    });
  } else {
    ctas.push({
      label: "Mở tài chính",
      href: "/studio/finance",
      variant: "primary"
    });
  }

  ctas.push({
    label: "Xem chính sách",
    href: "/studio/monetization?tab=policy",
    variant: "secondary"
  });

  return ctas;
}

export function participationStatusLabel(dashboard: CreatorAdRevenueDashboard): string {
  const { sharing } = dashboard;
  if (!sharing.programEnabled) return "Chương trình đang tắt";
  if (sharing.betaMode) return "Chương trình beta";
  if (!sharing.adsRevenueEnabled) {
    if (sharing.allRequirementsMet) return "Đủ điều kiện — chờ kích hoạt";
    return "Chưa đủ điều kiện quảng cáo";
  }
  if (
    sharing.participationStatus === "suspended" ||
    sharing.participationStatus === "fraud_hold" ||
    sharing.participationStatus === "rejected"
  ) {
    return "Bị hạn chế";
  }
  return "Đang bật";
}

export const TRANSACTION_FILTER_OPTIONS: Array<{
  value: StudioTransactionFilter;
  label: string;
}> = [
  { value: "all", label: "Tất cả" },
  { value: "paid_chapter", label: "Chương trả phí" },
  { value: "full_story_purchase", label: "Mua trọn bộ" },
  { value: "tip", label: "Tip / ủng hộ" },
  { value: "ad_estimated", label: "QC ước tính" },
  { value: "ad_finalized", label: "QC đã chốt" },
  { value: "reserve_hold", label: "Giữ dự phòng" },
  { value: "reserve_release", label: "Mở dự phòng" },
  { value: "adjustment", label: "Điều chỉnh" },
  { value: "payout", label: "Rút tiền" },
  { value: "refund", label: "Hoàn tiền" },
  { value: "chargeback", label: "Chargeback" }
];

export function payoutStatusLabel(status: string): string {
  const map: Record<string, string> = {
    requested: "Chờ duyệt",
    under_review: "Đang xét duyệt",
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    processing: "Đang xử lý",
    completed: "Đã thanh toán",
    paid: "Đã thanh toán",
    rejected: "Từ chối",
    cancelled: "Đã hủy",
    failed: "Thất bại"
  };
  return map[status] ?? status;
}

export function payoutCycleLabel(cycle: string): string {
  const map: Record<string, string> = {
    monthly_m2_day_5_10: "Tháng M+2, ngày 5–10",
    monthly: "Hàng tháng",
    quarterly: "Hàng quý"
  };
  return map[cycle] ?? cycle.replace(/_/g, " ");
}
