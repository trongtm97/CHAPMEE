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
import { loadReelsContentObject } from "@/lib/storage/reels-content-storage";
import type { PublishChecklistResult } from "@/types/publish-checklist";
import type { ReelsFormValues } from "@/types/reels";
import type { DatabaseClient } from "@/lib/db/types";

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
  db: DatabaseClient,
  reelId: string,
  ownerProfileId: string
): Promise<PublishChecklistResult> {
  const { data, error } = await db
    .from("reels_items")
    .select(
      "id, hook, body, cta, story_id, chapter_id, background_image_url, owner_id, content_storage_type, content_object_key, content_hash, body_preview"
    )
    .eq("id", reelId)
    .eq("owner_id", ownerProfileId)
    .maybeSingle();

  if (error || !data) {
    return summarizeChecklist([
      createRule({
        blocking: true,
        id: "reels",
        label: "Không tìm th?y Reels",
        message: "Không tìm th?y Reels.",
        ok: false,
        targetType: "reels"
      })
    ]);
  }

  // For S3-stored reels, fetch the canonical text before validating.
  let hook = data.hook;
  let body = data.body;
  let cta = data.cta;
  if (
    data.content_storage_type === "s3" &&
    data.content_object_key
  ) {
    try {
      const loaded = await loadReelsContentObject({
        expectedHash: data.content_hash ?? undefined,
        objectKey: data.content_object_key
      });
      hook = loaded.envelope.hook;
      body = loaded.envelope.body;
      cta = loaded.envelope.cta;
    } catch {
      // Fall back to preview if S3 read fails.
      body = data.body_preview ?? body;
    }
  }

  return validateReelsBeforePublishWithLinks({
    backgroundImageUrl: data.background_image_url,
    body,
    chapterId: data.chapter_id,
    cta,
    hook,
    storyId: data.story_id
  });
}

export async function assertReelsCanPublish(
  db: DatabaseClient,
  reelId: string,
  ownerProfileId: string,
  values?: Partial<ReelsFormValues>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = values
    ? await validateReelsBeforePublishWithLinks(values)
    : await validateReelsBeforePublishFromDb(db, reelId, ownerProfileId);

  if (!result.ok) {
    return { error: formatBlockingErrors(result.rules), ok: false };
  }

  return { ok: true };
}
