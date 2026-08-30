import { createClient } from "@/lib/data/server";
import type { SupportTip, SupporterRankingItem } from "@/types/tip";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapTip(row: Record<string, unknown>): SupportTip {
  return {
    id: String(row.id),
    request_id: String(row.request_id),
    from_user_id: String(row.from_user_id),
    to_creator_user_id: String(row.to_creator_user_id),
    story_id: (row.story_id as string | null) ?? null,
    chapter_id: (row.chapter_id as string | null) ?? null,
    gift_id: (row.gift_id as string | null) ?? null,
    coin_amount: toNumber(row.coin_amount),
    paid_coin_amount: toNumber(row.paid_coin_amount),
    bonus_coin_amount: toNumber(row.bonus_coin_amount),
    gross_value_vnd:
      row.gross_value_vnd == null ? null : toNumber(row.gross_value_vnd),
    creator_net_vnd: toNumber(row.creator_net_vnd),
    platform_fee_vnd: toNumber(row.platform_fee_vnd),
    message: (row.message as string | null) ?? null,
    is_anonymous: Boolean(row.is_anonymous),
    status: row.status as SupportTip["status"],
    transaction_id: String(row.transaction_id),
    created_at: String(row.created_at)
  };
}

export async function getSupportTipByRequestId(requestId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("support_tips")
    .select("*")
    .eq("request_id", requestId)
    .maybeSingle();
  if (error || !data) return { data: null, error: error?.message ?? null };
  return { data: mapTip(data as Record<string, unknown>), error: null };
}

export async function createSupportTipRecord(input: {
  requestId: string;
  fromUserId: string;
  toCreatorUserId: string;
  storyId?: string | null;
  chapterId?: string | null;
  giftId?: string | null;
  coinAmount: number;
  paidCoinAmount: number;
  bonusCoinAmount: number;
  grossValueVnd?: number | null;
  creatorNetVnd: number;
  platformFeeVnd: number;
  message?: string | null;
  isAnonymous: boolean;
  transactionId: string;
}) {
  const db = await createClient();
  const { data, error } = await db
    .from("support_tips")
    .insert({
      request_id: input.requestId,
      from_user_id: input.fromUserId,
      to_creator_user_id: input.toCreatorUserId,
      story_id: input.storyId ?? null,
      chapter_id: input.chapterId ?? null,
      gift_id: input.giftId ?? null,
      coin_amount: input.coinAmount,
      paid_coin_amount: input.paidCoinAmount,
      bonus_coin_amount: input.bonusCoinAmount,
      gross_value_vnd: input.grossValueVnd ?? null,
      creator_net_vnd: input.creatorNetVnd,
      platform_fee_vnd: input.platformFeeVnd,
      message: input.message ?? null,
      is_anonymous: input.isAnonymous,
      status: "completed",
      transaction_id: input.transactionId
    })
    .select("*")
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not create support tip." };
  }
  return { data: mapTip(data as Record<string, unknown>), error: null };
}

export async function getRecentTipsForCreator(creatorUserId: string, limit = 10) {
  const db = await createClient();
  const { data, error } = await db
    .from("support_tips")
    .select("*")
    .eq("to_creator_user_id", creatorUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [] as SupportTip[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapTip),
    error: null
  };
}

async function resolveNames(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { name: string; avatar: string | null }>();
  const db = await createClient();
  const { data } = await db
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .in("id", userIds);
  return new Map(
    (data ?? []).map((row) => [
      row.id as string,
      {
        name: String((row.display_name as string | null) ?? (row.username as string | null) ?? "ChapMee reader"),
        avatar: (row.avatar_url as string | null) ?? null
      }
    ])
  );
}

