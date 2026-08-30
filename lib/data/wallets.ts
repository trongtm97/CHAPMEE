import { createClient } from "@/lib/data/server";
import { createAdminClient } from "@/lib/data/admin";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type {
  CoinType,
  CreatorRevenueStatus,
  CreatorWallet,
  SpendRule,
  UserWallet
} from "@/types/wallet";
import type { TransactionRow, TransactionSource, TransactionType } from "@/types/transaction";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapUserWallet(row: Record<string, unknown>): UserWallet {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    paid_coin_balance: toNumber(row.paid_coin_balance),
    bonus_coin_balance: toNumber(row.bonus_coin_balance),
    locked_coin_balance: toNumber(row.locked_coin_balance),
    total_spent_coin: toNumber(row.total_spent_coin),
    total_received_coin: toNumber(row.total_received_coin),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapCreatorWallet(row: Record<string, unknown>): CreatorWallet {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    pending_revenue_vnd: toNumber(row.pending_revenue_vnd),
    available_revenue_vnd: toNumber(row.available_revenue_vnd),
    locked_revenue_vnd: toNumber(row.locked_revenue_vnd),
    total_earned_vnd: toNumber(row.total_earned_vnd),
    total_withdrawn_vnd: toNumber(row.total_withdrawn_vnd),
    currency: String(row.currency ?? "VND"),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function createFallbackUserWallet(userId: string): UserWallet {
  const now = new Date().toISOString();

  return {
    id: `fallback-user-wallet-${userId}`,
    user_id: userId,
    paid_coin_balance: 0,
    bonus_coin_balance: 0,
    locked_coin_balance: 0,
    total_spent_coin: 0,
    total_received_coin: 0,
    created_at: now,
    updated_at: now
  };
}

function createFallbackCreatorWallet(userId: string): CreatorWallet {
  const now = new Date().toISOString();

  return {
    id: `fallback-creator-wallet-${userId}`,
    user_id: userId,
    pending_revenue_vnd: 0,
    available_revenue_vnd: 0,
    locked_revenue_vnd: 0,
    total_earned_vnd: 0,
    total_withdrawn_vnd: 0,
    currency: "VND",
    created_at: now,
    updated_at: now
  };
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
    direction: row.direction as TransactionRow["direction"],
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
    status: row.status as TransactionRow["status"],
    source: row.source as TransactionSource,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export async function getOrCreateUserWalletRecord(userId: string) {
  const db = await createClient();
  const { data, error } = await db.rpc("ensure_user_wallet", {
    input_user_id: userId
  });

  if (!error && data) {
    return { data: mapUserWallet(data as Record<string, unknown>), error: null };
  }

  if (error && !isMissingSchemaError(error)) {
    return { data: null, error: error.message ?? "Could not load user wallet." };
  }

  const adminDb = createAdminClient();
  const existing = await adminDb
    .from("user_wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing.data) {
    return { data: mapUserWallet(existing.data as Record<string, unknown>), error: null };
  }

  if (existing.error && !isMissingSchemaError(existing.error)) {
    return {
      data: createFallbackUserWallet(userId),
      error: null
    };
  }

  const inserted = await adminDb
    .from("user_wallets")
    .insert({ user_id: userId })
    .select("*")
    .maybeSingle();

  if (inserted.data) {
    return { data: mapUserWallet(inserted.data as Record<string, unknown>), error: null };
  }

  return {
    data: createFallbackUserWallet(userId),
    error: null
  };
}

export async function getOrCreateCreatorWalletRecord(userId: string) {
  const db = await createClient();
  const { data, error } = await db.rpc("ensure_creator_wallet", {
    input_user_id: userId
  });

  if (!error && data) {
    return { data: mapCreatorWallet(data as Record<string, unknown>), error: null };
  }

  if (error && !isMissingSchemaError(error)) {
    return {
      data: null,
      error: error.message ?? "Could not load creator wallet."
    };
  }

  const adminDb = createAdminClient();
  const existing = await adminDb
    .from("creator_wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing.data) {
    return {
      data: mapCreatorWallet(existing.data as Record<string, unknown>),
      error: null
    };
  }

  if (existing.error && !isMissingSchemaError(existing.error)) {
    return {
      data: createFallbackCreatorWallet(userId),
      error: null
    };
  }

  const inserted = await adminDb
    .from("creator_wallets")
    .insert({ user_id: userId })
    .select("*")
    .maybeSingle();

  if (inserted.data) {
    return {
      data: mapCreatorWallet(inserted.data as Record<string, unknown>),
      error: null
    };
  }

  return {
    data: createFallbackCreatorWallet(userId),
    error: null
  };
}

export async function applyUserCoinLedgerRecord(input: {
  userId: string;
  transactionCode: string;
  type: TransactionType;
  source: TransactionSource;
  direction: "credit" | "debit";
  amount: number;
  coinType?: CoinType;
  spendRule?: SpendRule;
  status?: TransactionRow["status"];
  metadata?: Record<string, unknown>;
  creatorUserId?: string | null;
  storyId?: string | null;
  chapterId?: string | null;
}) {
  const db = await createClient();
  const { data, error } = await db.rpc("apply_user_coin_ledger", {
    input_user_id: input.userId,
    input_transaction_code: input.transactionCode,
    input_type: input.type,
    input_source: input.source,
    input_direction: input.direction,
    input_coin_amount: input.amount,
    input_coin_type: input.coinType ?? "paid",
    input_spend_rule: input.spendRule ?? "bonus_first",
    input_status: input.status ?? "completed",
    input_metadata: input.metadata ?? {},
    input_creator_user_id: input.creatorUserId ?? null,
    input_story_id: input.storyId ?? null,
    input_chapter_id: input.chapterId ?? null,
    input_currency: "VND"
  });

  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Could not apply wallet ledger update."
    };
  }

  return { data: mapTransaction(data as Record<string, unknown>), error: null };
}

export async function applyCreatorRevenueLedgerRecord(input: {
  creatorUserId: string;
  transactionCode: string;
  type: TransactionType;
  source: TransactionSource;
  amountVnd: number;
  revenueStatus?: CreatorRevenueStatus;
  status?: TransactionRow["status"];
  metadata?: Record<string, unknown>;
  userId?: string | null;
  storyId?: string | null;
  chapterId?: string | null;
}) {
  const db = await createClient();
  const { data, error } = await db.rpc("apply_creator_revenue_ledger", {
    input_creator_user_id: input.creatorUserId,
    input_transaction_code: input.transactionCode,
    input_type: input.type,
    input_source: input.source,
    input_amount_vnd: input.amountVnd,
    input_revenue_status: input.revenueStatus ?? "pending",
    input_status: input.status ?? "completed",
    input_metadata: input.metadata ?? {},
    input_user_id: input.userId ?? null,
    input_story_id: input.storyId ?? null,
    input_chapter_id: input.chapterId ?? null,
    input_currency: "VND"
  });

  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Could not credit creator revenue."
    };
  }

  return { data: mapTransaction(data as Record<string, unknown>), error: null };
}

export async function processCoinPurchaseCheckoutRecord(sessionId: string) {
  const db = createAdminClient();
  const { data, error } = await db.rpc("process_coin_purchase_checkout", {
    input_session_id: sessionId
  });

  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Could not process coin purchase checkout."
    };
  }

  const payload = data as { already_processed?: boolean; transaction_id?: string };
  return {
    data: {
      alreadyProcessed: Boolean(payload.already_processed),
      transactionId: payload.transaction_id ?? null
    },
    error: null
  };
}
