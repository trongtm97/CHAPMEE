import { getFinanceAdminOverview } from "@/lib/admin/get-finance-admin-overview";
import {
  fetchFinanceUrgentCounts,
  fetchPaymentStatusSummary,
  fetchPayoutRequestsForFinance,
  fetchRecentTransactionsForFinance,
  fetchRefundChargebackSummary,
  fetchRiskOverviewData,
  countTransactionsForFinance,
  fetchTopPaidContentRaw,
  fetchTopRefundedStoriesRaw,
  fetchTopSupportersRaw,
  fetchTransactionRiskIds,
  fetchTransactionsForFinance,
  fetchWalletTotalsSnapshot,
  resolveFinanceDateRange,
  resolvePreviousFinanceDateRange,
  type FinanceDateRange
} from "@/lib/data/admin-finance";
import { getSePayConfig } from "@/lib/payments/sepay-config";
import { createClient } from "@/lib/data/server";
import type {
  FinanceCreatorRow,
  FinanceDashboardData,
  FinanceDailyTrendPoint,
  FinancePeriodMetric,
  FinanceRefundedStoryRow,
  FinanceStoryChapterRow,
  FinanceSupporterRow,
  FinanceTimeFilter,
  FinanceUrgentItem,
  FinanceUrgencyLevel
} from "@/types/finance";
import type { TransactionRow } from "@/types/transaction";

function num(value: number | null | undefined) {
  return Number.isFinite(value ?? NaN) ? Number(value) : 0;
}

function ratio(part: number, total: number) {
  if (total <= 0) return 0;
  return Number(((part / total) * 100).toFixed(2));
}

function periodMetric(current: number, previous: number): FinancePeriodMetric {
  if (previous <= 0) {
    return { value: current, previousValue: previous, changePercent: null };
  }
  const changePercent = Number((((current - previous) / previous) * 100).toFixed(1));
  return { value: current, previousValue: previous, changePercent };
}

function urgencyLevel(count: number, warnAt: number, dangerAt: number): FinanceUrgencyLevel {
  if (count >= dangerAt) return "danger";
  if (count >= warnAt) return "warning";
  return "normal";
}

function buildDailyTrend(
  transactions: TransactionRow[],
  payouts: Array<{ amount_vnd: number; status: string; created_at: string }>,
  range: FinanceDateRange
): FinanceDailyTrendPoint[] {
  const dayMap = new Map<string, FinanceDailyTrendPoint>();

  const ensureDay = (iso: string) => {
    const date = iso.slice(0, 10);
    if (!dayMap.has(date)) {
      dayMap.set(date, {
        date,
        revenueVnd: 0,
        coinPurchased: 0,
        coinSpent: 0,
        payoutVnd: 0
      });
    }
    return dayMap.get(date)!;
  };

  for (const tx of transactions) {
    if (tx.status !== "completed") continue;
    const day = ensureDay(tx.created_at);
    if (tx.type === "coin_purchase") {
      day.revenueVnd += num(tx.money_amount_vnd);
      day.coinPurchased += num(tx.coin_amount);
    }
    if (tx.direction === "debit") {
      day.coinSpent += num(tx.coin_amount);
    }
    if (
      ["author_tip", "virtual_gift", "chapter_unlock", "vip_subscription"].includes(tx.type)
    ) {
      day.revenueVnd += num(tx.money_amount_vnd);
    }
  }

  for (const payout of payouts) {
    if (payout.status !== "completed") continue;
    const day = ensureDay(payout.created_at);
    day.payoutVnd += num(payout.amount_vnd);
  }

  const points = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (points.length > 0) return points.slice(-31);

  if (range.from && range.to) {
    return [];
  }
  return [];
}

