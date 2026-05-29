import { createClient } from "@/lib/supabase/server";
import { getSePayConfig } from "@/lib/payments/sepay-config";
import type { FinanceTimeFilter } from "@/types/finance";
import type { TransactionRow } from "@/types/transaction";
import type { PayoutRequest } from "@/types/payout";
import { listPayoutRequestsForAdmin } from "@/lib/supabase/payouts";
import { listRiskEventsForAdmin } from "@/lib/supabase/risk";
import { getTransactionsForAdmin } from "@/lib/supabase/transactions";

export type FinanceDateRange = {
  from: string | null;
  to: string | null;
  label: string;
  filter: FinanceTimeFilter;
};

export function resolveFinanceDateRange(
  filter: FinanceTimeFilter,
  custom?: { from?: string | null; to?: string | null }
): FinanceDateRange {
  const now = new Date();
  const end = now.toISOString();

  if (filter === "custom" && custom?.from) {
    const fromIso = new Date(custom.from).toISOString();
    const toIso = custom.to ? new Date(custom.to).toISOString() : end;
    const fromLabel = new Date(custom.from).toLocaleDateString("vi-VN");
    const toLabel = custom.to
      ? new Date(custom.to).toLocaleDateString("vi-VN")
      : "hiện tại";
    return {
      from: fromIso,
      to: toIso,
      label: `${fromLabel} – ${toLabel}`,
      filter: "custom"
    };
  }

  if (filter === "all") {
    return { from: null, to: null, label: "Tất cả", filter: "all" };
  }
  if (filter === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: end, label: "Hôm nay", filter: "today" };
  }
  if (filter === "7d") {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      from: start.toISOString(),
      to: end,
      label: "7 ngày gần nhất",
      filter: "7d"
    };
  }
  if (filter === "30d") {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      from: start.toISOString(),
      to: end,
      label: "30 ngày gần nhất",
      filter: "30d"
    };
  }
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: startMonth.toISOString(),
    to: end,
    label: "Tháng này",
    filter: "month"
  };
}

export function resolvePreviousFinanceDateRange(range: FinanceDateRange): FinanceDateRange | null {
  if (!range.from || !range.to) return null;
  const fromMs = new Date(range.from).getTime();
  const toMs = new Date(range.to).getTime();
  const span = toMs - fromMs;
  if (span <= 0) return null;
  const prevTo = new Date(fromMs).toISOString();
  const prevFrom = new Date(fromMs - span).toISOString();
  return {
    from: prevFrom,
    to: prevTo,
    label: "Kỳ trước",
    filter: range.filter
  };
}

export async function fetchTransactionsForFinance(
  range: FinanceDateRange
): Promise<{ data: TransactionRow[]; error: string | null }> {
  const txs = await getTransactionsForAdmin({
    startDate: range.from ?? undefined,
    endDate: range.to ?? undefined,
    limit: 5000
  });
  return txs;
}

export async function fetchRecentTransactionsForFinance(
  range: FinanceDateRange,
  limit = 25
) {
  const txs = await getTransactionsForAdmin({
    startDate: range.from ?? undefined,
    endDate: range.to ?? undefined,
    limit
  });
  return txs;
}

export async function fetchPaymentStatusSummary(range: FinanceDateRange) {
  const supabase = await createClient();
  const sepay = getSePayConfig();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let checkoutQuery = supabase.from("checkout_sessions").select("status", { count: "exact" });
  if (range.from) checkoutQuery = checkoutQuery.gte("created_at", range.from);
  if (range.to) checkoutQuery = checkoutQuery.lte("created_at", range.to);

  const [checkouts, webhookLatest, webhookFailed, webhookDuplicate] = await Promise.all([
    checkoutQuery.limit(5000),
    supabase
      .from("payment_webhook_events")
      .select("created_at, status")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("payment_webhook_events")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", weekAgo),
    supabase
      .from("payment_webhook_events")
      .select("id", { count: "exact", head: true })
      .eq("status", "ignored_duplicate")
      .gte("created_at", weekAgo)
  ]);

  const rows = checkouts.data ?? [];
  const countStatus = (status: string) =>
    rows.filter((r) => String(r.status) === status).length;

  const failedWebhooks = webhookFailed.count ?? 0;
  let sepayWebhookStatus: "ok" | "error" | "not_configured" = "not_configured";
  if (sepay.ready) {
    sepayWebhookStatus = failedWebhooks > 0 ? "error" : "ok";
  }

  return {
    sepayConfigured: sepay.ready,
    sepayWebhookStatus,
    lastWebhookAt: (webhookLatest.data?.created_at as string | null) ?? null,
    pending: countStatus("pending") + countStatus("created"),
    paid: countStatus("paid"),
    failed: countStatus("failed"),
    expired: countStatus("expired"),
    duplicate: webhookDuplicate.count ?? 0,
    manualReview: countStatus("manual_review"),
    error: checkouts.error?.message ?? null
  };
}

