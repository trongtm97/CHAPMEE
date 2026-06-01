import {
  FinanceKpiCard,
  FinanceSection,
  formatFinanceVnd
} from "@/components/studio/finance/finance-ui";
import type { CreatorFinanceBalance, CreatorFinanceConfigView } from "@/types/finance";

type FinanceOverviewSectionProps = {
  balance: CreatorFinanceBalance;
  config: CreatorFinanceConfigView;
};

export function FinanceOverviewSection({ balance, config }: FinanceOverviewSectionProps) {
  return (
    <FinanceSection title="Tổng quan số dư">
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <FinanceKpiCard
          hint="Số tiền có thể gửi yêu cầu rút"
          label="Có thể rút"
          tone="green"
          value={formatFinanceVnd(balance.availableBalanceVnd)}
        />
        <FinanceKpiCard
          label="Đang chờ rút"
          tone="amber"
          value={formatFinanceVnd(balance.pendingWithdrawalVnd)}
        />
        <FinanceKpiCard
          label="Đang giữ"
          tone="purple"
          value={formatFinanceVnd(balance.lockedBalanceVnd)}
        />
        <FinanceKpiCard
          label="Tổng doanh thu NET"
          tone="cyan"
          value={formatFinanceVnd(balance.totalNetReceivedVnd)}
        />
        <FinanceKpiCard
          label="Đã rút"
          tone="blue"
          value={formatFinanceVnd(balance.totalWithdrawnVnd)}
        />
        <FinanceKpiCard
          label="ChapMee giữ"
          tone="slate"
          value={formatFinanceVnd(balance.totalFeesDeductedVnd)}
        />
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Rút tối thiểu:{" "}
        <span className="font-semibold text-zinc-400">
          {config.withdrawalsEnabled
            ? formatFinanceVnd(config.minWithdrawAmountVnd)
            : "Chưa bật"}
        </span>
        {config.withdrawalReviewRequired ? " · Yêu cầu rút cần được duyệt trước khi thanh toán." : null}
      </p>
    </FinanceSection>
  );
}
