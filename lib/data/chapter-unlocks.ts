import { createClient } from "@/lib/data/server";
import type { ChapterUnlock } from "@/types/paid-chapter";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapUnlock(row: Record<string, unknown>): ChapterUnlock {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    chapter_id: String(row.chapter_id),
    story_id: String(row.story_id),
    creator_user_id: String(row.creator_user_id),
    coin_amount: toNumber(row.coin_amount),
    paid_coin_amount: toNumber(row.paid_coin_amount),
    bonus_coin_amount: toNumber(row.bonus_coin_amount),
    transaction_id: String(row.transaction_id),
    unlocked_at: String(row.unlocked_at),
    created_at: String(row.created_at)
  };
}

export async function getChapterUnlockByUser(
  userId: string,
  chapterId: string
) {
  const db = await createClient();
  const { data, error } = await db
    .from("chapter_unlocks")
    .select("*")
    .eq("user_id", userId)
    .eq("chapter_id", chapterId)
    .maybeSingle();

  if (error || !data) return { data: null, error: error?.message ?? null };
  return { data: mapUnlock(data as Record<string, unknown>), error: null };
}

export async function createChapterUnlock(input: {
  userId: string;
  chapterId: string;
  storyId: string;
  creatorUserId: string;
  coinAmount: number;
  paidCoinAmount: number;
  bonusCoinAmount: number;
  transactionId: string;
}) {
  const db = await createClient();
  const { data, error } = await db
    .from("chapter_unlocks")
    .insert({
      user_id: input.userId,
      chapter_id: input.chapterId,
      story_id: input.storyId,
      creator_user_id: input.creatorUserId,
      coin_amount: input.coinAmount,
      paid_coin_amount: input.paidCoinAmount,
      bonus_coin_amount: input.bonusCoinAmount,
      transaction_id: input.transactionId
    })
    .select("*")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not create unlock record." };
  }

  return { data: mapUnlock(data as Record<string, unknown>), error: null };
}

export async function listChapterUnlocksByUser(userId: string, limit = 30) {
  const db = await createClient();
  const { data, error } = await db
    .from("chapter_unlocks")
    .select(
      "id, user_id, chapter_id, story_id, creator_user_id, coin_amount, paid_coin_amount, bonus_coin_amount, transaction_id, unlocked_at, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: [] as ChapterUnlock[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapUnlock),
    error: null
  };
}