function buildUrgentItems(input: {
  pendingPayouts: number;
  pendingRefunds: number;
  openChargebacks: number;
  failedPayments: number;
  webhookFailed: number;
  suspiciousTransactions: number;
  payoutBlockedAuthors: number;
  pendingReconciliation: number;
  coinLedgerMismatch: number;
  sepayWebhookStatus: "ok" | "error" | "not_configured";
}): { items: FinanceUrgentItem[]; allClear: boolean } {
  const items: FinanceUrgentItem[] = [
    {
      id: "payouts",
      label: "Yêu cầu rút tiền đang chờ",
      count: input.pendingPayouts,
      level: urgencyLevel(input.pendingPayouts, 1, 10),
      href: "/admin/withdrawals",
      statusText: `${input.pendingPayouts} yêu cầu rút tiền đang chờ`
    },
    {
      id: "refunds",
      label: "Hoàn tiền đang chờ",
      count: input.pendingRefunds,
      level: urgencyLevel(input.pendingRefunds, 1, 5),
      href: "/admin/refunds",
      statusText: `${input.pendingRefunds} hoàn tiền đang chờ`
    },
    {
      id: "chargebacks",
      label: "Chargeback đang mở",
      count: input.openChargebacks,
      level: urgencyLevel(input.openChargebacks, 1, 3),
      href: "/admin/refunds",
      statusText: `${input.openChargebacks} chargeback đang mở`
    },
    {
      id: "failed-payments",
      label: "Giao dịch thanh toán lỗi",
      count: input.failedPayments,
      level: urgencyLevel(input.failedPayments, 1, 5),
      href: "/admin/payments",
      statusText: `${input.failedPayments} giao dịch thanh toán cần đối soát`
    },
    {
      id: "webhook",
      label: "Webhook SePay",
      count: input.webhookFailed,
      level:
        input.sepayWebhookStatus === "not_configured"
          ? "warning"
          : input.webhookFailed > 0
            ? "danger"
            : "normal",
      href: "/admin/payments",
      statusText:
        input.sepayWebhookStatus === "not_configured"
          ? "Chưa cấu hình SePay"
          : input.webhookFailed > 0
            ? `${input.webhookFailed} webhook lỗi (7 ngày)`
            : "Webhook SePay: hoạt động bình thường"
    },
    {
      id: "suspicious",
      label: "Giao dịch nghi ngờ",
      count: input.suspiciousTransactions,
      level: urgencyLevel(input.suspiciousTransactions, 1, 5),
      href: "/admin/risk",
      statusText: `${input.suspiciousTransactions} giao dịch nghi ngờ`
    },
    {
      id: "payout-blocked",
      label: "Tác giả bị khóa rút tiền",
      count: input.payoutBlockedAuthors,
      level: urgencyLevel(input.payoutBlockedAuthors, 1, 3),
      href: "/admin/risk",
      statusText: `${input.payoutBlockedAuthors} tác giả bị khóa rút tiền`
    },
    {
      id: "coin-ledger",
      label: "Sổ coin lệch",
      count: input.coinLedgerMismatch,
      level: urgencyLevel(input.coinLedgerMismatch, 1, 1),
      href: "/admin/coins",
      statusText:
        input.coinLedgerMismatch > 0
          ? `${input.coinLedgerMismatch} sổ coin lệch`
          : "Sổ coin khớp"
    }
  ];

  const allClear =
    input.pendingPayouts === 0 &&
    input.pendingRefunds === 0 &&
    input.openChargebacks === 0 &&
    input.failedPayments === 0 &&
    input.webhookFailed === 0 &&
    input.suspiciousTransactions === 0 &&
    input.payoutBlockedAuthors === 0 &&
    input.coinLedgerMismatch === 0;

  return { items, allClear };
}