export async function getTopSupportersByAuthor(
  creatorUserId: string,
  limit = 5
) {
  const db = await createClient();
  const { data, error } = await db
    .from("support_tips")
    .select("from_user_id, is_anonymous, coin_amount")
    .eq("to_creator_user_id", creatorUserId)
    .eq("status", "completed");
  if (error) return { data: [] as SupporterRankingItem[], error: error.message };

  const aggregate = new Map<string, { total: number; count: number; anonymous: boolean }>();
  for (const row of data ?? []) {
    const userId = String(row.from_user_id);
    const current = aggregate.get(userId) ?? { total: 0, count: 0, anonymous: false };
    aggregate.set(userId, {
      total: current.total + toNumber(row.coin_amount),
      count: current.count + 1,
      anonymous: current.anonymous || Boolean(row.is_anonymous)
    });
  }
  const sorted = [...aggregate.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit);
  const names = await resolveNames(sorted.map(([userId]) => userId));

  return {
    data: sorted.map(([userId, value]) => ({
      user_id: userId,
      display_name: value.anonymous
        ? "Người ủng hộ ẩn danh"
        : (names.get(userId)?.name ?? "ChapMee reader"),
      avatar_url: value.anonymous ? null : (names.get(userId)?.avatar ?? null),
      is_anonymous: value.anonymous,
      total_coin: value.total,
      tip_count: value.count
    })),
    error: null
  };
}

export async function getTopSupportersByStory(storyId: string, limit = 5) {
  const db = await createClient();
  const { data, error } = await db
    .from("support_tips")
    .select("from_user_id, is_anonymous, coin_amount")
    .eq("story_id", storyId)
    .eq("status", "completed");
  if (error) return { data: [] as SupporterRankingItem[], error: error.message };

  const aggregate = new Map<string, { total: number; count: number; anonymous: boolean }>();
  for (const row of data ?? []) {
    const userId = String(row.from_user_id);
    const current = aggregate.get(userId) ?? { total: 0, count: 0, anonymous: false };
    aggregate.set(userId, {
      total: current.total + toNumber(row.coin_amount),
      count: current.count + 1,
      anonymous: current.anonymous || Boolean(row.is_anonymous)
    });
  }
  const sorted = [...aggregate.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit);
  const names = await resolveNames(sorted.map(([userId]) => userId));

  return {
    data: sorted.map(([userId, value]) => ({
      user_id: userId,
      display_name: value.anonymous
        ? "Người ủng hộ ẩn danh"
        : (names.get(userId)?.name ?? "ChapMee reader"),
      avatar_url: value.anonymous ? null : (names.get(userId)?.avatar ?? null),
      is_anonymous: value.anonymous,
      total_coin: value.total,
      tip_count: value.count
    })),
    error: null
  };
}

export async function getTopSupportersApp(limit = 10) {
  const db = await createClient();
  const { data, error } = await db
    .from("support_tips")
    .select("from_user_id, is_anonymous, coin_amount")
    .eq("status", "completed");
  if (error) return { data: [] as SupporterRankingItem[], error: error.message };
  const aggregate = new Map<string, { total: number; count: number; anonymous: boolean }>();
  for (const row of data ?? []) {
    const userId = String(row.from_user_id);
    const current = aggregate.get(userId) ?? { total: 0, count: 0, anonymous: false };
    aggregate.set(userId, {
      total: current.total + toNumber(row.coin_amount),
      count: current.count + 1,
      anonymous: current.anonymous || Boolean(row.is_anonymous)
    });
  }
  const sorted = [...aggregate.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit);
  const names = await resolveNames(sorted.map(([userId]) => userId));
  return {
    data: sorted.map(([userId, value]) => ({
      user_id: userId,
      display_name: value.anonymous
        ? "Người ủng hộ ẩn danh"
        : (names.get(userId)?.name ?? "ChapMee reader"),
      avatar_url: value.anonymous ? null : (names.get(userId)?.avatar ?? null),
      is_anonymous: value.anonymous,
      total_coin: value.total,
      tip_count: value.count
    })),
    error: null
  };
}
