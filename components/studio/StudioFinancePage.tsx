import { CreatorRevenuePolicyBox } from "@/components/studio/CreatorRevenuePolicyBox";
import { FinanceBankAccountsSection } from "@/components/studio/finance/FinanceBankAccountsSection";
import { FinanceHistoryTabs } from "@/components/studio/finance/FinanceHistoryTabs";
import { FinanceOverviewSection } from "@/components/studio/finance/FinanceOverviewSection";
import { FinancePageHeader } from "@/components/studio/finance/FinancePageHeader";
import { FinancePinModule } from "@/components/studio/finance/FinancePinModule";
import { FinanceWithdrawalSection } from "@/components/studio/finance/FinanceWithdrawalSection";
import { FinanceWithdrawalStatusCard } from "@/components/studio/finance/FinanceWithdrawalStatusCard";
import { EmptyState, ErrorState } from "@/components/ui";
import { STUDIO_PAGE_WIDTH_CLASS } from "@/lib/studio/constants";
import type { StudioFinancePageData } from "@/types/finance";

type StudioFinancePageProps = {
  data: StudioFinancePageData;
  creatorUserId: string;
};

export function StudioFinancePage({ data, creatorUserId }: StudioFinancePageProps) {
  if (data.error) {
    return <ErrorState message={data.error} title="Không tải được tài chính" />;
  }

  if (!data.config.creatorMonetizationEnabled && !data.config.withdrawalsEnabled) {
    return (
      <EmptyState
        description="Bật kiếm tiền tại mục Kiếm tiền hoặc liên hệ ChapMee nếu bạn cần hỗ trợ."
        title="Tài chính chưa khả dụng"
      />
    );
  }

  return (
    <div className={`${STUDIO_PAGE_WIDTH_CLASS} mx-auto max-w-[1200px] space-y-5 pb-24 sm:pb-8`}>
      <FinancePageHeader canWithdraw={data.eligibility.canWithdraw} />

      <FinanceOverviewSection balance={data.balance} config={data.config} />

      <FinanceWithdrawalStatusCard eligibility={data.eligibility} identity={data.identity} />

      <FinanceBankAccountsSection accounts={data.bankAccounts} identity={data.identity} />

      <FinancePinModule
        pinConfigured={data.pinConfigured}
        pinLocked={data.pinLocked}
        pinLockedUntil={data.pinLockedUntil}
        pinRequired={data.config.withdrawalPinRequired}
      />

      <FinanceWithdrawalSection
        availableBalanceVnd={data.balance.availableBalanceVnd}
        bankAccounts={data.bankAccounts}
        config={data.config}
        eligibility={data.eligibility}
        pinRequired={data.config.withdrawalPinRequired}
      />

      <FinanceHistoryTabs
        bankAccounts={data.bankAccounts}
        earningsFilter={data.earningsFilter}
        earningsRows={data.earningsRows}
        ledgerRows={data.ledgerRows}
        securityLogs={data.securityLogs}
        withdrawalHistory={data.withdrawalHistory}
      />

      <CreatorRevenuePolicyBox creatorUserId={creatorUserId} />
    </div>
  );
}
