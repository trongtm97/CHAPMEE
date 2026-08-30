import { createClient } from "@/lib/data/server";
import type {
  CreatorWalletLedgerRow,
  CreatorWalletLedgerType,
  FinanceSecurityEventType,
  FinanceSecurityLogRow,
  LedgerDirection
} from "@/types/finance";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapLedger(row: Record<string, unknown>): CreatorWalletLedgerRow {
  return {
    id: String(row.id),
    creator_user_id: String(row.creator_user_id),
    type: row.type as CreatorWalletLedgerType,
    amount_vnd: toNumber(row.amount_vnd),
    amount_coin: row.amount_coin == null ? null : toNumber(row.amount_coin),
    direction: row.direction as LedgerDirection,
    source_type: (row.source_type as string | null) ?? null,
    source_id: (row.source_id as string | null) ?? null,
    story_id: (row.story_id as string | null) ?? null,
    chapter_id: (row.chapter_id as string | null) ?? null,
    withdrawal_request_id: (row.withdrawal_request_id as string | null) ?? null,
    transaction_id: (row.transaction_id as string | null) ?? null,
    earning_transaction_id: (row.earning_transaction_id as string | null) ?? null,
    balance_type: (row.balance_type as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: String(row.created_at)
  };
}

function mapSecurityLog(row: Record<string, unknown>): FinanceSecurityLogRow {
  return {
    id: String(row.id),
    creator_user_id: String(row.creator_user_id),
    event_type: row.event_type as FinanceSecurityEventType,
    ip_address: (row.ip_address as string | null) ?? null,
    user_agent: (row.user_agent as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: String(row.created_at)
  };
}

export async function insertCreatorWalletLedgerEntry(input: {
  creatorUserId: string;
  type: CreatorWalletLedgerType;
  amountVnd: number;
  direction: LedgerDirection;
  amountCoin?: number | null;
  sourceType?: string | null;
  sourceId?: string | null;
  storyId?: string | null;
  chapterId?: string | null;
  withdrawalRequestId?: string | null;
  transactionId?: string | null;
  earningTransactionId?: string | null;
  balanceType?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await createClient();
  const { data, error } = await db
    .from("creator_wallet_ledger")
    .insert({
      creator_user_id: input.creatorUserId,
      type: input.type,
      amount_vnd: input.amountVnd,
      amount_coin: input.amountCoin ?? null,
      direction: input.direction,
      source_type: input.sourceType ?? null,
      source_id: input.sourceId ?? null,
      story_id: input.storyId ?? null,
      chapter_id: input.chapterId ?? null,
      withdrawal_request_id: input.withdrawalRequestId ?? null,
      transaction_id: input.transactionId ?? null,
      earning_transaction_id: input.earningTransactionId ?? null,
      balance_type: input.balanceType ?? "available",
      description: input.description ?? null,
      metadata: input.metadata ?? {}
    })
    .select("*")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Không thể ghi sổ cái." };
  }

  return { data: mapLedger(data as Record<string, unknown>), error: null };
}

export async function listCreatorWalletLedger(
  creatorUserId: string,
  limit = 100
) {
  const db = await createClient();
  const { data, error } = await db
    .from("creator_wallet_ledger")
    .select("*")
    .eq("creator_user_id", creatorUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data: (data ?? []).map((row) => mapLedger(row as Record<string, unknown>)),
    error: null
  };
}

export async function getCreatorWithdrawalSecurity(creatorUserId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("creator_withdrawal_security")
    .select("*")
    .eq("creator_user_id", creatorUserId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return {
    data: {
      creator_user_id: String(data.creator_user_id),
      pin_hash: (data.pin_hash as string | null) ?? null,
      pin_set_at: (data.pin_set_at as string | null) ?? null,
      failed_attempts: Number(data.failed_attempts ?? 0),
      locked_until: (data.locked_until as string | null) ?? null,
      updated_at: String(data.updated_at)
    },
    error: null
  };
}

export async function upsertCreatorWithdrawalSecurity(input: {
  creatorUserId: string;
  pinHash?: string | null;
  pinSetAt?: string | null;
  failedAttempts?: number;
  lockedUntil?: string | null;
}) {
  const db = await createClient();
  const payload: Record<string, unknown> = {
    creator_user_id: input.creatorUserId,
    updated_at: new Date().toISOString()
  };

  if (input.pinHash !== undefined) payload.pin_hash = input.pinHash;
  if (input.pinSetAt !== undefined) payload.pin_set_at = input.pinSetAt;
  if (input.failedAttempts !== undefined) payload.failed_attempts = input.failedAttempts;
  if (input.lockedUntil !== undefined) payload.locked_until = input.lockedUntil;

  const { data, error } = await db
    .from("creator_withdrawal_security")
    .upsert(payload, { onConflict: "creator_user_id" })
    .select("*")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Không thể cập nhật bảo mật rút tiền." };
  }

  return { data, error: null };
}

export async function insertFinanceSecurityLog(input: {
  creatorUserId: string;
  eventType: FinanceSecurityEventType;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await createClient();
  const { error } = await db.from("creator_finance_security_logs").insert({
    creator_user_id: input.creatorUserId,
    event_type: input.eventType,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    metadata: input.metadata ?? {}
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

export async function listFinanceSecurityLogs(creatorUserId: string, limit = 50) {
  const db = await createClient();
  const { data, error } = await db
    .from("creator_finance_security_logs")
    .select("*")
    .eq("creator_user_id", creatorUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data: (data ?? []).map((row) => mapSecurityLog(row as Record<string, unknown>)),
    error: null
  };
}