export async function fetchFinanceUrgentCounts() {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    pendingPayouts,
    pendingRefunds,
    openChargebacks,
    failedCheckouts,
    webhookFailed,
    suspiciousTx,
    payoutBlocked,
    manualReviewCheckouts
  ] = await Promise.all([
    supabase
      .from("payout_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["requested", "under_review"]),
    supabase
      .from("refunds")
      .select("id", { count: "exact", head: true })
      .in("status", ["requested", "approved"]),
    supabase
      .from("chargebacks")
      .select("id", { count: "exact", head: true })
      .in("status", ["opened", "under_review"]),
    supabase
      .from("checkout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", weekAgo),
    supabase
      .from("payment_webhook_events")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", weekAgo),
    supabase
      .from("risk_events")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "reviewing"]),
    supabase
      .from("user_risk_profiles")
      .select("id", { count: "exact", head: true })
      .eq("payout_blocked", true),
    supabase
      .from("checkout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "manual_review")
  ]);

  return {
    pendingPayouts: pendingPayouts.count ?? 0,
    pendingRefunds: pendingRefunds.count ?? 0,
    openChargebacks: openChargebacks.count ?? 0,
    failedPayments: failedCheckouts.count ?? 0,
    webhookFailed: webhookFailed.count ?? 0,
    suspiciousTransactions: suspiciousTx.count ?? 0,
    payoutBlockedAuthors: payoutBlocked.count ?? 0,
    pendingReconciliation: manualReviewCheckouts.count ?? 0,
    coinLedgerMismatch: 0
  };
}

export async function fetchTransactionRiskIds(transactionIds: string[]) {
  if (transactionIds.length === 0) return new Set<string>();
  const supabase = await createClient();
  const { data } = await supabase
    .from("risk_events")
    .select("transaction_id")
    .in("transaction_id", transactionIds)
    .in("status", ["open", "reviewing"]);
  return new Set(
    (data ?? [])
      .map((r) => r.transaction_id as string | null)
      .filter((id): id is string => Boolean(id))
  );
}

export async function fetchWalletTotalsSnapshot() {
  const supabase = await createClient();
  const [creatorWallets, userWallets] = await Promise.all([
    supabase.from("creator_wallets").select("pending_revenue_vnd, available_revenue_vnd, locked_revenue_vnd"),
    supabase.from("user_wallets").select("paid_coin_balance, bonus_coin_balance")
  ]);

  return {
    creatorWallets: creatorWallets.data ?? [],
    userWallets: userWallets.data ?? [],
    error: creatorWallets.error?.message ?? userWallets.error?.message ?? null
  };
}

export async function fetchPayoutRequestsForFinance(): Promise<{
  data: PayoutRequest[];
  error: string | null;
}> {
  return listPayoutRequestsForAdmin(500);
}

export async function fetchRiskOverviewData() {
  const [events, riskProfiles] = await Promise.all([
    listRiskEventsForAdmin(500),
    createClient().then((supabase) =>
      supabase
        .from("user_risk_profiles")
        .select("user_id, payout_blocked, risk_level")
    )
  ]);

  return {
    events: events.data,
    riskProfiles: riskProfiles.data ?? [],
    error: events.error ?? riskProfiles.error?.message ?? null
  };
}

export async function fetchTopSupportersRaw(range: FinanceDateRange) {
  const supabase = await createClient();
  let query = supabase
    .from("support_tips")
    .select("from_user_id, coin_amount, status, created_at")
    .eq("status", "completed");
  if (range.from) query = query.gte("created_at", range.from);
  if (range.to) query = query.lte("created_at", range.to);
  const { data, error } = await query.limit(5000);
  return { data: data ?? [], error: error?.message ?? null };
}