export async function buildFinanceDashboardData(
  filter: FinanceTimeFilter,
  custom?: { from?: string | null; to?: string | null }
): Promise<{ data: FinanceDashboardData | null; error: string | null }> {
  const range = resolveFinanceDateRange(filter, custom);
  const previousRange = resolvePreviousFinanceDateRange(range);

  const [
    txs,
    previousTxs,
    recentTxs,
    wallets,
    payouts,
    risks,
    supportersRaw,
    paidContentRaw,
    disputes,
    urgentCounts,
    paymentStatus,
    withdrawalOverview,
    txCount,
    refundedStoriesRaw
  ] = await Promise.all([
    fetchTransactionsForFinance(range),
    previousRange
      ? fetchTransactionsForFinance(previousRange)
      : Promise.resolve({ data: [] as TransactionRow[], error: null }),
    fetchRecentTransactionsForFinance(range, 25),
    fetchWalletTotalsSnapshot(),
    fetchPayoutRequestsForFinance(),
    fetchRiskOverviewData(),
    fetchTopSupportersRaw(range),
    fetchTopPaidContentRaw(range),
    fetchRefundChargebackSummary(range),
    fetchFinanceUrgentCounts(),
    fetchPaymentStatusSummary(range),
    getFinanceAdminOverview(),
    countTransactionsForFinance(range),
    fetchTopRefundedStoriesRaw(range)
  ]);

  const error =
    txs.error ??
    previousTxs.error ??
    recentTxs.error ??
    wallets.error ??
    payouts.error ??
    risks.error ??
    supportersRaw.error ??
    paidContentRaw.error ??
    disputes.error ??
    paymentStatus.error ??
    withdrawalOverview.error ??
    txCount.error ??
    refundedStoriesRaw.error ??
    null;
  if (error) {
    return { data: null, error };
  }

  const transactions = txs.data;
  const previousTransactions = previousTxs.data;
  const kpis = buildKpis(transactions, wallets, payouts.data, disputes);
  const previousKpis = previousRange
    ? buildKpis(previousTransactions, wallets, payouts.data, disputes)
    : null;

  const revenueBreakdown = buildRevenueBreakdown(transactions, kpis.grossRevenueVnd);
  const coinEconomy = buildCoinEconomy(transactions, wallets, risks.events);
  const topEarningAuthors = await buildTopEarningAuthors(transactions, payouts.data);
  const topSupporters = await buildTopSupporters(supportersRaw.data);
  const { stories: topPaidStories, chapters: topPaidChapters } = await buildTopPaidContent(
    paidContentRaw.chapterUnlocks,
    paidContentRaw.earlyUnlocks,
    transactions
  );
  const topRefundedStories = await buildTopRefundedStories(refundedStoriesRaw.rows);
  const abnormalTopupUsers = countAbnormalTopupUsers(transactions);
  const payoutOverview = buildPayoutOverview(payouts.data);
  const riskOverview = buildRiskOverview(risks.events, risks.riskProfiles, wallets.creatorWallets);

  const recentIds = recentTxs.data.map((t) => t.id);
  const riskIdSet = await fetchTransactionRiskIds(recentIds);

  const sepay = getSePayConfig();
  const { items: urgentItems, allClear: urgentAllClear } = buildUrgentItems({
    ...urgentCounts,
    sepayWebhookStatus: sepay.ready
      ? paymentStatus.sepayWebhookStatus
      : "not_configured"
  });

  const totalTopupVnd = transactions
    .filter((tx) => tx.status === "completed" && tx.type === "coin_purchase")
    .reduce((sum, tx) => sum + num(tx.money_amount_vnd), 0);
  const prevTopup = previousKpis
    ? previousTransactions
        .filter((tx) => tx.status === "completed" && tx.type === "coin_purchase")
        .reduce((sum, tx) => sum + num(tx.money_amount_vnd), 0)
    : 0;

  const isEmptyPeriod =
    kpis.grossRevenueVnd === 0 &&
    kpis.coinPurchased === 0 &&
    kpis.coinSpent === 0 &&
    kpis.totalPayoutCompletedVnd === 0 &&
    kpis.refundRequests === 0 &&
    recentTxs.data.length === 0;

  const usersRefunded = new Set(
    disputes.refunds.map((r) => (r as { user_id?: string }).user_id).filter(Boolean)
  ).size;

  return {
    data: {
      filter: range.filter,
      rangeLabel: range.label,
      rangeFrom: range.from,
      rangeTo: range.to,
      isEmptyPeriod,
      urgentItems,
      urgentAllClear,
      primaryKpis: {
        totalTopupVnd: periodMetric(totalTopupVnd, prevTopup),
        platformRevenueVnd: periodMetric(
          kpis.platformRevenueVnd,
          previousKpis?.platformRevenueVnd ?? 0
        ),
        authorNetRevenueVnd: periodMetric(
          kpis.creatorNetRevenueVnd,
          previousKpis?.creatorNetRevenueVnd ?? 0
        ),
        totalWithdrawnVnd: periodMetric(
          kpis.totalPayoutCompletedVnd,
          previousKpis?.totalPayoutCompletedVnd ?? 0
        )
      },
      dailyTrend: buildDailyTrend(transactions, payouts.data, range),
      paymentStatus: {
        sepayConfigured: paymentStatus.sepayConfigured,
        sepayWebhookStatus: paymentStatus.sepayWebhookStatus,
        lastWebhookAt: paymentStatus.lastWebhookAt,
        pending: paymentStatus.pending,
        paid: paymentStatus.paid,
        failed: paymentStatus.failed,
        expired: paymentStatus.expired,
        duplicate: paymentStatus.duplicate,
        manualReview: paymentStatus.manualReview
      },
      reconciliation: {
        pendingCount: urgentCounts.pendingReconciliation,
        level: urgencyLevel(urgentCounts.pendingReconciliation, 1, 5)
      },
      extendedRisk: {
        suspiciousTransactions: riskOverview.suspiciousTransactions,
        coinLedgerMismatch: urgentCounts.coinLedgerMismatch,
        payoutBlockedAuthors: riskOverview.payoutBlockedCreators,
        abnormalRefunds: kpis.refundRequests,
        abnormalTopupUsers,
        abnormalBonusRecipients: coinEconomy.suspiciousBonusCoinUsageCount,
        openChargebacks: kpis.chargebackOpenCases,
        blockedPayouts: riskOverview.payoutBlockedCreators
      },
      refundPanel: {
        refundRequests: kpis.refundRequests,
        refundAmountVnd: kpis.refundAmountVnd,
        openChargebacks: kpis.chargebackOpenCases,
        chargebackAmountVnd: kpis.chargebackAmountVnd,
        coinsRefunded: transactions
          .filter((tx) => tx.type === "refund")
          .reduce((sum, tx) => sum + num(tx.coin_amount), 0),
        usersRefunded
      },
      creatorsWithRevenueCount: withdrawalOverview.data.creatorsWithRevenueCount,
      kpis,
      revenueBreakdown,
      coinEconomy,
      topEarningAuthors,
      topSupporters,
      topPaidStories,
      topPaidChapters,
      topRefundedStories,
      payoutOverview,
      riskOverview,
      recentTransactions: recentTxs.data,
      recentTransactionTotal: txCount.count,
      recentTransactionRiskIds: [...riskIdSet]
    },
    error: null
  };
}

