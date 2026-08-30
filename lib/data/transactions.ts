import { createClient } from "@/lib/data/server";
import type {
  TransactionDirection,
  TransactionRow,
  TransactionSource,
  TransactionStatus,
  TransactionType
} from "@/types/transaction";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapTransaction(row: Record<string, unknown>): TransactionRow {
  return {
    id: String(row.id),
    transaction_code: String(row.transaction_code),
    user_id: (row.user_id as string | null) ?? null,
    creator_user_id: (row.creator_user_id as string | null) ?? null,
    story_id: (row.story_id as string | null) ?? null,
    chapter_id: (row.chapter_id as string | null) ?? null,
    type: row.type as TransactionType,
    direction: row.direction as TransactionDirection,
    coin_amount: row.coin_amount == null ? null : toNumber(row.coin_amount),
    paid_coin_amount:
      row.paid_coin_amount == null ? null : toNumber(row.paid_coin_amount),
    bonus_coin_amount:
      row.bonus_coin_amount == null ? null : toNumber(row.bonus_coin_amount),
    money_amount_vnd:
      row.money_amount_vnd == null ? null : toNumber(row.money_amount_vnd),
    gross_amount_vnd:
      row.gross_amount_vnd == null ? null : toNumber(row.gross_amount_vnd),
    provider_fee_vnd:
      row.provider_fee_vnd == null ? null : toNumber(row.provider_fee_vnd),
    store_fee_vnd:
      row.store_fee_vnd == null ? null : toNumber(row.store_fee_vnd),
    net_amount_vnd: row.net_amount_vnd == null ? null : toNumber(row.net_amount_vnd),
    payment_channel: (row.payment_channel as string | null) ?? null,
    provider: (row.provider as string | null) ?? null,
    provider_reference: (row.provider_reference as string | null) ?? null,
    module_type: (row.module_type as string | null) ?? null,
    revenue_basis: (row.revenue_basis as "gross" | "net") ?? "net",
    fee_percent_applied:
      row.fee_percent_applied == null ? null : toNumber(row.fee_percent_applied),
    platform_fee_vnd:
      row.platform_fee_vnd == null ? null : toNumber(row.platform_fee_vnd),
    creator_percent:
      row.creator_percent == null ? null : toNumber(row.creator_percent),
    creator_gross_vnd:
      row.creator_gross_vnd == null ? null : toNumber(row.creator_gross_vnd),
    creator_net_vnd:
      row.creator_net_vnd == null ? null : toNumber(row.creator_net_vnd),
    platform_net_vnd:
      row.platform_net_vnd == null ? null : toNumber(row.platform_net_vnd),
    creator_withdrawable_vnd:
      row.creator_withdrawable_vnd == null ? null : toNumber(row.creator_withdrawable_vnd),
    creator_non_withdrawable_vnd:
      row.creator_non_withdrawable_vnd == null ? null : toNumber(row.creator_non_withdrawable_vnd),
    currency: String(row.currency ?? "VND"),
    status: row.status as TransactionStatus,
    source: row.source as TransactionSource,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export async function createTransaction(input: {
  transactionCode: string;
  type: TransactionType;
  direction: TransactionDirection;
  source: TransactionSource;
  status?: TransactionStatus;
  userId?: string | null;
  creatorUserId?: string | null;
  storyId?: string | null;
  chapterId?: string | null;
  coinAmount?: number | null;
  paidCoinAmount?: number | null;
  bonusCoinAmount?: number | null;
  moneyAmountVnd?: number | null;
  grossAmountVnd?: number | null;
  providerFeeVnd?: number | null;
  storeFeeVnd?: number | null;
  netAmountVnd?: number | null;
  paymentChannel?: string | null;
  provider?: string | null;
  providerReference?: string | null;
  moduleType?: string | null;
  revenueBasis?: "gross" | "net";
  feePercentApplied?: number | null;
  platformFeeVnd?: number | null;
  creatorPercent?: number | null;
  creatorGrossVnd?: number | null;
  creatorNetVnd?: number | null;
  platformNetVnd?: number | null;
  creatorWithdrawableVnd?: number | null;
  creatorNonWithdrawableVnd?: number | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await createClient();
  const { data, error } = await db
    .from("transactions")
    .insert({
      transaction_code: input.transactionCode,
      type: input.type,
      direction: input.direction,
      source: input.source,
      status: input.status ?? "pending",
      user_id: input.userId ?? null,
      creator_user_id: input.creatorUserId ?? null,
      story_id: input.storyId ?? null,
      chapter_id: input.chapterId ?? null,
      coin_amount: input.coinAmount ?? null,
      paid_coin_amount: input.paidCoinAmount ?? null,
      bonus_coin_amount: input.bonusCoinAmount ?? null,
      money_amount_vnd: input.moneyAmountVnd ?? null,
      gross_amount_vnd: input.grossAmountVnd ?? input.moneyAmountVnd ?? null,
      provider_fee_vnd: input.providerFeeVnd ?? null,
      store_fee_vnd: input.storeFeeVnd ?? null,
      net_amount_vnd: input.netAmountVnd ?? input.moneyAmountVnd ?? null,
      payment_channel: input.paymentChannel ?? null,
      provider: input.provider ?? null,
      provider_reference: input.providerReference ?? null,
      module_type: input.moduleType ?? null,
      revenue_basis: input.revenueBasis ?? "net",
      fee_percent_applied: input.feePercentApplied ?? 0,
      platform_fee_vnd: input.platformFeeVnd ?? null,
      creator_percent: input.creatorPercent ?? null,
      creator_gross_vnd: input.creatorGrossVnd ?? null,
      creator_net_vnd: input.creatorNetVnd ?? null,
      platform_net_vnd: input.platformNetVnd ?? null,
      creator_withdrawable_vnd: input.creatorWithdrawableVnd ?? null,
      creator_non_withdrawable_vnd: input.creatorNonWithdrawableVnd ?? null,
      metadata: input.metadata ?? {}
    })
    .select("*")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not create transaction." };
  }

  return { data: mapTransaction(data as Record<string, unknown>), error: null };
}

export async function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus
) {
  const db = await createClient();
  const { data, error } = await db
    .from("transactions")
    .update({ status })
    .eq("id", transactionId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Could not update transaction status."
    };
  }

  return { data: mapTransaction(data as Record<string, unknown>), error: null };
}