export async function fetchTopPaidContentRaw(range: FinanceDateRange) {
  const supabase = await createClient();
  let chapterUnlocks = supabase
    .from("chapter_unlocks")
    .select("story_id, chapter_id, coin_amount, created_at");
  let earlyUnlocks = supabase
    .from("early_access_unlocks")
    .select("story_id, chapter_id, coin_amount, created_at");
  if (range.from) {
    chapterUnlocks = chapterUnlocks.gte("created_at", range.from);
    earlyUnlocks = earlyUnlocks.gte("created_at", range.from);
  }
  if (range.to) {
    chapterUnlocks = chapterUnlocks.lte("created_at", range.to);
    earlyUnlocks = earlyUnlocks.lte("created_at", range.to);
  }
  const [chapters, early] = await Promise.all([
    chapterUnlocks.limit(5000),
    earlyUnlocks.limit(5000)
  ]);
  return {
    chapterUnlocks: chapters.data ?? [],
    earlyUnlocks: early.data ?? [],
    error: chapters.error?.message ?? early.error?.message ?? null
  };
}

export async function countTransactionsForFinance(range: FinanceDateRange) {
  const supabase = await createClient();
  let query = supabase.from("transactions").select("id", { count: "exact", head: true });
  if (range.from) query = query.gte("created_at", range.from);
  if (range.to) query = query.lte("created_at", range.to);
  const { count, error } = await query;
  return { count: count ?? 0, error: error?.message ?? null };
}

export async function fetchTopRefundedStoriesRaw(range: FinanceDateRange) {
  const supabase = await createClient();
  let refundQuery = supabase
    .from("refunds")
    .select("id, amount_vnd, coin_amount, original_transaction_id, created_at")
    .in("status", ["processed", "approved"]);
  if (range.from) refundQuery = refundQuery.gte("created_at", range.from);
  if (range.to) refundQuery = refundQuery.lte("created_at", range.to);
  const { data: refunds, error } = await refundQuery.limit(2000);
  if (error || !refunds?.length) {
    return { rows: [] as Array<{ storyId: string; refundCount: number; refundCoin: number; refundAmountVnd: number }>, error: error?.message ?? null };
  }

  const txIds = [...new Set(refunds.map((r) => String(r.original_transaction_id)))];
  const { data: txRows } = await supabase
    .from("transactions")
    .select("id, story_id")
    .in("id", txIds);

  const storyByTx = new Map(
    (txRows ?? []).map((row) => [String(row.id), (row.story_id as string | null) ?? null])
  );

  const storyMap = new Map<string, { refundCount: number; refundCoin: number; refundAmountVnd: number }>();
  for (const refund of refunds) {
    const storyId = storyByTx.get(String(refund.original_transaction_id));
    if (!storyId) continue;
    const current = storyMap.get(storyId) ?? { refundCount: 0, refundCoin: 0, refundAmountVnd: 0 };
    storyMap.set(storyId, {
      refundCount: current.refundCount + 1,
      refundCoin: current.refundCoin + Number(refund.coin_amount ?? 0),
      refundAmountVnd: current.refundAmountVnd + Number(refund.amount_vnd ?? 0)
    });
  }

  const rows = [...storyMap.entries()]
    .map(([storyId, values]) => ({ storyId, ...values }))
    .sort((a, b) => b.refundCount - a.refundCount)
    .slice(0, 10);

  return { rows, error: null };
}

export async function fetchRefundChargebackSummary(range: FinanceDateRange) {
  const supabase = await createClient();
  let refundQuery = supabase
    .from("refunds")
    .select("id, amount_vnd, status, created_at, user_id, original_transaction_id");
  let chargebackQuery = supabase
    .from("chargebacks")
    .select("id, amount_vnd, status, received_at");
  if (range.from) {
    refundQuery = refundQuery.gte("created_at", range.from);
    chargebackQuery = chargebackQuery.gte("received_at", range.from);
  }
  if (range.to) {
    refundQuery = refundQuery.lte("created_at", range.to);
    chargebackQuery = chargebackQuery.lte("received_at", range.to);
  }
  const [refunds, chargebacks] = await Promise.all([refundQuery.limit(5000), chargebackQuery.limit(5000)]);
  return {
    refunds: refunds.data ?? [],
    chargebacks: chargebacks.data ?? [],
    error: refunds.error?.message ?? chargebacks.error?.message ?? null
  };
}
