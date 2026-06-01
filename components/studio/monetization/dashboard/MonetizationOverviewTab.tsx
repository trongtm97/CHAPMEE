import Link from "next/link";
import { CreatorEligibilityCard } from "@/components/studio/monetization/dashboard/CreatorEligibilityCard";
import { RevenueSummaryGrid } from "@/components/studio/monetization/dashboard/RevenueSummaryGrid";
import { MonetizationRecentTransactions } from "@/components/studio/monetization/MonetizationRecentTransactions";
import { MonetizationStatusSection } from "@/components/studio/monetization/MonetizationStatusSection";
import { FullStoryCompletionReviewsSection } from "@/components/studio/monetization/FullStoryCompletionReviewsSection";
import type { MonetizationEligibilityItem, StudioAdRevenueSummaryView } from "@/types/studio-monetization-dashboard";
import type { StudioMonetizationPageData } from "@/types/studio-monetization";

type MonetizationOverviewTabProps = {
  data: StudioMonetizationPageData;
  adSummary: StudioAdRevenueSummaryView;
  eligibilityItems: MonetizationEligibilityItem[];
  showMoneyAmounts: boolean;
};

export function MonetizationOverviewTab({
  data,
  adSummary,
  eligibilityItems,
  showMoneyAmounts
}: MonetizationOverviewTabProps) {
  const nextActions = buildNextActions(data, eligibilityItems);

  return (
    <div className="space-y-6">
      <CreatorEligibilityCard items={eligibilityItems} />

      <RevenueSummaryGrid
        adSummary={adSummary}
        config={data.config}
        overview={data.overview}
        showMoneyAmounts={showMoneyAmounts}
      />

      <MonetizationStatusSection
        creatorAccess={data.creatorAccess}
        gateStatus={data.gateStatus}
      />

      {nextActions.length > 0 ? (
        <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <h2 className="text-sm font-semibold text-cyan-50">Việc cần làm tiếp theo</h2>
          <ul className="mt-3 space-y-2">
            {nextActions.map((action) => (
              <li className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between" key={action.label}>
                <span className="text-sm text-zinc-300">{action.label}</span>
                {action.href ? (
                  <Link
                    className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                    href={action.href}
                  >
                    {action.cta} →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.canConfigure && data.overview.fullStoryEscrowStoriesCount > 0 ? (
        <FullStoryCompletionReviewsSection
          initialCount={data.overview.fullStoryEscrowStoriesCount}
        />
      ) : null}

      <MonetizationRecentTransactions
        coinDisplayName={data.config.coinDisplayName}
        transactions={data.recentTransactions}
      />
    </div>
  );
}

function buildNextActions(
  data: StudioMonetizationPageData,
  items: MonetizationEligibilityItem[]
) {
  const actions: Array<{ label: string; href?: string; cta?: string }> = [];

  for (const item of items) {
    if (item.status !== "ok" && item.href && item.ctaLabel) {
      actions.push({ label: item.label, href: item.href, cta: item.ctaLabel });
    }
  }

  if (data.overview.paidStoriesCount === 0 && data.canConfigure) {
    actions.push({
      label: "Bạn chưa bật truyện trả phí nào.",
      href: "/studio/monetization?tab=paid-stories",
      cta: "Cài đặt trả phí"
    });
  }

  if (data.withdrawState.canRequestWithdrawal) {
    actions.push({
      label: "Bạn có thể gửi yêu cầu rút tiền.",
      href: "/studio/monetization?tab=payout",
      cta: "Rút tiền"
    });
  }

  return actions.slice(0, 5);
}
