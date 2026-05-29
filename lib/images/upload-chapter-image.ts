import { randomUUID } from "crypto";
import { assertChapterImageUploadAccess } from "@/lib/images/assert-chapter-image-upload-access";
import {
  getChapterImageStoragePrefix,
  getChapterImageStoragePath,
  removeChapterImageStorageFolder,
  uploadChapterImageVariant
} from "@/lib/images/chapter-image-storage";
import { assertChapterImageLimit } from "@/lib/images/count-chapter-images";
import { processChapterImage } from "@/lib/images/process-chapter-image";
import { buildChapterImageBlockToken } from "@/lib/editor/chapter-image-block";
import { CHAPTER_IMAGE_ERROR } from "@/lib/images/validate-chapter-image-upload";
import type { ChapterImageUploadResult } from "@/types/chapter-images";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function uploadChapterImage(input: {
  supabase: SupabaseClient;
  storyId: string;
  episodeId?: string | null;
  draftId?: string | null;
  fileBuffer: Buffer;
  altText?: string | null;
  caption?: string | null;
  content?: string;
}): Promise<ChapterImageUploadResult> {
  if (!input.episodeId && !input.draftId) {
    throw new Error(CHAPTER_IMAGE_ERROR.missingScope);
  }

  const { userId } = await assertChapterImageUploadAccess({
    draftId: input.draftId,
    episodeId: input.episodeId,
    storyId: input.storyId
  });

  const withinLimit = await assertChapterImageLimit(input.supabase, {
    content: input.content,
    draftId: input.draftId,
    episodeId: input.episodeId,
    storyId: input.storyId
  });

  if (!withinLimit) {
    throw new Error(CHAPTER_IMAGE_ERROR.limitReached);
  }

  const imageId = randomUUID();
  const prefix = getChapterImageStoragePrefix({
    draftId: input.draftId,
    episodeId: input.episodeId,
    imageId,
    storyId: input.storyId
  });

  try {
    const processed = await processChapterImage(input.fileBuffer);
    const imagePath = getChapterImageStoragePath(prefix, "image");
    const thumbPath = getChapterImageStoragePath(prefix, "thumb");

    const [imageUrl, thumbUrl] = await Promise.all([
      uploadChapterImageVariant(input.supabase, imagePath, processed.image.buffer),
      uploadChapterImageVariant(input.supabase, thumbPath, processed.thumb.buffer)
    ]);

    const { data: row, error } = await input.supabase
      .from("chapter_images")
      .insert({
        alt_text: input.altText?.trim() || null,
        caption: input.caption?.trim() || null,
        draft_id: input.draftId ?? null,
        episode_id: input.episodeId ?? null,
        file_size_bytes: processed.image.fileSizeBytes,
        height: processed.image.height,
        image_url: imageUrl,
        story_id: input.storyId,
        thumb_url: thumbUrl,
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
      src: row.image_url,
      thumbSrc: row.thumb_url ?? row.image_url,
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
        imageUrl: row.image_url,
        thumbUrl: row.thumb_url,
        width: row.width ?? processed.image.width
      }
    };
  } catch (error) {
    await removeChapterImageStorageFolder(input.supabase, prefix).catch(() => undefined);
    throw error;
  }
}

export function chapterImageBlockFromUpload(result: ChapterImageUploadResult) {
  return buildChapterImageBlockToken(result.block);
}

/** Gắn ảnh nháp vào chương sau khi tạo episode. */
export async function linkChapterImagesFromDraft(
  supabase: SupabaseClient,
  input: { draftId: string; episodeId: string; storyId: string }
) {
  const { error } = await supabase
    .from("chapter_images")
    .update({ draft_id: null, episode_id: input.episodeId })
    .eq("draft_id", input.draftId)
    .eq("story_id", input.storyId);

  if (error) {
    throw new Error(error.message);
  }
}