export async function getTransactionsForUser(userId: string, limit = 20) {
  const db = await createClient();
  const { data, error } = await db
    .from("transactions")
    .select(
      "id, transaction_code, type, direction, coin_amount, paid_coin_amount, bonus_coin_amount, money_amount_vnd, status, source, created_at, updated_at, user_id, creator_user_id, story_id, chapter_id, currency"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [] as TransactionRow[], error: error.message };
  }

  return {
    data: ((data ?? []) as Record<string, unknown>[]).map((row) =>
      mapTransaction({ ...row, metadata: {} })
    ),
    error: null
  };
}

export async function getTransactionsForAdmin(options?: {
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const db = await createClient();
  let query = db
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.type) {
    query = query.eq("type", options.type);
  }

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.startDate) {
    query = query.gte("created_at", options.startDate);
  }

  if (options?.endDate) {
    query = query.lte("created_at", options.endDate);
  }

  const { data, error } = await query;
  if (error) {
    return { data: [] as TransactionRow[], error: error.message };
  }

  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapTransaction),
    error: null
  };
}

export type AdminTransactionListOptions = {
  type?: string;
  types?: string[];
  status?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  riskOnly?: boolean;
  sort?: "newest" | "oldest" | "amount_high" | "amount_low" | "coin_high" | "coin_low";
  page?: number;
  pageSize?: number;
};

async function resolveStoryIdsForSearch(db: Awaited<ReturnType<typeof createClient>>, q: string) {
  const { data: stories } = await db
    .from("stories")
    .select("id")
    .or(`title.ilike.%${q}%,slug.ilike.%${q}%`)
    .limit(20);
  return (stories ?? []).map((row) => String(row.id));
}

