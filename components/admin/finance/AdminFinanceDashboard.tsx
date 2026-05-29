import { Card } from "@/components/ui";
import { CoinEconomyPanel } from "@/components/admin/finance/CoinEconomyPanel";
import { FinanceCommandHeader } from "@/components/admin/finance/FinanceCommandHeader";
import { FinanceDateFilter } from "@/components/admin/finance/FinanceDateFilter";
import { FinanceKpiCard } from "@/components/admin/finance/FinanceKpiCard";
import { FinanceRankingTables } from "@/components/admin/finance/FinanceRankingTables";
import { FinanceReconciliationPanel } from "@/components/admin/finance/FinanceReconciliationPanel";
import { FinanceRiskPanel } from "@/components/admin/finance/FinanceRiskPanel";
import { FinanceUrgentPanel } from "@/components/admin/finance/FinanceUrgentPanel";
import { PaymentStatusPanel } from "@/components/admin/finance/PaymentStatusPanel";
import { PayoutOverviewPanel } from "@/components/admin/finance/PayoutOverviewPanel";
import { RecentTransactionsTable } from "@/components/admin/finance/RecentTransactionsTable";
import { RefundChargebackPanel } from "@/components/admin/finance/RefundChargebackPanel";
import { RevenueBreakdownTable } from "@/components/admin/finance/RevenueBreakdownTable";
import { RevenueTrendChart } from "@/components/admin/finance/RevenueTrendChart";
import type { FinanceCapabilities, FinanceDashboardData } from "@/types/finance";

type AdminFinanceDashboardProps = {
  data: FinanceDashboardData;
  capabilities: FinanceCapabilities;
};

function vnd(value: number) {
  return `${value.toLocaleString("vi-VN")} đ`;
}

export function AdminFinanceDashboard({ data, capabilities }: AdminFinanceDashboardProps) {
  const revenueKpis = [
    {
      label: "Tổng doanh thu gộp",
      value: vnd(data.kpis.grossRevenueVnd),
      hint: "Tổng doanh thu gộp trong kỳ"
    },
    {
      label: "Doanh thu nền tảng",
      value: vnd(data.kpis.platformRevenueVnd),
      hint: "Phí và doanh thu thuộc nền tảng"
    },
    {
      label: "Doanh thu gộp tác giả",
      value: vnd(data.kpis.creatorGrossRevenueVnd),
      hint: "Trước khi trừ phí ròng"
    },
    {
      label: "Thu nhập ròng tác giả",
      value: vnd(data.kpis.creatorNetRevenueVnd),
      hint: "Sau phí nền tảng từng giao dịch"
    },
    {
      label: "Tiền tác giả đang chờ",
      value: vnd(data.kpis.pendingCreatorRevenueVnd),
      hint: "Chưa khả dụng để rút"
    },
    {
      label: "Tiền tác giả có thể rút",
      value: vnd(data.kpis.availableCreatorRevenueVnd),
      hint: "Số dư ví khả dụng"
    },
    {
      label: "Tiền tác giả bị khóa",
      value: vnd(data.kpis.lockedCreatorRevenueVnd),
      hint: "Bị khóa do rủi ro"
    }
  ];

  const showRevenueDetail = !data.isEmptyPeriod || data.kpis.grossRevenueVnd > 0;

  return (
    <div className="space-y-6">
      <FinanceCommandHeader
        capabilities={capabilities}
        rangeFrom={data.rangeFrom}
        rangeTo={data.rangeTo}
      />

      <FinanceDateFilter
        active={data.filter}
        customFrom={data.rangeFrom}
        customTo={data.rangeTo}
        rangeLabel={data.rangeLabel}
      />

      <FinanceUrgentPanel allClear={data.urgentAllClear} items={data.urgentItems} />

      <section className="space-y-3">
        <h2 className="text-lg font-black text-white">Tổng quan dòng tiền</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FinanceKpiCard
            hint="Tiền người dùng đã nạp coin trong kỳ."
            label="Tổng tiền nạp"
            metric={data.primaryKpis.totalTopupVnd}
            value={vnd(data.primaryKpis.totalTopupVnd.value)}
          />
          <FinanceKpiCard
            hint="Doanh thu thuộc nền tảng sau phí."
            label="Doanh thu nền tảng"
            metric={data.primaryKpis.platformRevenueVnd}
            value={vnd(data.primaryKpis.platformRevenueVnd.value)}
          />
          <FinanceKpiCard
            hint="Thu nhập ròng tác giả sau phí từng giao dịch."
            label="Thu nhập tác giả"
            metric={data.primaryKpis.authorNetRevenueVnd}
            value={vnd(data.primaryKpis.authorNetRevenueVnd.value)}
          />
          <FinanceKpiCard
            hint="Tổng tiền đã chi trả cho yêu cầu rút."
            label="Số tiền đã rút"
            metric={data.primaryKpis.totalWithdrawnVnd}
            value={vnd(data.primaryKpis.totalWithdrawnVnd.value)}
          />
        </div>
      </section>

      <RevenueTrendChart isEmpty={data.isEmptyPeriod} points={data.dailyTrend} />

      {showRevenueDetail ? (
        <section className="space-y-3">
          <h2 className="text-lg font-black text-white">Doanh thu & chia tiền</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {revenueKpis.map((kpi) => (
              <FinanceKpiCard hint={kpi.hint} key={kpi.label} label={kpi.label} value={kpi.value} />
            ))}
          </div>
          <RevenueBreakdownTable isEmpty={data.isEmptyPeriod} items={data.revenueBreakdown} />
        </section>
      ) : (
        <Card>
          <p className="text-sm text-zinc-400">Chưa có doanh thu trong kỳ này.</p>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-black text-white">Kinh tế Coin</h2>
        <CoinEconomyPanel data={data.coinEconomy} isEmpty={data.isEmptyPeriod} />
      </section>

      <PaymentStatusPanel status={data.paymentStatus} />

      <PayoutOverviewPanel
        creatorsWithRevenueCount={data.creatorsWithRevenueCount}
        isEmpty={data.isEmptyPeriod}
        payout={data.payoutOverview}
      />

      <RefundChargebackPanel isEmpty={data.isEmptyPeriod} panel={data.refundPanel} />

      <RecentTransactionsTable
        canView={capabilities.canViewTransactions}
        initialRiskIds={data.recentTransactionRiskIds}
        initialRows={data.recentTransactions}
        initialTotal={data.recentTransactionTotal}
        rangeFrom={data.rangeFrom}
        rangeTo={data.rangeTo}
      />

      <FinanceRankingTables
        authors={data.topEarningAuthors}
        isEmpty={data.isEmptyPeriod}
        supporters={data.topSupporters}
        topPaidChapters={data.topPaidChapters}
        topPaidStories={data.topPaidStories}
        topRefundedStories={data.topRefundedStories}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-black text-white">Rủi ro & đối soát</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <FinanceRiskPanel canView={capabilities.canViewRisk} risk={data.extendedRisk} />
          <FinanceReconciliationPanel reconciliation={data.reconciliation} />
        </div>
      </section>

      {capabilities.canExportReports ? (
        <section className="space-y-2">
          <h2 className="text-lg font-black text-white">Xuất báo cáo</h2>
          <p className="text-sm text-zinc-400">
            Dùng nút &quot;Xuất báo cáo&quot; ở đầu trang để tải CSV theo khoảng thời gian và loại báo
            cáo. Cần quyền finance.report.export.
          </p>
        </section>
      ) : null}
    </div>
  );
}
