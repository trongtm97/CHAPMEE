import { createClient } from "@/lib/supabase/server";
import type { StoryMonetizationSettings } from "@/types/story-monetization";

function mapRow(row: Record<string, unknown>): StoryMonetizationSettings {
  return {
    story_id: String(row.story_id),
    creator_user_id: String(row.creator_user_id),
    monetization_enabled: Boolean(row.monetization_enabled ?? true),
    full_access_enabled: Boolean(row.full_access_enabled),
    full_access_price_coin:
      row.full_access_price_coin == null ? null : Number(row.full_access_price_coin),
    full_access_includes_future_chapters: Boolean(
      row.full_access_includes_future_chapters ?? true
    ),
    full_access_note: (row.full_access_note as string | null) ?? null,
    auto_pricing_enabled: Boolean(row.auto_pricing_enabled),
    free_first_chapters_count: Number(row.free_first_chapters_count ?? 0),
    auto_paid_from_chapter:
      row.auto_paid_from_chapter == null ? null : Number(row.auto_paid_from_chapter),
    auto_price_coin: row.auto_price_coin == null ? null : Number(row.auto_price_coin),
    default_new_chapter_price_coin:
      row.default_new_chapter_price_coin == null
        ? null
        : Number(row.default_new_chapter_price_coin),
    updated_at: String(row.updated_at)
  };
}

export function defaultStoryMonetizationSettings(input: {
  storyId: string;
  creatorUserId: string;
}): StoryMonetizationSettings {
  return {
    story_id: input.storyId,
    creator_user_id: input.creatorUserId,
    monetization_enabled: true,
    full_access_enabled: false,
    full_access_price_coin: null,
    full_access_includes_future_chapters: true,
    full_access_note: null,
    auto_pricing_enabled: false,
    free_first_chapters_count: 0,
    auto_paid_from_chapter: null,
    auto_price_coin: null,
    default_new_chapter_price_coin: null,
    updated_at: new Date().toISOString()
  };
}

export async function getStoryMonetizationSettings(storyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("story_monetization_settings")
    .select("*")
    .eq("story_id", storyId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return { data: mapRow(data as Record<string, unknown>), error: null };
}

export async function upsertStoryMonetizationSettings(
  input: Partial<StoryMonetizationSettings> & {
    story_id: string;
    creator_user_id: string;
  }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("story_monetization_settings")
    .upsert(
      {
        story_id: input.story_id,
        creator_user_id: input.creator_user_id,
        monetization_enabled: input.monetization_enabled ?? true,
        full_access_enabled: input.full_access_enabled ?? false,
        full_access_price_coin: input.full_access_price_coin ?? null,
        full_access_includes_future_chapters:
          input.full_access_includes_future_chapters ?? true,
        full_access_note: input.full_access_note ?? null,
        auto_pricing_enabled: input.auto_pricing_enabled ?? false,
        free_first_chapters_count: input.free_first_chapters_count ?? 0,
        auto_paid_from_chapter: input.auto_paid_from_chapter ?? null,
        auto_price_coin: input.auto_price_coin ?? null,
        default_new_chapter_price_coin: input.default_new_chapter_price_coin ?? null
      },
      { onConflict: "story_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    const missingTable = error?.message?.includes("story_monetization_settings");
    return {
      data: null,
      error: missingTable
        ? "Cài đặt truyện chưa sẵn sàng. Chạy migration 127 trên Supabase."
        : error?.message ?? "Không lưu được cài đặt truyện."
    };
  }

  return { data: mapRow(data as Record<string, unknown>), error: null };
}

export async function getStoryFullAccessUnlock(userId: string, storyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("story_full_access_unlocks")
    .select("*")
    .eq("user_id", userId)
    .eq("story_id", storyId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return {
    data: {
      id: String(data.id),
      user_id: String(data.user_id),
      story_id: String(data.story_id),
      creator_user_id: String(data.creator_user_id),
      coin_amount: Number(data.coin_amount),
      price_coin_snapshot: Number(data.price_coin_snapshot),
      includes_future_chapters: Boolean(data.includes_future_chapters),
      transaction_id: (data.transaction_id as string | null) ?? null,
      status: data.status as "active" | "revoked",
      purchased_at: String(data.purchased_at),
      created_at: String(data.created_at)
    },
    error: null
  };
}

export async function createStoryFullAccessUnlock(input: {
  userId: string;
  storyId: string;
  creatorUserId: string;
  coinAmount: number;
  priceCoinSnapshot: number;
  includesFutureChapters: boolean;
  transactionId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("story_full_access_unlocks")
    .insert({
      user_id: input.userId,
      story_id: input.storyId,
      creator_user_id: input.creatorUserId,
      coin_amount: input.coinAmount,
      price_coin_snapshot: input.priceCoinSnapshot,
      includes_future_chapters: input.includesFutureChapters,
      transaction_id: input.transactionId,
      status: "active"
    })
    .select("*")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Không lưu được quyền trọn bộ." };
  }

  return { data, error: null };
}
