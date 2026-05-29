import { createClient } from "@/lib/supabase/server";
import type { ChapterMonetizationSetting } from "@/types/paid-chapter";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapSetting(row: Record<string, unknown>): ChapterMonetizationSetting {
  return {
    id: String(row.id),
    chapter_id: String(row.chapter_id),
    story_id: String(row.story_id),
    creator_user_id: String(row.creator_user_id),
    is_paid: Boolean(row.is_paid),
    coin_price: row.coin_price == null ? null : toNumber(row.coin_price),
    free_preview_enabled: Boolean(row.free_preview_enabled),
    free_preview_percent:
      row.free_preview_percent == null ? null : toNumber(row.free_preview_percent),
    free_preview_chars:
      row.free_preview_chars == null ? null : toNumber(row.free_preview_chars),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export async function getChapterMonetizationSetting(chapterId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chapter_monetization_settings")
    .select("*")
    .eq("chapter_id", chapterId)
    .maybeSingle();
  if (error || !data) return { data: null, error: error?.message ?? null };
  return { data: mapSetting(data as Record<string, unknown>), error: null };
}

export async function upsertChapterMonetizationSetting(input: {
  chapterId: string;
  storyId: string;
  creatorUserId: string;
  isPaid: boolean;
  coinPrice: number | null;
  freePreviewEnabled: boolean;
  freePreviewPercent: number | null;
  freePreviewChars: number | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chapter_monetization_settings")
    .upsert(
      {
        chapter_id: input.chapterId,
        story_id: input.storyId,
        creator_user_id: input.creatorUserId,
        is_paid: input.isPaid,
        coin_price: input.coinPrice,
        free_preview_enabled: input.freePreviewEnabled,
        free_preview_percent: input.freePreviewPercent,
        free_preview_chars: input.freePreviewChars
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
        "Could not update chapter monetization settings."
    };
  }

  return { data: mapSetting(data as Record<string, unknown>), error: null };
}
