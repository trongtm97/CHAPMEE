import { createClient } from "@/lib/data/server";
import type { FinanceExportFilters, FinanceExportType } from "@/types/finance-export";

export async function getFinanceExportRows(
  exportType: FinanceExportType,
  filters: FinanceExportFilters
) {
  const db = await createClient();

  if (
    exportType === "transactions" ||
    exportType === "coin_purchases" ||
    exportType === "creator_revenue" ||
    exportType === "supporter_transactions" ||
    exportType === "sponsored_campaign_revenue"
  ) {
    let query = db
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to) query = query.lte("created_at", filters.to);
    if (filters.type) query = query.eq("type", filters.type);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.userId) query = query.eq("user_id", filters.userId);
    if (filters.creatorUserId) query = query.eq("creator_user_id", filters.creatorUserId);
    if (filters.source) query = query.eq("source", filters.source);
    if (filters.currency) query = query.eq("currency", filters.currency);

    if (exportType === "coin_purchases") query = query.eq("type", "coin_purchase");
    if (exportType === "creator_revenue") query = query.eq("type", "creator_revenue_share");
    if (exportType === "supporter_transactions") query = query.in("type", ["author_tip", "virtual_gift"]);
    if (exportType === "sponsored_campaign_revenue") {
      query = query
        .eq("type", "platform_fee")
        .contains("metadata", { revenue_type: "sponsored_campaign_revenue" });
    }

    const { data, error } = await query;
    if (error) return { rows: [], error: error.message };
    return { rows: data ?? [], error: null };
  }

  if (exportType === "payouts") {
    let query = db
      .from("payout_requests")
      .select("*, transactions(transaction_code)")
      .order("requested_at", { ascending: false })
      .limit(5000);
    if (filters.from) query = query.gte("requested_at", filters.from);
    if (filters.to) query = query.lte("requested_at", filters.to);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.creatorUserId) query = query.eq("creator_user_id", filters.creatorUserId);
    const { data, error } = await query;
    if (error) return { rows: [], error: error.message };
    return { rows: data ?? [], error: null };
  }

  if (exportType === "refunds") {
    let query = db
      .from("refunds")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to) query = query.lte("created_at", filters.to);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.userId) query = query.eq("user_id", filters.userId);
    const { data, error } = await query;
    if (error) return { rows: [], error: error.message };
    return { rows: data ?? [], error: null };
  }

  if (exportType === "chargebacks") {
    let query = db
      .from("chargebacks")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(5000);
    if (filters.from) query = query.gte("received_at", filters.from);
    if (filters.to) query = query.lte("received_at", filters.to);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.userId) query = query.eq("user_id", filters.userId);
    const { data, error } = await query;
    if (error) return { rows: [], error: error.message };
    return { rows: data ?? [], error: null };
  }

  if (exportType === "vip_subscriptions") {
    let query = db
      .from("user_subscriptions")
      .select("*, transactions(transaction_code)")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to) query = query.lte("created_at", filters.to);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.userId) query = query.eq("user_id", filters.userId);
    const { data, error } = await query;
    if (error) return { rows: [], error: error.message };
    return { rows: data ?? [], error: null };
  }

  if (exportType === "fan_club_memberships") {
    let query = db
      .from("fan_club_memberships")
      .select("*, transactions(transaction_code)")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to) query = query.lte("created_at", filters.to);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.userId) query = query.eq("user_id", filters.userId);
    if (filters.creatorUserId) query = query.eq("creator_user_id", filters.creatorUserId);
    const { data, error } = await query;
    if (error) return { rows: [], error: error.message };
    return { rows: data ?? [], error: null };
  }

  return { rows: [], error: "Unsupported export type." };
}

export async function getCreatorStatementRows(input: {
  creatorUserId: string;
  from?: string;
  to?: string;
}) {
  const db = await createClient();
  let txQuery = db
    .from("transactions")
    .select("*")
    .eq("creator_user_id", input.creatorUserId)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (input.from) txQuery = txQuery.gte("created_at", input.from);
  if (input.to) txQuery = txQuery.lte("created_at", input.to);
  const [transactions, payoutRequests, wallet] = await Promise.all([
    txQuery,
    db
      .from("payout_requests")
      .select("*")
      .eq("creator_user_id", input.creatorUserId)
      .order("requested_at", { ascending: false })
      .limit(2000),
    db
      .from("creator_wallets")
      .select("pending_revenue_vnd, available_revenue_vnd, locked_revenue_vnd")
      .eq("user_id", input.creatorUserId)
      .maybeSingle()
  ]);
  return {
    transactions: transactions.data ?? [],
    payouts: payoutRequests.data ?? [],
    wallet: wallet.data ?? null,
    error: transactions.error?.message ?? payoutRequests.error?.message ?? wallet.error?.message ?? null
  };
}