function buildKpis(
  txs: TransactionRow[],
  wallets: { creatorWallets: Array<Record<string, unknown>>; userWallets: Array<Record<string, unknown>> },
  payoutRequests: Array<{ amount_vnd: number; status: string }>,
  disputes: {
    refunds: Array<{ id: string }>;
    chargebacks: Array<{ status: string; amount_vnd?: number }>;
  }
) {
  const completedTxs = txs.filter((tx) => tx.status === "completed");
  const grossRevenueVnd = completedTxs
    .filter((tx) =>
      [
        "coin_purchase",
        "author_tip",
        "virtual_gift",
        "chapter_unlock",
        "vip_subscription",
        "fan_club_subscription",
        "platform_fee"
      ].includes(tx.type)
    )
    .filter((tx) => {
      if (tx.type !== "platform_fee") return true;
      return tx.metadata?.revenue_type === "sponsored_campaign_revenue";
    })
    .reduce((sum, tx) => sum + num(tx.money_amount_vnd), 0);
  const platformRevenueVnd = completedTxs.reduce(
    (sum, tx) => sum + num(tx.platform_fee_vnd),
    0
  );
  const creatorGrossRevenueVnd = completedTxs.reduce(
    (sum, tx) => sum + num(tx.creator_gross_vnd),
    0
  );
  const creatorNetRevenueVnd = completedTxs.reduce(
    (sum, tx) => sum + num(tx.creator_net_vnd),
    0
  );

  const pendingCreatorRevenueVnd = wallets.creatorWallets.reduce(
    (sum, row) => sum + Number(row.pending_revenue_vnd ?? 0),
    0
  );
  const availableCreatorRevenueVnd = wallets.creatorWallets.reduce(
    (sum, row) => sum + Number(row.available_revenue_vnd ?? 0),
    0
  );
  const lockedCreatorRevenueVnd = wallets.creatorWallets.reduce(
    (sum, row) => sum + Number(row.locked_revenue_vnd ?? 0),
    0
  );

  const totalPayoutRequestedVnd = payoutRequests.reduce(
    (sum, row) => sum + num(row.amount_vnd),
    0
  );
  const totalPayoutCompletedVnd = payoutRequests
    .filter((row) => row.status === "completed")
    .reduce((sum, row) => sum + num(row.amount_vnd), 0);

  const refundAmountVnd = completedTxs
    .filter((tx) => tx.type === "refund")
    .reduce((sum, tx) => sum + num(tx.money_amount_vnd), 0);

  const chargebackAmountVnd = disputes.chargebacks.reduce(
    (sum, row) => sum + Number(row.amount_vnd ?? 0),
    0
  );
  const coinPurchased = completedTxs
    .filter((tx) => tx.type === "coin_purchase")
    .reduce((sum, tx) => sum + num(tx.coin_amount), 0);
  const coinSpent = completedTxs
    .filter((tx) => tx.direction === "debit")
    .reduce((sum, tx) => sum + num(tx.coin_amount), 0);
  const bonusCoinIssued = completedTxs
    .filter((tx) => tx.direction === "credit" && num(tx.bonus_coin_amount) > 0)
    .reduce((sum, tx) => sum + num(tx.bonus_coin_amount), 0);
  const paidUsersSet = new Set(
    completedTxs.filter((tx) => tx.type === "coin_purchase" && tx.user_id).map((tx) => tx.user_id as string)
  );
  const activeUsersSet = new Set(
    completedTxs.filter((tx) => tx.user_id).map((tx) => tx.user_id as string)
  );
  const paidUsers = paidUsersSet.size;
  const payingConversionRate = ratio(paidUsersSet.size, activeUsersSet.size);
  const refundRequests = disputes.refunds.length;
  const chargebackOpenCases = disputes.chargebacks.filter((item) =>
    ["opened", "under_review"].includes(item.status)
  ).length;

  return {
    grossRevenueVnd,
    platformRevenueVnd,
    creatorGrossRevenueVnd,
    creatorNetRevenueVnd,
    pendingCreatorRevenueVnd,
    availableCreatorRevenueVnd,
    lockedCreatorRevenueVnd,
    totalPayoutRequestedVnd,
    totalPayoutCompletedVnd,
    refundAmountVnd,
    chargebackAmountVnd,
    coinPurchased,
    coinSpent,
    bonusCoinIssued,
    paidUsers,
    payingConversionRate,
    refundRequests,
    chargebackOpenCases
  };
}

