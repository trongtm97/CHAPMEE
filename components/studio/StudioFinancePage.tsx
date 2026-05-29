import Link from "next/link";
import { CreatorRevenuePolicyBox } from "@/components/studio/CreatorRevenuePolicyBox";
import { FinanceOverviewCards } from "@/components/studio/FinanceOverviewCards";
import { IncomeTransparencyBox } from "@/components/studio/IncomeTransparencyBox";
import { EarningsBreakdownTable } from "@/components/studio/EarningsBreakdownTable";
import { WalletLedgerTable } from "@/components/studio/WalletLedgerTable";
import { WithdrawalHistoryTable } from "@/components/studio/WithdrawalHistoryTable";
import { PayoutProfileForm } from "@/components/studio/PayoutProfileForm";
import { WithdrawalPinSetup } from "@/components/studio/WithdrawalPinSetup";
import { FinanceWithdrawalRequestForm } from "@/components/studio/FinanceWithdrawalRequestForm";
import { FinanceSecurityLogs } from "@/components/studio/FinanceSecurityLogs";
import { ErrorState, EmptyState } from "@/components/ui";
import type { CreatorPayoutAccount } from "@/types/payout";
import type { StudioFinancePageData } from "@/types/finance";

type StudioFinancePageProps = {
  data: StudioFinancePageData & { payoutAccounts: CreatorPayoutAccount[] };
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
    <div className="space-y-8">
      <p className="text-sm text-zinc-400">
        Cấu hình trả phí và tip tại{" "}
        <Link className="font-semibold text-sky-300 hover:text-sky-200" href="/studio/monetization">
          Kiếm tiền
        </Link>
        .
      </p>

      <FinanceOverviewCards balance={data.balance} config={data.config} />
      <CreatorRevenuePolicyBox creatorUserId={creatorUserId} />
      <IncomeTransparencyBox config={data.config} />
      <EarningsBreakdownTable rows={data.earningsRows} activeFilter={data.earningsFilter} />
      <WalletLedgerTable rows={data.ledgerRows} />
      <WithdrawalHistoryTable rows={data.withdrawalHistory} />
      <PayoutProfileForm config={data.config} accounts={data.payoutAccounts} />
      <WithdrawalPinSetup
        pinConfigured={data.pinConfigured}
        pinLocked={data.pinLocked}
        pinLockedUntil={data.pinLockedUntil}
        pinRequired={data.config.withdrawalPinRequired}
      />
      <FinanceWithdrawalRequestForm
        config={data.config}
        availableBalanceVnd={data.balance.availableBalanceVnd}
        accounts={data.payoutAccounts}
        canWithdraw={data.canWithdraw}
        blockReason={data.withdrawBlockReason}
        pinRequired={data.config.withdrawalPinRequired}
      />
      <FinanceSecurityLogs logs={data.securityLogs} />
    </div>
  );
}
