import type { CreatorAdRevenueDashboard } from "@/types/creator-ad-revenue-dashboard";
import type {
  MonetizationEligibilityItem,
  StudioAdRevenueSummaryView
} from "@/types/studio-monetization-dashboard";
import type { StudioMonetizationPageData } from "@/types/studio-monetization";
import { participationStatusLabel } from "@/lib/studio/monetization-labels";

function item(
  partial: MonetizationEligibilityItem
): MonetizationEligibilityItem {
  return partial;
}

export function buildMonetizationEligibilityChecklist(
  data: StudioMonetizationPageData,
  adDashboard: CreatorAdRevenueDashboard
): MonetizationEligibilityItem[] {
  const { config, creatorAccess, eligibility, payoutAccounts } = data;
  const items: MonetizationEligibilityItem[] = [];

  const accountOk =
    creatorAccess.monetizationEnabled && gateAllowsMonetization(data.gateStatus);
  items.push(
    item({
      id: "account",
      label: "Tài khoản đang hoạt động tốt",
      description: accountOk
        ? "Không bị khóa kiếm tiền bởi quản trị."
        : creatorAccess.monetizationDisabledReason ?? "Kiếm tiền đang bị tắt.",
      status: accountOk ? "ok" : "locked",
      href: accountOk ? undefined : "/studio/help",
      ctaLabel: accountOk ? undefined : "Liên hệ hỗ trợ"
    })
  );

  if (config.payoutKycRequired) {
    const kycPending = adDashboard.compliance.kyc_status === "pending";
    items.push(
      item({
        id: "kyc",
        label: "Đã xác minh creator / KYC",
        description: kycPending
          ? "Hồ sơ đang được xét duyệt."
          : "Cần xác thực danh tính để rút tiền.",
        status:
          adDashboard.compliance.kyc_status === "verified"
            ? "ok"
            : kycPending
              ? "warning"
              : "missing",
        href: "/studio/settings/verification",
        ctaLabel:
          adDashboard.compliance.kyc_status === "verified" ? undefined : "Xác thực ngay"
      })
    );
  }

  const hasPayout =
    payoutAccounts.some((a) => a.verification_status === "verified") ||
    adDashboard.compliance.payout_status === "verified";
  items.push(
    item({
      id: "payout_method",
      label: "Đã thiết lập phương thức nhận tiền",
      description: hasPayout
        ? "Tài khoản ngân hàng/ví đã xác minh."
        : "Thêm tài khoản nhận tiền tại Tài chính.",
      status: hasPayout ? "ok" : "missing",
      href: "/studio/finance#bank-accounts",
      ctaLabel: hasPayout ? undefined : "Thiết lập"
    })
  );

  if (adDashboard.sharing.policy && adDashboard.compliance.tax_status) {
    const taxOk =
      adDashboard.compliance.tax_status === "verified" ||
      adDashboard.compliance.tax_status === "submitted";
    items.push(
      item({
        id: "tax",
        label: "Đã cung cấp thông tin thuế (nếu yêu cầu)",
        status: taxOk ? "ok" : "missing",
        href: "/studio/finance?tab=ads",
        ctaLabel: taxOk ? undefined : "Cập nhật thuế"
      })
    );
  }

  const violations = eligibility.stats.violations_count > 0;
  items.push(
    item({
      id: "violations",
      label: "Không có vi phạm nghiêm trọng",
      description: violations
        ? "Tài khoản có cờ moderation cần xử lý."
        : "Không có vi phạm đang chờ xử lý.",
      status: violations ? "warning" : "ok"
    })
  );

  const minFollowers = Number(
    data.config.revenueShareCreatorPercent >= 0
      ? eligibility.stats.followers
      : 0
  );
  const contentThresholdMet =
    eligibility.reasons.length === 0 ||
    (eligibility.stats.chapters_count > 0 && eligibility.stats.total_reads >= 0);
  if (eligibility.reasons.length > 0) {
    items.push(
      item({
        id: "content_threshold",
        label: "Đạt ngưỡng nội dung / lượt đọc",
        description: eligibility.reasons.join(" "),
        status: "missing",
        href: "/studio/stories",
        ctaLabel: "Quản lý truyện"
      })
    );
  } else if (contentThresholdMet) {
    items.push(
      item({
        id: "content_threshold",
        label: "Đạt ngưỡng nội dung / lượt đọc",
        status: "ok",
        description: `${eligibility.stats.chapters_count} chương · ${eligibility.stats.followers.toLocaleString("vi-VN")} người theo dõi · ${eligibility.stats.total_reads.toLocaleString("vi-VN")} lượt đọc.`
      })
    );
  }

  void minFollowers;

  if (adDashboard.sharing.programEnabled) {
    const adMet = adDashboard.sharing.allRequirementsMet && adDashboard.sharing.adsRevenueEnabled;
    items.push(
      item({
        id: "ad_program",
        label: "Đủ điều kiện chia sẻ doanh thu quảng cáo",
        description: participationStatusLabel(adDashboard),
        status: adMet ? "ok" : adDashboard.sharing.allRequirementsMet ? "warning" : "missing",
        href: "/studio/monetization?tab=ad-revenue",
        ctaLabel: adMet ? undefined : "Xem chi tiết"
      })
    );
  }

  return items;
}

function gateAllowsMonetization(
  gateStatus: StudioMonetizationPageData["gateStatus"]
): boolean {
  return (
    gateStatus === "approved" ||
    gateStatus === "pending_review" ||
    gateStatus === "not_eligible"
  );
}

export function buildAdRevenueSummaryView(
  adDashboard: CreatorAdRevenueDashboard
): StudioAdRevenueSummaryView {
  const finalized = adDashboard.history.reconciledMonths.reduce(
    (sum, m) => sum + Number(m.finalPayableVnd ?? 0),
    0
  );
  const reserve = adDashboard.history.reconciledMonths.reduce(
    (sum, m) => sum + Number(m.reserveHoldVnd ?? 0),
    0
  );
  const payable = adDashboard.history.reconciledMonths.reduce(
    (sum, m) => sum + Number(m.finalPayableVnd ?? 0),
    0
  );

  const estimatedCurrentMonthVnd =
    adDashboard.estimate.visible && adDashboard.estimate.currentMonth
      ? adDashboard.estimate.currentMonth.creator_pool_estimate_vnd
      : null;

  return {
    programEnabled: adDashboard.sharing.programEnabled,
    betaMode: adDashboard.sharing.betaMode,
    adsRevenueEnabled: adDashboard.sharing.adsRevenueEnabled,
    participationLabel: participationStatusLabel(adDashboard),
    estimatedCurrentMonthVnd,
    finalizedTotalVnd: finalized,
    reserveHoldTotalVnd: reserve,
    payableTotalVnd: payable,
    estimatesVisible: adDashboard.estimate.visible
  };
}