function buildRevenueBreakdown(txs: TransactionRow[], grossRevenueVnd: number) {
  const amountMap = new Map<string, number>();
  const countMap = new Map<string, number>();
  for (const tx of txs) {
    if (tx.status !== "completed") continue;
    let key: string = tx.type;
    if (
      tx.type === "platform_fee" &&
      tx.metadata?.revenue_type === "sponsored_campaign_revenue"
    ) {
      key = "sponsored_challenge";
    }
    if (tx.type === "chapter_unlock" && tx.metadata?.early_access === true) {
      key = "early_access_unlock";
    }
    const amount = num(tx.money_amount_vnd);
    amountMap.set(key, (amountMap.get(key) ?? 0) + amount);
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }
  const keys = [
    "coin_purchase",
    "author_tip",
    "virtual_gift",
    "chapter_unlock",
    "early_access_unlock",
    "vip_subscription",
    "fan_club_subscription",
    "rewarded_ads",
    "sponsored_challenge",
    "platform_fee"
  ];
  return keys.map((source) => {
    const amountVnd = amountMap.get(source) ?? 0;
    return {
      source,
      amountVnd,
      ratio: ratio(amountVnd, grossRevenueVnd),
      transactionCount: countMap.get(source) ?? 0
    };
  });
}

function countAbnormalTopupUsers(txs: TransactionRow[]) {
  const purchasesByUser = new Map<string, number>();
  for (const tx of txs) {
    if (tx.status !== "completed" || tx.type !== "coin_purchase" || !tx.user_id) continue;
    purchasesByUser.set(tx.user_id, (purchasesByUser.get(tx.user_id) ?? 0) + 1);
  }
  return [...purchasesByUser.values()].filter((count) => count >= 5).length;
}

