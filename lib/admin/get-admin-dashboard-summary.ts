import { startOfTodayIso } from "@/lib/admin/messaging-date-range";
import { getAdminDashboard } from "@/lib/admin/getAdminDashboard";
import { getPlatformViewStats } from "@/lib/admin/get-platform-view-stats";
import { buildAdminShortcutGroups } from "@/lib/admin/admin-navigation";
import { analyticsEvents } from "@/lib/analytics/events";
import { createClient } from "@/lib/data/server";
import type {
  AdminActionQueueItem,
  AdminDashboardSummary,
  AdminQuickMetric,
  AdminRiskAlert
} from "@/types/admin-dashboard";
import type { ClientPermissionFlags } from "@/types/permissions";

const LARGE_WITHDRAWAL_VND = 5_000_000;
const LARGE_COIN_ADJUSTMENT = 10_000;

function countOrZero(result: { count?: number | null; error: unknown }) {
  if (result.error) return null;
  return result.count ?? 0;
}

export async function getAdminDashboardSummary(
  permissionFlags?: ClientPermissionFlags
): Promise<AdminDashboardSummary> {
  const base = await getAdminDashboard();
  const todayStart = startOfTodayIso();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const db = await createClient();
    const platformViews = await getPlatformViewStats();

    const [
      pendingWithdrawals,
      checkoutManualReview,
      checkoutPending,
      webhookFailed,
      contentQualityPending,
      qualityAppealsPending,
      moderationAppealsPending,
      riskOpen,
      newUsersToday,
      newStoriesToday,
      activeCreators,
      readsToday,
      grossRevenueToday,
      coinPurchasedToday,
      coinSpentToday,
      newWithdrawalsToday,
      largePendingWithdrawal,
      largeCoinAdjustments
    ] = await Promise.all([
      db
        .from("payout_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["requested", "under_review"]),
      db
        .from("checkout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "manual_review"),
      db
        .from("checkout_sessions")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "created"]),
      db
        .from("payment_webhook_events")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", weekAgo),
      db
        .from("stories")
        .select("id", { count: "exact", head: true })
        .in("quality_status", [
          "needs_attention",
          "pending_quality_review",
          "low_quality_warning_1",
          "low_quality_warning_2",
          "low_quality_final_review"
        ]),
      db
        .from("content_quality_appeals")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      db
        .from("moderation_appeals")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "reviewing"]),
      db
        .from("risk_events")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "reviewing"]),
      db
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart),
      db
        .from("stories")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart),
      db
        .from("creator_profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      db
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_name", analyticsEvents.completeChap)
        .gte("created_at", todayStart),
      db
        .from("transactions")
        .select("gross_amount_vnd")
        .gte("created_at", todayStart)
        .in("type", ["coin_purchase", "creator_revenue_share", "chapter_unlock"]),
      db
        .from("transactions")
        .select("amount_coin")
        .gte("created_at", todayStart)
        .eq("type", "coin_purchase"),
      db
        .from("transactions")
        .select("amount_coin")
        .gte("created_at", todayStart)
        .in("type", ["chapter_unlock", "story_unlock", "author_tip"]),
      db
        .from("payout_requests")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart)
        .in("status", ["requested", "under_review", "approved", "processing"]),
      db
        .from("payout_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["requested", "under_review"])
        .gte("amount_vnd", LARGE_WITHDRAWAL_VND),
      db
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("type", "admin_coin_adjustment")
        .gte("created_at", todayStart)
        .gte("amount_coin", LARGE_COIN_ADJUSTMENT)
    ]);

    const pendingWithdrawalCount = countOrZero(pendingWithdrawals) ?? 0;
    const paymentsReviewCount =
      (countOrZero(checkoutManualReview) ?? 0) + (countOrZero(checkoutPending) ?? 0);
    const qualityReviewCount = countOrZero(contentQualityPending) ?? 0;
    const appealsCount =
      (countOrZero(qualityAppealsPending) ?? 0) +
      (countOrZero(moderationAppealsPending) ?? 0);

    const actionQueue: AdminActionQueueItem[] = [
      {
        id: "pending-stories",
        label: "Truyện chờ duyệt",
        count: base.stats.pendingStories,
        href: "/admin/content",
        priority: base.stats.pendingStories > 0 ? "high" : "low"
      },
      {
        id: "pending-episodes",
        label: "Chương chờ duyệt",
        count: base.stats.pendingEpisodes,
        href: "/admin/content",
        priority: base.stats.pendingEpisodes > 0 ? "high" : "low"
      },
      {
        id: "open-reports",
        label: "Báo cáo đang mở",
        count: base.stats.openReports,
        href: "/admin/reports",
        priority: base.stats.openReports > 0 ? "high" : "low"
      },
      {
        id: "community-pending",
        label: "Bài cộng đồng chờ duyệt",
        count: base.stats.pendingCommunityPosts,
        href: "/admin/community",
        priority: base.stats.pendingCommunityPosts > 0 ? "medium" : "low"
      },
      {
        id: "withdrawals-pending",
        label: "Yêu cầu rút tiền chờ duyệt",
        count: pendingWithdrawalCount,
        href: "/admin/withdrawals",
        priority: pendingWithdrawalCount > 0 ? "high" : "low"
      },
      {
        id: "payments-review",
        label: "Thanh toán cần kiểm tra",
        count: paymentsReviewCount,
        href: "/admin/payments",
        priority: paymentsReviewCount > 0 ? "high" : "low"
      },
      {
        id: "quality-review",
        label: "Nội dung chất lượng thấp",
        count: qualityReviewCount,
        href: "/admin/content-quality",
        priority: qualityReviewCount > 0 ? "medium" : "low"
      },
      {
        id: "appeals",
        label: "Khiếu nại chờ xử lý",
        count: appealsCount,
        href: "/admin/moderation",
        priority: appealsCount > 0 ? "medium" : "low"
      }
    ];

    const riskAlerts: AdminRiskAlert[] = [];
    const webhookFailedCount = countOrZero(webhookFailed) ?? 0;
    if (webhookFailedCount > 0) {
      riskAlerts.push({
        id: "webhook-failed",
        label: "Webhook thanh toán lỗi",
        description: `${webhookFailedCount} sự kiện lỗi trong 7 ngày qua.`,
        href: "/admin/payments",
        severity: "high"
      });
    }

    const riskOpenCount = countOrZero(riskOpen);
    if (riskOpenCount != null && riskOpenCount > 0) {
      riskAlerts.push({
        id: "risk-events",
        label: "Sự kiện rủi ro đang mở",
        description: `${riskOpenCount} hồ sơ cần theo dõi.`,
        href: "/admin/risk",
        severity: "medium"
      });
    }

    if (base.stats.openReports >= 10) {
      riskAlerts.push({
        id: "report-spike",
        label: "Báo cáo tăng cao",
        description: `${base.stats.openReports} báo cáo đang mở — ưu tiên xử lý.`,
        href: "/admin/reports",
        severity: "medium"
      });
    }

    const largeWithdrawalCount = countOrZero(largePendingWithdrawal) ?? 0;
    if (largeWithdrawalCount > 0) {
      riskAlerts.push({
        id: "large-withdrawal",
        label: "Rút tiền lớn đang chờ",
        description: `${largeWithdrawalCount} yêu cầu từ ${(LARGE_WITHDRAWAL_VND / 1_000_000).toFixed(0)}M₫ trở lên.`,
        href: "/admin/withdrawals",
        severity: "high"
      });
    }

    const largeCoinCount = countOrZero(largeCoinAdjustments) ?? 0;
    if (largeCoinCount > 0) {
      riskAlerts.push({
        id: "large-coin-adjust",
        label: "Điều chỉnh coin lớn",
        description: `${largeCoinCount} thao tác admin điều chỉnh coin lớn hôm nay.`,
        href: "/admin/coins",
        severity: "medium"
      });
    }

    let grossToday = 0;
    if (!grossRevenueToday.error && grossRevenueToday.data) {
      for (const row of grossRevenueToday.data) {
        grossToday += Number(row.gross_amount_vnd ?? 0);
      }
    }

    let purchasedCoin = 0;
    if (!coinPurchasedToday.error && coinPurchasedToday.data) {
      for (const row of coinPurchasedToday.data) {
        purchasedCoin += Math.abs(Number(row.amount_coin ?? 0));
      }
    }

    let spentCoin = 0;
    if (!coinSpentToday.error && coinSpentToday.data) {
      for (const row of coinSpentToday.data) {
        spentCoin += Math.abs(Number(row.amount_coin ?? 0));
      }
    }

    const quickMetrics: AdminQuickMetric[] = [
      {
        id: "new-users",
        label: "Người dùng mới hôm nay",
        value: countOrZero(newUsersToday),
        href: "/admin/users"
      },
      {
        id: "active-creators",
        label: "Tác giả hoạt động",
        value: countOrZero(activeCreators),
        sublabel: "Hồ sơ tác giả đang active",
        href: "/admin/creators"
      },
      {
        id: "new-stories",
        label: "Truyện mới hôm nay",
        value: countOrZero(newStoriesToday),
        href: "/admin/content"
      },
      {
        id: "reads-today",
        label: "Lượt đọc hôm nay",
        value: readsToday.error ? null : (readsToday.count ?? 0),
        sublabel: readsToday.error ? "Chưa có dữ liệu" : "Hoàn thành chương",
        unavailable: Boolean(readsToday.error),
        href: "/admin/analytics"
      },
      {
        id: "platform-views-total",
        label: "Lượt xem toàn hệ thống",
        value: platformViews.allViewsTotal,
        sublabel: platformViews.error
          ? "Chưa có dữ liệu"
          : `Truyện ${(platformViews.storyViewsTotal ?? 0).toLocaleString("vi-VN")} · Chương ${(platformViews.chapterViewsTotal ?? 0).toLocaleString("vi-VN")} · Reels ${(platformViews.reelsViewsTotal ?? 0).toLocaleString("vi-VN")} · Bài viết ${(platformViews.articleViewsTotal ?? 0).toLocaleString("vi-VN")} · Tiện ích ${(platformViews.utilityUsesTotal ?? 0).toLocaleString("vi-VN")}`,
        unavailable: Boolean(platformViews.error),
        href: "/admin/growth"
      },
      {
        id: "article-views-total",
        label: "Lượt xem bài viết",
        value: platformViews.articleViewsTotal,
        sublabel: platformViews.error
          ? "Chưa có dữ liệu"
          : `${(platformViews.articleViews7d ?? 0).toLocaleString("vi-VN")} lượt trong 7 ngày`,
        unavailable: Boolean(platformViews.error),
        href: "/admin/content-hub"
      },
      {
        id: "utility-uses-total",
        label: "Lượt dùng tiện ích",
        value: platformViews.utilityUsesTotal,
        sublabel: platformViews.error
          ? "Chưa có dữ liệu"
          : `${(platformViews.utilityUses7d ?? 0).toLocaleString("vi-VN")} lượt trong 7 ngày`,
        unavailable: Boolean(platformViews.error),
        href: "/admin/growth"
      },
      {
        id: "platform-views-7d",
        label: "Lượt xem 7 ngày",
        value: platformViews.allViews7d,
        sublabel: platformViews.error
          ? "Chưa có dữ liệu"
          : "Truyện + chương + Reels + bài viết + tiện ích",
        unavailable: Boolean(platformViews.error),
        href: "/admin/growth"
      },
      {
        id: "gross-revenue",
        label: "Doanh thu gộp hôm nay",
        value: grossRevenueToday.error ? null : grossToday,
        sublabel: grossRevenueToday.error ? "Chưa có dữ liệu" : "VND",
        unavailable: Boolean(grossRevenueToday.error),
        href: "/admin/finance"
      },
      {
        id: "coin-purchased",
        label: "Coin đã nạp hôm nay",
        value: coinPurchasedToday.error ? null : purchasedCoin,
        unavailable: Boolean(coinPurchasedToday.error),
        href: "/admin/transactions"
      },
      {
        id: "coin-spent",
        label: "Coin đã tiêu hôm nay",
        value: coinSpentToday.error ? null : spentCoin,
        unavailable: Boolean(coinSpentToday.error),
        href: "/admin/transactions"
      },
      {
        id: "new-withdrawals",
        label: "Yêu cầu rút tiền mới",
        value: countOrZero(newWithdrawalsToday),
        href: "/admin/withdrawals"
      }
    ];

    const hasActionItems = actionQueue.some((item) => item.count > 0);

    return {
      actionQueue,
      riskAlerts,
      quickMetrics,
      shortcutGroups: buildAdminShortcutGroups(permissionFlags),
      hasActionItems,
      error: base.error
    };
  } catch (error) {
    return {
      actionQueue: [],
      riskAlerts: [],
      quickMetrics: [],
      shortcutGroups: buildAdminShortcutGroups(permissionFlags),
      hasActionItems: false,
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải tổng quan admin."
    };
  }
}