async function resolveSpecialStatusIds(
  db: Awaited<ReturnType<typeof createClient>>,
  status: string
): Promise<string[] | null> {
  if (status === "needs_review") {
    const [{ data: riskRows }, { data: adminRows }, { data: failedRows }] = await Promise.all([
      db
        .from("risk_events")
        .select("transaction_id")
        .in("status", ["open", "reviewing"])
        .not("transaction_id", "is", null)
        .limit(1000),
      db
        .from("transactions")
        .select("id")
        .eq("type", "admin_coin_adjustment")
        .limit(1000),
      db
        .from("transactions")
        .select("id")
        .eq("status", "failed")
        .limit(1000)
    ]);
    const ids = new Set<string>();
    for (const row of riskRows ?? []) {
      if (row.transaction_id) ids.add(String(row.transaction_id));
    }
    for (const row of adminRows ?? []) ids.add(String(row.id));
    for (const row of failedRows ?? []) ids.add(String(row.id));
    return [...ids];
  }

  if (status === "chargeback") {
    const { data } = await db
      .from("chargebacks")
      .select("original_transaction_id")
      .limit(1000);
    const ids = [
      ...new Set(
        (data ?? [])
          .map((row) => row.original_transaction_id as string | null)
          .filter((id): id is string => Boolean(id))
      )
    ];
    return ids;
  }

  if (status === "partial_refund") {
    const { data } = await db.from("refunds").select("original_transaction_id").limit(1000);
    const ids = [
      ...new Set(
        (data ?? [])
          .map((row) => row.original_transaction_id as string | null)
          .filter((id): id is string => Boolean(id))
      )
    ];
    return ids;
  }

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySourceFilter(query: any, source: string) {
  switch (source) {
    case "sepay":
      return query.or("source.eq.sepay,provider.eq.sepay");
    case "apple_iap":
      return query.or("provider.eq.apple_iap,payment_channel.eq.apple_iap");
    case "google_play":
      return query.or("provider.eq.google_play,payment_channel.eq.google_play_billing");
    case "admin":
      return query.eq("source", "admin");
    case "system":
      return query.eq("source", "system");
    case "internal_wallet":
      return query.in("source", ["payment", "unlock", "tip", "gift", "vip", "bonus"]);
    default:
      return query;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySort(query: any, sort?: AdminTransactionListOptions["sort"]) {
  switch (sort) {
    case "oldest":
      return query.order("created_at", { ascending: true });
    case "amount_high":
      return query.order("money_amount_vnd", { ascending: false, nullsFirst: false });
    case "amount_low":
      return query.order("money_amount_vnd", { ascending: true, nullsFirst: false });
    case "coin_high":
      return query.order("coin_amount", { ascending: false, nullsFirst: false });
    case "coin_low":
      return query.order("coin_amount", { ascending: true, nullsFirst: false });
    case "newest":
    default:
      return query.order("created_at", { ascending: false });
  }
}

export async function getTransactionsForAdminPaginated(
  options: AdminTransactionListOptions
): Promise<{
  data: TransactionRow[];
  total: number;
  error: string | null;
}> {
  const db = await createClient();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let userIds: string[] = [];
  let storyIds: string[] = [];
  if (options.search?.trim()) {
    const q = options.search.trim();
    const [{ data: profiles }, foundStoryIds] = await Promise.all([
      db
        .from("profiles")
        .select("id")
        .or(`email.ilike.%${q}%,username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(20),
      resolveStoryIdsForSearch(db, q)
    ]);
    userIds = (profiles ?? []).map((p) => String(p.id));
    storyIds = foundStoryIds;
  }

  let query = db.from("transactions").select("*", { count: "exact" });
  query = applySort(query, options.sort);

  if (options.types?.includes("chargeback")) {
    const chargebackIds = await resolveSpecialStatusIds(db, "chargeback");
    if (!chargebackIds || chargebackIds.length === 0) {
      return { data: [], total: 0, error: null };
    }
    query = query.in("id", chargebackIds);
  } else if (options.types?.length) {
    query = query.in("type", options.types);
  } else if (options.type) {
    query = query.eq("type", options.type);
  }

  if (options.status && options.status !== "all") {
    const specialIds = await resolveSpecialStatusIds(db, options.status);
    if (specialIds) {
      if (specialIds.length === 0) {
        return { data: [], total: 0, error: null };
      }
      query = query.in("id", specialIds);
    } else {
      query = query.eq("status", options.status);
    }
  }

  if (options.source && options.source !== "all") {
    query = applySourceFilter(query, options.source);
  }

  if (options.startDate) query = query.gte("created_at", options.startDate);
  if (options.endDate) query = query.lte("created_at", options.endDate);

  if (options.search?.trim()) {
    const q = options.search.trim();
    const parts = [`transaction_code.ilike.%${q}%`];
    if (userIds.length > 0) {
      parts.push(`user_id.in.(${userIds.join(",")})`);
      parts.push(`creator_user_id.in.(${userIds.join(",")})`);
    }
    if (storyIds.length > 0) {
      parts.push(`story_id.in.(${storyIds.join(",")})`);
    }
    query = query.or(parts.join(","));
  }

  if (options.riskOnly) {
    const { data: riskRows } = await db
      .from("risk_events")
      .select("transaction_id")
      .in("status", ["open", "reviewing"])
      .not("transaction_id", "is", null)
      .limit(500);
    const ids = [
      ...new Set(
        (riskRows ?? [])
          .map((r) => r.transaction_id as string | null)
          .filter((id): id is string => Boolean(id))
      )
    ];
    if (ids.length === 0) {
      return { data: [], total: 0, error: null };
    }
    query = query.in("id", ids);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    return { data: [], total: 0, error: error.message };
  }

  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapTransaction),
    total: count ?? 0,
    error: null
  };
}

export async function getTransactionById(transactionId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .maybeSingle();
  if (error || !data) {
    return { data: null, error: error?.message ?? "Transaction not found." };
  }
  return { data: mapTransaction(data as Record<string, unknown>), error: null };
}
