import {
  createRule,
  formatBlockingErrors,
  summarizeChecklist
} from "@/lib/publish/checklist-utils";
import {
  validateSwipeBeforePublish,
  type SwipePublishInput
} from "@/lib/publish/validate-swipe-before-publish";
import { assertLinkedContentIsPublic } from "@/lib/swipe/assert-swipe-ownership";
import type { PublishChecklistResult } from "@/types/publish-checklist";
import type { SwipeFormValues } from "@/types/swipe";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function validateSwipeBeforePublishWithLinks(
  swipe: SwipePublishInput
): Promise<PublishChecklistResult> {
  if (!swipe.storyId?.trim()) {
    return validateSwipeBeforePublish(swipe);
  }

  const publicCheck = await assertLinkedContentIsPublic(
    swipe.storyId.trim(),
    swipe.chapterId?.trim() || null
  );

  return validateSwipeBeforePublish({
    ...swipe,
    linkedContentPublic: publicCheck.ok
  });
}

export async function validateSwipeBeforePublishFromDb(
  supabase: SupabaseClient,
  swipeId: string,
  ownerProfileId: string
): Promise<PublishChecklistResult> {
  const { data, error } = await supabase
    .from("swipe_items")
    .select(
      "id, hook, body, cta, story_id, chapter_id, background_image_url, owner_id"
    )
    .eq("id", swipeId)
    .eq("owner_id", ownerProfileId)
    .maybeSingle();

  if (error || !data) {
    return summarizeChecklist([
      createRule({
        blocking: true,
        id: "swipe",
        label: "Không tìm thấy Swipe",
        message: "Không tìm thấy Swipe.",
        ok: false,
        targetType: "swipe"
      })
    ]);
  }

  return validateSwipeBeforePublishWithLinks({
    backgroundImageUrl: data.background_image_url,
    body: data.body,
    chapterId: data.chapter_id,
    cta: data.cta,
    hook: data.hook,
    storyId: data.story_id
  });
}

export async function assertSwipeCanPublish(
  supabase: SupabaseClient,
  swipeId: string,
  ownerProfileId: string,
  values?: Partial<SwipeFormValues>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = values
    ? await validateSwipeBeforePublishWithLinks(values)
    : await validateSwipeBeforePublishFromDb(supabase, swipeId, ownerProfileId);

  if (!result.ok) {
    return { error: formatBlockingErrors(result.rules), ok: false };
  }

  return { ok: true };
}
