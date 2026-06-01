import type { SupabaseClient } from "@supabase/supabase-js";
import { triggerColdStartAfterReelPublish } from "@/lib/cold-start/hooks";
import { assertReelsCanPublish } from "@/lib/publish/validate-reels-before-publish-server";
import type { ReelsFormValues } from "@/types/reels";

export async function publishReelsItem(
  supabase: SupabaseClient,
  reelId: string,
  ownerId: string,
  values: Partial<ReelsFormValues>
) {
  const canPublish = await assertReelsCanPublish(
    supabase,
    reelId,
    ownerId,
    values
  );

  if (!canPublish.ok) {
    return { error: canPublish.error, ok: false as const };
  }

  const hook = values.hook?.trim() ?? "";
  const body = values.body?.trim() ?? "";
  const storyId = values.storyId?.trim() ?? "";

  if (!storyId) {
    return { error: "Chọn truyện liên kết trước khi đăng.", ok: false as const };
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("reels_items")
    .update({
      background_image_url: values.backgroundImageUrl?.trim() || null,
      body,
      chapter_id: values.chapterId?.trim() || null,
      cta: values.cta?.trim() || null,
      cta_type: values.ctaType?.trim() || null,
      hook,
      published_at: now,
      scheduled_at: null,
      status: "published",
      story_id: storyId,
      title: values.title?.trim() || null,
      updated_at: now
    })
    .eq("id", reelId)
    .eq("owner_id", ownerId);

  if (error) {
    return { error: error.message, ok: false as const };
  }

  void triggerColdStartAfterReelPublish(reelId);

  return { ok: true as const };
}