function buildCoinEconomy(
  txs: TransactionRow[],
  wallets: { creatorWallets: Array<Record<string, unknown>>; userWallets: Array<Record<string, unknown>> },
  riskEvents: Array<{ event_type: string }>
) {
  const completed = txs.filter((tx) => tx.status === "completed");
  const paidCoinSold = completed
    .filter((tx) => tx.type === "coin_purchase")
    .reduce((sum, tx) => sum + num(tx.coin_amount), 0);
  const bonusCoinGranted = completed
    .filter((tx) => tx.direction === "credit")
    .reduce((sum, tx) => sum + num(tx.bonus_coin_amount), 0);

  const spendModuleMap = new Map<string, number>();
  for (const tx of completed.filter((tx) => tx.direction === "debit")) {
    spendModuleMap.set(tx.type, (spendModuleMap.get(tx.type) ?? 0) + num(tx.coin_amount));
  }
  const spentByModule = [...spendModuleMap.entries()]
    .map(([module, coin]) => ({ module, coin }))
    .sort((a, b) => b.coin - a.coin)
    .slice(0, 8);

  const remainingPaidCoinBalance = wallets.userWallets.reduce(
    (sum, row) => sum + Number(row.paid_coin_balance ?? 0),
    0
  );
  const remainingBonusCoinBalance = wallets.userWallets.reduce(
    (sum, row) => sum + Number(row.bonus_coin_balance ?? 0),
    0
  );
  const spentBonus = completed.reduce((sum, tx) => sum + num(tx.bonus_coin_amount), 0);
  const spentTotal = completed
    .filter((tx) => tx.direction === "debit")
    .reduce((sum, tx) => sum + num(tx.coin_amount), 0);

  const coinsRefunded = completed
    .filter((tx) => tx.type === "refund")
    .reduce((sum, tx) => sum + num(tx.coin_amount), 0);
  const adminCoinAdjusted = completed
    .filter((tx) => tx.type === "admin_coin_adjustment")
    .reduce((sum, tx) => sum + Math.abs(num(tx.coin_amount)), 0);
  const negativeCoinTransactions = txs.filter(
    (tx) => num(tx.coin_amount) < 0 || num(tx.paid_coin_amount) < 0 || num(tx.bonus_coin_amount) < 0
  ).length;
  const unpaidCoinCredits = txs.filter(
    (tx) => tx.type === "coin_purchase" && tx.status === "pending"
  ).length;

  return {
    paidCoinSold,
    bonusCoinGranted,
    spentByModule,
    remainingPaidCoinBalance,
    remainingBonusCoinBalance,
    bonusCoinSpendRatio: ratio(spentBonus, spentTotal),
    suspiciousBonusCoinUsageCount: riskEvents.filter(
      (event) => event.event_type === "high_bonus_coin_spend_to_creator"
    ).length,
    coinsRefunded,
    adminCoinAdjusted,
    negativeCoinTransactions,
    unpaidCoinCredits
  };
}

async function buildTopEarningAuthors(
  txs: TransactionRow[],
  payouts: Array<{ creator_user_id: string; amount_vnd: number; status: string }>
): Promise<FinanceCreatorRow[]> {
  type Agg = {
    gross: number;
    net: number;
    purchases: number;
    supporters: Set<string>;
  };
  const map = new Map<string, Agg>();

  for (const tx of txs) {
    if (tx.status !== "completed" || !tx.creator_user_id) continue;
    const id = tx.creator_user_id;
    const agg = map.get(id) ?? { gross: 0, net: 0, purchases: 0, supporters: new Set() };
    agg.gross += num(tx.creator_gross_vnd);
    agg.net += num(tx.creator_net_vnd);
    if (["chapter_unlock", "story_unlock", "author_tip", "virtual_gift"].includes(tx.type)) {
      agg.purchases += 1;
      if (tx.user_id) agg.supporters.add(tx.user_id);
    }
    map.set(id, agg);
  }

  const withdrawnByCreator = new Map<string, number>();
  for (const row of payouts) {
    if (row.status !== "completed") continue;
    withdrawnByCreator.set(
      row.creator_user_id,
      (withdrawnByCreator.get(row.creator_user_id) ?? 0) + num(row.amount_vnd)
    );
  }

  const top = [...map.entries()].sort((a, b) => b[1].net - a[1].net).slice(0, 10);
  if (top.length === 0) return [];

  const db = await createClient();
  const ids = top.map(([id]) => id);
  const [{ data: profiles }, { data: creators }] = await Promise.all([
    db.from("profiles").select("id, display_name, username").in("id", ids),
    db.from("creator_profiles").select("user_id, pen_name").in("user_id", ids)
  ]);
  const nameMap = new Map(
    (profiles ?? []).map((row) => [
      String(row.id),
      String((row.display_name as string | null) ?? (row.username as string | null) ?? "Tác giả")
    ])
  );
  const studioMap = new Map(
    (creators ?? []).map((row) => [String(row.user_id), String(row.pen_name ?? "")])
  );

  return top.map(([creatorUserId, agg]) => ({
    creatorUserId,
    creatorName: nameMap.get(creatorUserId) ?? "Tác giả",
    studioName: studioMap.get(creatorUserId) || null,
    grossRevenueVnd: agg.gross,
    netRevenueVnd: agg.net,
    purchaseCount: agg.purchases,
    supporterCount: agg.supporters.size,
    withdrawnVnd: withdrawnByCreator.get(creatorUserId) ?? 0
  }));
}

