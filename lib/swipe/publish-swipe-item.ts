import type { SupabaseClient } from "@supabase/supabase-js";
import { assertSwipeCanPublish } from "@/lib/publish/validate-swipe-before-publish-server";
import type { SwipeFormValues } from "@/types/swipe";

export async function publishSwipeItem(
  supabase: SupabaseClient,
  swipeId: string,
  ownerId: string,
  values: Partial<SwipeFormValues>
) {
  const canPublish = await assertSwipeCanPublish(
    supabase,
    swipeId,
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
    .from("swipe_items")
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
    .eq("id", swipeId)
    .eq("owner_id", ownerId);

  if (error) {
    return { error: error.message, ok: false as const };
  }

  return { ok: true as const };
}
