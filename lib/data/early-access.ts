import { createClient } from "@/lib/data/server";
import type {
  ChapterEarlyAccessSetting,
  EarlyAccessUnlock
} from "@/types/early-access";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapSetting(row: Record<string, unknown>): ChapterEarlyAccessSetting {
  return {
    id: String(row.id),
    chapter_id: String(row.chapter_id),
    story_id: String(row.story_id),
    creator_user_id: String(row.creator_user_id),
    enabled: Boolean(row.enabled),
    coin_price: row.coin_price == null ? null : toNumber(row.coin_price),
    free_at: (row.free_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapUnlock(row: Record<string, unknown>): EarlyAccessUnlock {
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

export async function getChapterEarlyAccessSetting(chapterId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("chapter_early_access_settings")
    .select("*")
    .eq("chapter_id", chapterId)
    .maybeSingle();
  if (error || !data) return { data: null, error: error?.message ?? null };
  return { data: mapSetting(data as Record<string, unknown>), error: null };
}

export async function upsertChapterEarlyAccessSetting(input: {
  chapterId: string;
  storyId: string;
  creatorUserId: string;
  enabled: boolean;
  coinPrice: number | null;
  freeAt: string | null;
}) {
  const db = await createClient();
  const { data, error } = await db
    .from("chapter_early_access_settings")
    .upsert(
      {
        chapter_id: input.chapterId,
        story_id: input.storyId,
        creator_user_id: input.creatorUserId,
        enabled: input.enabled,
        coin_price: input.coinPrice,
        free_at: input.freeAt
      },
      { onConflict: "chapter_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    return {
      data: null,
      error:
        error?.message ??
        "Could not update chapter early access settings."
    };
  }
  return { data: mapSetting(data as Record<string, unknown>), error: null };
}

export async function getEarlyAccessUnlockByUser(userId: string, chapterId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("early_access_unlocks")
    .select("*")
    .eq("user_id", userId)
    .eq("chapter_id", chapterId)
    .maybeSingle();
  if (error || !data) return { data: null, error: error?.message ?? null };
  return { data: mapUnlock(data as Record<string, unknown>), error: null };
}

export async function createEarlyAccessUnlock(input: {
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
    .from("early_access_unlocks")
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
    return {
      data: null,
      error: error?.message ?? "Could not create early access unlock record."
    };
  }
  return { data: mapUnlock(data as Record<string, unknown>), error: null };
}
