import { getCreatorAccessStatus } from "@/lib/creator-access";
import { createAdminClient } from "@/lib/data/admin";
import { resolveLiveComplianceStatuses } from "@/lib/creator-ad-revenue/sync-compliance";
import type {
  CreatorAdEligibilityChecklistItem,
  CreatorAdMonetizationProfile,
  CreatorAdRevenuePolicy
} from "@/types/creator-ad-revenue-policy";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function buildCreatorAdEligibilityChecklist(input: {
  userId: string;
  policy: CreatorAdRevenuePolicy;
  profile: CreatorAdMonetizationProfile | null;
}): Promise<{
  checklist: CreatorAdEligibilityChecklistItem[];
  allRequirementsMet: boolean;
}> {
  // TODO(content-origin): enforce translation rights policy at story-level for ad revenue
  // share (content_origin/rights_status/monetization_policy) before enabling payouts.
  const live = await resolveLiveComplianceStatuses(input.userId);
  const creatorAccess = await getCreatorAccessStatus(input.userId);

  const checklist: CreatorAdEligibilityChecklistItem[] = [];

  if (input.policy.require_kyc) {
    const met = live.kyc_status === "verified";
    checklist.push({
      id: "kyc",
      label: "Xác thực danh tính (KYC)",
      met,
      ctaLabel: met ? undefined : "Đi tới xác thực",
      ctaHref: "/studio/settings/verification"
    });
  }

  if (input.policy.require_tax_info) {
    const met =
      input.profile?.tax_status === "verified" ||
      input.profile?.tax_status === "submitted" ||
      live.tax_status === "verified" ||
      live.tax_status === "submitted";
    checklist.push({
      id: "tax",
      label: "Thông tin thuế",
      met,
      ctaLabel: met ? undefined : "Liên hệ hỗ trợ / cập nhật thuế",
      ctaHref: "/studio/finance?tab=ads"
    });
  }

  if (input.policy.require_payout_setup) {
    const met = live.payout_status === "verified";
    checklist.push({
      id: "payout",
      label: "Thiết lập nhận thanh toán",
      met,
      ctaLabel: met ? undefined : "Thiết lập tài khoản",
      ctaHref: "/studio/finance"
    });
  }

  if (input.policy.require_good_standing) {
    const met =
      creatorAccess.monetizationEnabled &&
      !creatorAccess.monetizationDisabledReason;
    checklist.push({
      id: "standing",
      label: "Tài khoản đứng tốt (không vi phạm)",
      met
    });
  }

  if (input.policy.min_monthly_valid_reads > 0 || input.policy.min_monthly_ad_impressions > 0) {
    const db = createAdminClient();
    const month = currentMonthKey();
    const { data: monthly } = await db
      .from("ad_monthly_author_stats")
      .select("estimated_reads, rendered_impressions")
      .eq("author_id", input.userId)
      .eq("month", month)
      .maybeSingle();

    const reads = Number(monthly?.estimated_reads ?? 0);
    const impressions = Number(monthly?.rendered_impressions ?? 0);

    if (input.policy.min_monthly_valid_reads > 0) {
      checklist.push({
        id: "reads",
        label: `Lượt đọc hợp lệ tháng (${input.policy.min_monthly_valid_reads}+)`,
        met: reads >= input.policy.min_monthly_valid_reads
      });
    }
    if (input.policy.min_monthly_ad_impressions > 0) {
      checklist.push({
        id: "impressions",
        label: `Lượt hiển thị quảng cáo tháng (${input.policy.min_monthly_ad_impressions}+)`,
        met: impressions >= input.policy.min_monthly_ad_impressions
      });
    }
  }

  const adminApproved =
    input.profile?.status === "eligible" && input.profile.ads_revenue_enabled;
  checklist.push({
    id: "admin_approval",
    label: "ChapMee duyệt tham gia chương trình",
    met: adminApproved
  });

  const requirementItems = checklist.filter((c) => c.id !== "admin_approval");
  const allRequirementsMet =
    requirementItems.every((c) => c.met) && Boolean(adminApproved);

  return { checklist, allRequirementsMet };
}

export function getCreatorAdStatusPresentation(
  profile: CreatorAdMonetizationProfile | null,
  programEnabled: boolean
): {
  statusMessage: string | null;
  statusTone: "neutral" | "success" | "warning" | "danger";
} {
  if (!programEnabled) {
    return {
      statusMessage:
        "Chương trình chia sẻ doanh thu quảng cáo chưa được mở trên nền tảng.",
      statusTone: "neutral"
    };
  }

  const status = profile?.status ?? "not_enabled";

  if (status === "eligible" && profile?.ads_revenue_enabled) {
    return {
      statusMessage: "Bạn đã được duyệt tham gia chia sẻ doanh thu quảng cáo.",
      statusTone: "success"
    };
  }

  if (status === "pending_review") {
    return {
      statusMessage: "Hồ sơ tham gia đang chờ ChapMee xem xét.",
      statusTone: "warning"
    };
  }

  if (status === "suspended") {
    return {
      statusMessage:
        "Tài khoản chia sẻ doanh thu quảng cáo đã bị tạm dừng. Vui lòng liên hệ hỗ trợ nếu bạn cho rằng đây là nhầm lẫn.",
      statusTone: "danger"
    };
  }

  if (status === "rejected") {
    return {
      statusMessage:
        "Hồ sơ tham gia chương trình không được chấp thuận tại thời điểm này. Vui lòng liên hệ hỗ trợ để biết thêm.",
      statusTone: "danger"
    };
  }

  return {
    statusMessage:
      "Chưa tham gia chương trình. Hoàn thành điều kiện bên dưới; ChapMee sẽ duyệt khi chương trình mở cho tài khoản của bạn.",
    statusTone: "neutral"
  };
}