async function buildTopRefundedStories(
  rows: Array<{
    storyId: string;
    refundCount: number;
    refundCoin: number;
    refundAmountVnd: number;
  }>
): Promise<FinanceRefundedStoryRow[]> {
  if (rows.length === 0) return [];
  const db = await createClient();
  const storyIds = rows.map((r) => r.storyId);
  const { data: stories } = await db
    .from("stories")
    .select("id, title, creator_id, creator_profiles(pen_name)")
    .in("id", storyIds);

  const storyMeta = new Map(
    (stories ?? []).map((row) => {
      const cp = row.creator_profiles as { pen_name?: string } | { pen_name?: string }[] | null;
      const penName = Array.isArray(cp) ? cp[0]?.pen_name : cp?.pen_name;
      return [
        String(row.id),
        {
          title: String(row.title ?? "Truyện"),
          authorName: penName ? String(penName) : null
        }
      ];
    })
  );

  return rows.map((row) => {
    const meta = storyMeta.get(row.storyId);
    return {
      storyId: row.storyId,
      storyTitle: meta?.title ?? row.storyId.slice(0, 8),
      authorName: meta?.authorName ?? null,
      refundCount: row.refundCount,
      refundCoin: row.refundCoin,
      refundAmountVnd: row.refundAmountVnd
    };
  });
}

async function buildTopSupporters(
  rows: Array<{ from_user_id: string; coin_amount: number }>
): Promise<FinanceSupporterRow[]> {
  const map = new Map<string, { totalCoin: number; tipCount: number }>();
  for (const row of rows) {
    const userId = String(row.from_user_id);
    const current = map.get(userId) ?? { totalCoin: 0, tipCount: 0 };
    map.set(userId, {
      totalCoin: current.totalCoin + Number(row.coin_amount ?? 0),
      tipCount: current.tipCount + 1
    });
  }
  const top = [...map.entries()].sort((a, b) => b[1].totalCoin - a[1].totalCoin).slice(0, 10);
  if (top.length === 0) return [];

  const db = await createClient();
  const ids = top.map(([id]) => id);
  const { data } = await db
    .from("profiles")
    .select("id, display_name, username")
    .in("id", ids);
  const nameMap = new Map(
    (data ?? []).map((row) => [
      String(row.id),
      String((row.display_name as string | null) ?? (row.username as string | null) ?? "Reader")
    ])
  );

  return top.map(([userId, values]) => ({
    userId,
    displayName: nameMap.get(userId) ?? "Độc giả",
    totalCoin: values.totalCoin,
    tipCount: values.tipCount
  }));
}

