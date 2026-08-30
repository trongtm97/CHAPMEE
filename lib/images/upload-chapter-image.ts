import { assertChapterImageUploadAccess } from "@/lib/images/assert-chapter-image-upload-access";
import {
  buildChapterImageObjectKeys,
  newChapterImageId,
  removeChapterImageObjects,
  uploadChapterImageVariant
} from "@/lib/images/chapter-image-storage";
import { assertChapterImageLimit } from "@/lib/images/count-chapter-images";
import { processChapterImage } from "@/lib/images/process-chapter-image";
import { buildChapterImageBlockToken } from "@/lib/editor/chapter-image-block";
import { CHAPTER_IMAGE_ERROR } from "@/lib/images/validate-chapter-image-upload";
import type { ChapterImageUploadResult } from "@/types/chapter-images";
import type { DatabaseClient } from "@/lib/db/types";

export async function uploadChapterImage(input: {
  db: DatabaseClient;
  storyId: string;
  episodeId?: string | null;
  draftId?: string | null;
  fileBuffer: Buffer;
  altText?: string | null;
  caption?: string | null;
  content?: string;
  originalFilename?: string;
}): Promise<ChapterImageUploadResult> {
  if (!input.episodeId && !input.draftId) {
    throw new Error(CHAPTER_IMAGE_ERROR.missingScope);
  }

  const { userId } = await assertChapterImageUploadAccess({
    draftId: input.draftId,
    episodeId: input.episodeId,
    storyId: input.storyId
  });

  const withinLimit = await assertChapterImageLimit(input.db, {
    content: input.content,
    draftId: input.draftId,
    episodeId: input.episodeId,
    storyId: input.storyId
  });

  if (!withinLimit) {
    throw new Error(CHAPTER_IMAGE_ERROR.limitReached);
  }

  const imageId = newChapterImageId();
  const { imageKey, thumbKey } = buildChapterImageObjectKeys(
    input.originalFilename ?? "chapter.webp"
  );

  try {
    const processed = await processChapterImage(input.fileBuffer);

    await Promise.all([
      uploadChapterImageVariant(input.db, imageKey, processed.image.buffer, {
        linkedEntityId: imageId,
        linkedField: "image"
      }),
      uploadChapterImageVariant(input.db, thumbKey, processed.thumb.buffer, {
        linkedEntityId: imageId,
        linkedField: "thumb"
      })
    ]);

    const { data: row, error } = await input.db
      .from("chapter_images")
      .insert({
        id: imageId,
        alt_text: input.altText?.trim() || null,
        caption: input.caption?.trim() || null,
        draft_id: input.draftId ?? null,
        episode_id: input.episodeId ?? null,
        file_size_bytes: processed.image.fileSizeBytes,
        height: processed.image.height,
        image_url: imageKey,
        story_id: input.storyId,
        thumb_url: thumbKey,
        uploader_id: userId,
        width: processed.image.width
      })
      .select(
        "id, image_url, thumb_url, alt_text, caption, width, height, file_size_bytes"
      )
      .single();

    if (error || !row) {
      throw new Error(error?.message ?? "Không thể lưu metadata ảnh chương.");
    }

    const block = {
      alt: row.alt_text ?? "",
      caption: row.caption ?? "",
      height: row.height ?? processed.image.height,
      id: row.id,
      mediaAssetId: row.id,
      src: imageKey,
      thumbSrc: thumbKey,
      width: row.width ?? processed.image.width
    };

    return {
      block,
      image: {
        altText: row.alt_text,
        caption: row.caption,
        fileSizeBytes: row.file_size_bytes ?? processed.image.fileSizeBytes,
        height: row.height ?? processed.image.height,
        id: row.id,
        imageUrl: imageKey,
        thumbUrl: thumbKey,
        width: row.width ?? processed.image.width
      }
    };
  } catch (error) {
    await removeChapterImageObjects(input.db, imageKey, thumbKey).catch(() => undefined);
    throw error;
  }
}

export function chapterImageBlockFromUpload(result: ChapterImageUploadResult) {
  return buildChapterImageBlockToken(result.block);
}

/** Gắn ảnh nháp vào chương sau khi tạo episode. */
export async function linkChapterImagesFromDraft(
  db: DatabaseClient,
  input: { draftId: string; episodeId: string; storyId: string }
) {
  const { error } = await db
    .from("chapter_images")
    .update({ draft_id: null, episode_id: input.episodeId })
    .eq("draft_id", input.draftId)
    .eq("story_id", input.storyId);

  if (error) {
    throw new Error(error.message);
  }
}
