import { createClient } from "@/lib/data/server";
import type { RewardedAdSession, RewardedAdSessionStatus } from "@/types/rewarded-ad";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapRewardedAdSession(row: Record<string, unknown>): RewardedAdSession {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    provider: (row.provider as RewardedAdSession["provider"]) ?? "unknown",
    status: row.status as RewardedAdSessionStatus,
    reward_coin_amount: toNumber(row.reward_coin_amount),
    watched_seconds:
      row.watched_seconds == null ? null : toNumber(row.watched_seconds),
    provider_reference: (row.provider_reference as string | null) ?? null,
    transaction_id: (row.transaction_id as string | null) ?? null,
    created_at: String(row.created_at),
    completed_at: (row.completed_at as string | null) ?? null,
    rewarded_at: (row.rewarded_at as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null
  };
}

const SELECT_FIELDS =
  "id, user_id, provider, status, reward_coin_amount, watched_seconds, provider_reference, transaction_id, created_at, completed_at, rewarded_at, metadata";

export async function createRewardedAdSession(input: {
  userId: string;
  provider: RewardedAdSession["provider"];
  rewardCoinAmount: number;
  metadata?: Record<string, unknown>;
}) {
  const db = await createClient();
  const { data, error } = await db
    .from("rewarded_ad_sessions")
    .insert({
      user_id: input.userId,
      provider: input.provider,
      status: "started",
      reward_coin_amount: input.rewardCoinAmount,
      metadata: input.metadata ?? {}
    })
    .select(SELECT_FIELDS)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not create rewarded ad session." };
  }

  return { data: mapRewardedAdSession(data as Record<string, unknown>), error: null };
}

export async function getRewardedAdSessionById(sessionId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("rewarded_ad_sessions")
    .select(SELECT_FIELDS)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  if (!data) {
    return { data: null, error: "Rewarded ad session not found." };
  }

  return { data: mapRewardedAdSession(data as Record<string, unknown>), error: null };
}

export async function countRewardedSessionsTodayByUser(
  userId: string,
  statuses: RewardedAdSessionStatus[]
) {
  const db = await createClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { count, error } = await db
    .from("rewarded_ad_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", statuses)
    .gte("created_at", start.toISOString());

  if (error) {
    return { data: 0, error: error.message };
  }

  return { data: count ?? 0, error: null };
}

export async function getLatestRewardedAdSessionForUser(userId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("rewarded_ad_sessions")
    .select(SELECT_FIELDS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  if (!data) {
    return { data: null, error: null };
  }

  return { data: mapRewardedAdSession(data as Record<string, unknown>), error: null };
}

export async function updateRewardedAdSessionStatus(input: {
  sessionId: string;
  userId: string;
  status: RewardedAdSessionStatus;
  watchedSeconds?: number | null;
  transactionId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const patch: Record<string, unknown> = {
    status: input.status
  };
  if (typeof input.watchedSeconds === "number") {
    patch.watched_seconds = input.watchedSeconds;
  }
  if (input.transactionId) {
    patch.transaction_id = input.transactionId;
  }
  if (input.metadata) {
    patch.metadata = input.metadata;
  }
  if (input.status === "completed") {
    patch.completed_at = new Date().toISOString();
  }
  if (input.status === "rewarded") {
    patch.rewarded_at = new Date().toISOString();
    patch.completed_at = patch.completed_at ?? new Date().toISOString();
  }

  const db = await createClient();
  const { data, error } = await db
    .from("rewarded_ad_sessions")
    .update(patch)
    .eq("id", input.sessionId)
    .eq("user_id", input.userId)
    .select(SELECT_FIELDS)
    .maybeSingle();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not update rewarded ad session." };
  }

  return { data: mapRewardedAdSession(data as Record<string, unknown>), error: null };
}
