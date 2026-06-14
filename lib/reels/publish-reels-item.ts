import type { DatabaseClient } from "@/lib/db/types";
import { triggerColdStartAfterReelPublish } from "@/lib/cold-start/hooks";
import { assertReelsCanPublish } from "@/lib/publish/validate-reels-before-publish-server";
import { saveReelsContentObject } from "@/lib/storage/reels-content-storage";
import type { ReelsFormValues } from "@/types/reels";

export async function publishReelsItem(
  db: DatabaseClient,
  reelId: string,
  ownerId: string,
  values: Partial<ReelsFormValues>
) {
  const canPublish = await assertReelsCanPublish(
    db,
    reelId,
    ownerId,
    values
  );

  if (!canPublish.ok) {
    return { error: canPublish.error, ok: false as const };
  }

  const storyId = values.storyId?.trim() ?? "";

  if (!storyId) {
    return { error: "Chọn truyện liên kết trước khi đăng.", ok: false as const };
  }

  const now = new Date().toISOString();

  // Persist canonical text to S3 before flipping status to published.
  try {
    const saved = await saveReelsContentObject({
      body: values.body?.trim() ?? null,
      cta: values.cta?.trim() || null,
      hook: values.hook?.trim() ?? null,
      reelId,
      title: values.title?.trim() || null
    });
    await db
      .from("reels_items")
      .update({
        body: null,
        body_preview: saved.bodyPreview,
        content_blob_format: saved.blobFormat,
        content_encoding: saved.encoding,
        content_hash: saved.hash,
        content_object_key: saved.objectKey,
        content_size_bytes: saved.sizeBytes,
        content_storage_type: "s3",
        content_updated_at: now,
        cta: null,
        hook: null,
        title: null
      })
      .eq("id", reelId)
      .eq("owner_id", ownerId);
  } catch (s3Error) {
    return {
      error:
        s3Error instanceof Error
          ? `Không lưu được Reels text lên S3: ${s3Error.message}`
          : "Không lưu được Reels text lên S3.",
      ok: false as const
    };
  }

  const { error } = await db
    .from("reels_items")
    .update({
      background_image_url: values.backgroundImageUrl?.trim() || null,
      chapter_id: values.chapterId?.trim() || null,
      cta_type: values.ctaType?.trim() || null,
      published_at: now,
      scheduled_at: null,
      status: "published",
      story_id: storyId,
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
