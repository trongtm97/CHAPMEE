import {
  createRule,
  formatBlockingErrors,
  summarizeChecklist
} from "@/lib/publish/checklist-utils";
import {
  validateReelsBeforePublish,
  type ReelsPublishInput
} from "@/lib/publish/validate-reels-before-publish";
import { assertLinkedContentIsPublic } from "@/lib/reels/assert-reels-ownership";
import type { PublishChecklistResult } from "@/types/publish-checklist";
import type { ReelsFormValues } from "@/types/reels";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function validateReelsBeforePublishWithLinks(
  reelsInput: ReelsPublishInput
): Promise<PublishChecklistResult> {
  if (!reelsInput.storyId?.trim()) {
    return validateReelsBeforePublish(reelsInput);
  }

  const publicCheck = await assertLinkedContentIsPublic(
    reelsInput.storyId.trim(),
    reelsInput.chapterId?.trim() || null
  );

  return validateReelsBeforePublish({
    ...reelsInput,
    linkedContentPublic: publicCheck.ok
  });
}

export async function validateReelsBeforePublishFromDb(
  supabase: SupabaseClient,
  reelId: string,
  ownerProfileId: string
): Promise<PublishChecklistResult> {
  const { data, error } = await supabase
    .from("reels_items")
    .select(
      "id, hook, body, cta, story_id, chapter_id, background_image_url, owner_id"
    )
    .eq("id", reelId)
    .eq("owner_id", ownerProfileId)
    .maybeSingle();

  if (error || !data) {
    return summarizeChecklist([
      createRule({
        blocking: true,
        id: "reels",
        label: "Không tìm thấy Reels",
        message: "Không tìm thấy Reels.",
        ok: false,
        targetType: "reels"
      })
    ]);
  }

  return validateReelsBeforePublishWithLinks({
    backgroundImageUrl: data.background_image_url,
    body: data.body,
    chapterId: data.chapter_id,
    cta: data.cta,
    hook: data.hook,
    storyId: data.story_id
  });
}

export async function assertReelsCanPublish(
  supabase: SupabaseClient,
  reelId: string,
  ownerProfileId: string,
  values?: Partial<ReelsFormValues>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = values
    ? await validateReelsBeforePublishWithLinks(values)
    : await validateReelsBeforePublishFromDb(supabase, reelId, ownerProfileId);

  if (!result.ok) {
    return { error: formatBlockingErrors(result.rules), ok: false };
  }

  return { ok: true };
}
