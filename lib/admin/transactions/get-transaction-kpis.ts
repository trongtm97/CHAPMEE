"use server";

import { createClient } from "@/lib/data/server";
import type { TransactionKpiSummary } from "@/types/admin-transaction";

export async function getTransactionKpis(options?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ data: TransactionKpiSummary; error: string | null }> {
  const db = await createClient();

  let countQuery = db.from("transactions").select("id", { count: "exact", head: true });
  let depositQuery = db
    .from("transactions")
    .select("coin_amount")
    .eq("type", "coin_purchase")
    .eq("status", "completed")
    .limit(10000);
  let spendQuery = db
    .from("transactions")
    .select("coin_amount")
    .eq("direction", "debit")
    .eq("status", "completed")
    .limit(10000);
  let reviewCountQuery = db
    .from("risk_events")
    .select("id", { count: "exact", head: true })
    .in("status", ["open", "reviewing"])
    .not("transaction_id", "is", null);
  let adminAdjustQuery = db
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("type", "admin_coin_adjustment");
  let failedQuery = db
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed");

  if (options?.startDate) {
    countQuery = countQuery.gte("created_at", options.startDate);
    depositQuery = depositQuery.gte("created_at", options.startDate);
    spendQuery = spendQuery.gte("created_at", options.startDate);
    reviewCountQuery = reviewCountQuery.gte("created_at", options.startDate);
    adminAdjustQuery = adminAdjustQuery.gte("created_at", options.startDate);
    failedQuery = failedQuery.gte("created_at", options.startDate);
  }
  if (options?.endDate) {
    countQuery = countQuery.lte("created_at", options.endDate);
    depositQuery = depositQuery.lte("created_at", options.endDate);
    spendQuery = spendQuery.lte("created_at", options.endDate);
    reviewCountQuery = reviewCountQuery.lte("created_at", options.endDate);
    adminAdjustQuery = adminAdjustQuery.lte("created_at", options.endDate);
    failedQuery = failedQuery.lte("created_at", options.endDate);
  }

  const [countRes, depositRes, spendRes, reviewRes, adminRes, failedRes] = await Promise.all([
    countQuery,
    depositQuery,
    spendQuery,
    reviewCountQuery,
    adminAdjustQuery,
    failedQuery
  ]);

  if (countRes.error) {
    return {
      data: {
        totalTransactions: 0,
        totalCoinDeposited: 0,
        totalCoinSpent: 0,
        needsReviewCount: 0
      },
      error: countRes.error.message
    };
  }

  const totalCoinDeposited = (depositRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.coin_amount ?? 0),
    0
  );
  const totalCoinSpent = (spendRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.coin_amount ?? 0),
    0
  );

  const needsReviewCount =
    (reviewRes.count ?? 0) + (adminRes.count ?? 0) + (failedRes.count ?? 0);

  return {
    data: {
      totalTransactions: countRes.count ?? 0,
      totalCoinDeposited,
      totalCoinSpent,
      needsReviewCount
    },
    error: null
  };
}
