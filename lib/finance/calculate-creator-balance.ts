import { getOrCreateCreatorWallet } from "@/lib/wallets/creator-wallet";
import { listCreatorWalletLedger } from "@/lib/data/creator-finance";
import { getCreatorEarningAggregates } from "@/lib/finance/get-creator-earning-aggregates";
import type { CreatorFinanceBalance } from "@/types/finance";

const EARNING_CREDIT_TYPES = new Set([
  "earning_net_credit",
  "chapter_unlock_revenue",
  "story_unlock_revenue",
  "tip_revenue",
  "bonus"
]);

function sumLedger(
  rows: Awaited<ReturnType<typeof listCreatorWalletLedger>>["data"],
  predicate: (row: (typeof rows)[number]) => boolean
) {
  return rows.reduce((sum, row) => {
    if (!predicate(row)) return sum;
    return sum + row.amount_vnd;
  }, 0);
}

export async function calculateCreatorBalance(
  creatorUserId: string
): Promise<{ data: CreatorFinanceBalance | null; error: string | null }> {
  const [walletResult, ledgerResult, aggregatesResult] = await Promise.all([
    getOrCreateCreatorWallet(creatorUserId),
    listCreatorWalletLedger(creatorUserId, 500),
    getCreatorEarningAggregates(creatorUserId)
  ]);

  if (ledgerResult.error) {
    return { data: null, error: ledgerResult.error };
  }

  const ledgerRows = ledgerResult.data;
  const ledgerCreditsVnd = sumLedger(
    ledgerRows,
    (row) => row.direction === "credit"
  );
  const ledgerDebitsVnd = sumLedger(
    ledgerRows,
    (row) => row.direction === "debit" && row.type !== "withdrawal_hold"
  );
  const ledgerHoldsVnd =
    sumLedger(ledgerRows, (row) => row.type === "withdrawal_hold" && row.direction === "debit") -
    sumLedger(ledgerRows, (row) => row.type === "withdrawal_refund" && row.direction === "credit");

  const wallet = walletResult.data;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  let monthEarningsVnd = 0;
  for (const row of ledgerRows) {
    if (row.direction !== "credit") continue;
    if (!EARNING_CREDIT_TYPES.has(row.type)) {
      continue;
    }
    if (row.created_at >= monthStart) {
      monthEarningsVnd += row.amount_vnd;
    }
  }

  const aggregateFields = {
    totalGrossRevenueVnd: aggregatesResult.totalGrossRevenueVnd,
    totalFeesDeductedVnd: aggregatesResult.totalFeesDeductedVnd,
    totalNetReceivedVnd: aggregatesResult.totalNetReceivedVnd,
    pendingWithdrawalVnd: 0
  };

  if (!wallet) {
    return {
      data: {
        availableBalanceVnd: 0,
        pendingBalanceVnd: 0,
        lockedBalanceVnd: 0,
        totalEarnedVnd: 0,
        totalWithdrawnVnd: 0,
        monthEarningsVnd,
        ledgerCreditsVnd,
        ledgerDebitsVnd,
        ledgerHoldsVnd: Math.max(0, ledgerHoldsVnd),
        ...aggregateFields
      },
      error: walletResult.error ?? aggregatesResult.error
    };
  }

  return {
    data: {
      availableBalanceVnd: wallet.available_revenue_vnd,
      pendingBalanceVnd: wallet.pending_revenue_vnd,
      lockedBalanceVnd: wallet.locked_revenue_vnd,
      totalEarnedVnd: wallet.total_earned_vnd,
      totalWithdrawnVnd: wallet.total_withdrawn_vnd,
      monthEarningsVnd,
      ledgerCreditsVnd,
      ledgerDebitsVnd,
      ledgerHoldsVnd: Math.max(0, ledgerHoldsVnd),
      ...aggregateFields
    },
    error: aggregatesResult.error
  };
}