async function buildTopPaidContent(
  chapterUnlocks: Array<{ story_id: string; chapter_id: string; coin_amount: number }>,
  earlyUnlocks: Array<{ story_id: string; chapter_id: string; coin_amount: number }>,
  txs: TransactionRow[]
) {
  const refundByStory = new Map<string, number>();
  for (const tx of txs) {
    if (tx.type !== "refund" || !tx.story_id) continue;
    refundByStory.set(tx.story_id, (refundByStory.get(tx.story_id) ?? 0) + 1);
  }

  const chapterMap = new Map<string, { totalCoin: number; unlockCount: number; storyId: string; chapterId: string }>();
  const storyMap = new Map<string, { totalCoin: number; unlockCount: number; storyId: string }>();

  for (const row of [...chapterUnlocks, ...earlyUnlocks]) {
    const storyId = String(row.story_id);
    const chapterId = String(row.chapter_id);
    const chapterKey = `${storyId}:${chapterId}`;
    const ch = chapterMap.get(chapterKey) ?? {
      totalCoin: 0,
      unlockCount: 0,
      storyId,
      chapterId
    };
    chapterMap.set(chapterKey, {
      ...ch,
      totalCoin: ch.totalCoin + Number(row.coin_amount ?? 0),
      unlockCount: ch.unlockCount + 1
    });

    const st = storyMap.get(storyId) ?? { totalCoin: 0, unlockCount: 0, storyId };
    storyMap.set(storyId, {
      ...st,
      totalCoin: st.totalCoin + Number(row.coin_amount ?? 0),
      unlockCount: st.unlockCount + 1
    });
  }

  const db = await createClient();
  const storyIds = [
    ...new Set([...storyMap.keys(), ...[...chapterMap.values()].map((c) => c.storyId)])
  ];
  const chapterIds = [...chapterMap.values()].map((c) => c.chapterId);

  const [{ data: stories }, { data: chapters }] = await Promise.all([
    storyIds.length
      ? db
          .from("stories")
          .select("id, title, creator_profiles(pen_name)")
          .in("id", storyIds)
      : Promise.resolve({ data: [] }),
    chapterIds.length
      ? db.from("chapters").select("id, title, chapter_number").in("id", chapterIds)
      : Promise.resolve({ data: [] })
  ]);

  const storyTitleMap = new Map(
    (stories ?? []).map((s) => {
      const cp = s.creator_profiles as { pen_name?: string } | { pen_name?: string }[] | null;
      const penName = Array.isArray(cp) ? cp[0]?.pen_name : cp?.pen_name;
      return [String(s.id), { title: String(s.title ?? "Truyện"), author: penName ? String(penName) : null }];
    })
  );
  const chapterTitleMap = new Map(
    (chapters ?? []).map((c) => [
      String(c.id),
      `Ch. ${c.chapter_number ?? "?"} — ${String(c.title ?? "Chương")}`
    ])
  );

  const toRow = (
    id: string,
    storyId: string | null,
    chapterId: string | null,
    values: { totalCoin: number; unlockCount: number }
  ): FinanceStoryChapterRow => {
    const refunds = storyId ? refundByStory.get(storyId) ?? 0 : 0;
    const refundRate =
      values.unlockCount > 0 ? Number(((refunds / values.unlockCount) * 100).toFixed(1)) : 0;
    const meta = storyId ? storyTitleMap.get(storyId) : null;
    const label = chapterId
      ? chapterTitleMap.get(chapterId) ?? id
      : meta?.title ?? id;
    return {
      id,
      storyId,
      chapterId,
      label,
      storyTitle: meta?.title ?? null,
      authorName: meta?.author ?? null,
      totalCoin: values.totalCoin,
      revenueVnd: values.totalCoin,
      unlockCount: values.unlockCount,
      refundRate
    };
  };

  const storiesRows = [...storyMap.entries()]
    .sort((a, b) => b[1].totalCoin - a[1].totalCoin)
    .slice(0, 10)
    .map(([storyId, values]) => toRow(storyId, storyId, null, values));

  const chapterRows = [...chapterMap.entries()]
    .sort((a, b) => b[1].totalCoin - a[1].totalCoin)
    .slice(0, 10)
    .map(([key, values]) => toRow(key, values.storyId, values.chapterId, values));

  return { stories: storiesRows, chapters: chapterRows };
}

function buildPayoutOverview(
  requests: Array<{ id: string; creator_user_id: string; amount_vnd: number; status: string; created_at: string }>
) {
  const requested = requests.filter((item) => item.status === "requested").length;
  const underReview = requests.filter((item) => item.status === "under_review").length;
  const completedRows = requests.filter((item) => item.status === "completed");
  const completed = completedRows.length;
  const rejected = requests.filter((item) => item.status === "rejected").length;
  const failed = requests.filter((item) => item.status === "failed").length;
  const totalRequestedAmount = requests.reduce((sum, item) => sum + num(item.amount_vnd), 0);
  const totalCompletedAmount = completedRows.reduce((sum, item) => sum + num(item.amount_vnd), 0);

  return {
    requested,
    underReview,
    completed,
    rejected,
    failed,
    averagePayoutAmount: completed > 0 ? totalCompletedAmount / completed : 0,
    totalRequestedAmount,
    totalCompletedAmount,
    recent: requests.slice(0, 10).map((item) => ({
      id: item.id,
      creatorUserId: item.creator_user_id,
      amountVnd: num(item.amount_vnd),
      status: item.status as never,
      createdAt: item.created_at
    }))
  };
}

function buildRiskOverview(
  events: Array<{ severity: string; status: string; transaction_id: string | null }>,
  riskProfiles: Array<{ payout_blocked: boolean }>,
  creatorWalletRows: Array<Record<string, unknown>>
) {
  const openHighCritical = events.filter(
    (event) => event.status === "open" && ["high", "critical"].includes(event.severity)
  ).length;
  const payoutBlockedCreators = riskProfiles.filter((profile) => profile.payout_blocked).length;
  const suspiciousTransactions = events.filter((event) => event.transaction_id != null).length;
  const lockedRevenueDueToRisk = creatorWalletRows.reduce(
    (sum, row) => sum + Number(row.locked_revenue_vnd ?? 0),
    0
  );
  return {
    openHighCritical,
    lockedRevenueDueToRisk,
    payoutBlockedCreators,
    suspiciousTransactions
  };
}
