import { Suspense } from "react";
import Link from "next/link";
import { MonetizationDashboardTabs } from "@/components/studio/monetization/dashboard/MonetizationDashboardTabs";
import { MonetizationHeader } from "@/components/studio/monetization/dashboard/MonetizationHeader";
import { MonetizationOverviewTab } from "@/components/studio/monetization/dashboard/MonetizationOverviewTab";
import { PaidStoriesPanel } from "@/components/studio/monetization/dashboard/PaidStoriesPanel";
import { AdRevenuePanel } from "@/components/studio/monetization/dashboard/AdRevenuePanel";
import { PayoutPanel } from "@/components/studio/monetization/dashboard/PayoutPanel";
import { TransactionsPanel } from "@/components/studio/monetization/dashboard/TransactionsPanel";
import { PolicyPanel } from "@/components/studio/monetization/dashboard/PolicyPanel";
import { EmptyState, ErrorState } from "@/components/ui";
import {
  buildAdRevenueSummaryView,
  buildMonetizationEligibilityChecklist
} from "@/lib/studio/build-monetization-eligibility";
import {
  gateStatusBadge,
  resolveHeaderCtas
} from "@/lib/studio/monetization-labels";
import { STUDIO_PAGE_WIDTH_CLASS } from "@/lib/studio/constants";
import type { CreatorAdRevenueDashboard } from "@/types/creator-ad-revenue-dashboard";
import type { StudioMonetizationPageData } from "@/types/studio-monetization";

type StudioMonetizationPageProps = {
  data: StudioMonetizationPageData;
  adDashboard: CreatorAdRevenueDashboard;
};

export function StudioMonetizationPage({ data, adDashboard }: StudioMonetizationPageProps) {
  if (data.error) {
    return <ErrorState message={data.error} title="Không tải được kiếm tiền" />;
  }

  const showMoneyAmounts =
    data.gateStatus === "approved" || data.config.showMoneyUiToCreators;

  if (data.gateStatus === "disabled") {
    return (
      <div className={`${STUDIO_PAGE_WIDTH_CLASS} space-y-6`}>
        <MonetizationHeader
          badge={gateStatusBadge(data.gateStatus, data)}
          ctas={resolveHeaderCtas(data.gateStatus, data)}
        />
        <EmptyState
          description={
            data.config.ecosystemEnabled && !data.config.creatorMonetizationEnabled
              ? "Quản trị viên cần bật kiếm tiền cho tác giả trên nền tảng."
              : "Liên hệ quản trị viên nếu bạn cần bật hệ sinh thái kiếm tiền."
          }
          title="ChapMee chưa bật kiếm tiền cho tác giả."
        />
      </div>
    );
  }

  const eligibilityItems = buildMonetizationEligibilityChecklist(data, adDashboard);
  const adSummary = buildAdRevenueSummaryView(adDashboard);

  return (
    <div className={`${STUDIO_PAGE_WIDTH_CLASS} space-y-6 pb-20 sm:pb-8`}>
      <MonetizationHeader
        badge={gateStatusBadge(data.gateStatus, data)}
        ctas={resolveHeaderCtas(data.gateStatus, data)}
      />

      <Suspense fallback={<div className="text-sm text-zinc-500">Đang tải…</div>}>
        <MonetizationDashboardTabs
          adRevenue={<AdRevenuePanel dashboard={adDashboard} />}
          overview={
            <MonetizationOverviewTab
              adSummary={adSummary}
              data={data}
              eligibilityItems={eligibilityItems}
              showMoneyAmounts={showMoneyAmounts}
            />
          }
          paidStories={
            <PaidStoriesPanel
              canConfigure={data.canConfigure}
              config={data.config}
              genreOptions={data.genreOptions}
              profile={data.profile}
              storiesTotalCount={data.storiesTotalCount}
            />
          }
          payout={<PayoutPanel data={data} showMoneyAmounts={showMoneyAmounts} />}
          policy={<PolicyPanel adDashboard={adDashboard} data={data} />}
          transactions={<TransactionsPanel canLoad={data.canConfigure} />}
        />
      </Suspense>

      {data.gateStatus === "admin_disabled" ? (
        <section className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-sm text-rose-100">
          Kiếm tiền đang bị tắt bởi quản trị viên.{" "}
          {data.creatorAccess.monetizationDisabledReason ?? ""}{" "}
          <Link className="text-cyan-300 hover:underline" href="/studio/finance">
            Mở Tài chính →
          </Link>
        </section>
      ) : null}
    </div>
  );
}
