import type { FocalPoint } from "@/lib/images/crop-with-focal-point";
import { resolveStoredMediaUrl } from "@/lib/media/media-url";
import { generateStoryImageVariants } from "@/lib/images/generate-story-image-variants";
import { getCurrentStoryImage, STORY_IMAGE_SELECT_COLUMNS } from "@/lib/images/get-current-story-image";
import { mapStoryImageRow } from "@/lib/images/map-story-image";
import { uploadStoryImageVariantsOnly } from "@/lib/images/upload-story-image-variants";
import type { StoryImage, StoryImageRow } from "@/types/story-images";
import type { DatabaseClient } from "@/lib/db/types";

export type RegenerateStoryImageVariantsInput = {
  db: DatabaseClient;
  storyId: string;
  imageId?: string;
  focal: FocalPoint;
};

export type RegenerateStoryImageVariantsResult = {
  image: StoryImage;
  coverUrl: string;
};

async function fetchOriginalBuffer(originalUrl: string) {
  const fetchUrl = resolveStoredMediaUrl(originalUrl) ?? originalUrl;
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    throw new Error("Không thể tải ảnh gốc để tạo lại biến thể.");
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function regenerateStoryImageVariants(
  input: RegenerateStoryImageVariantsInput
): Promise<RegenerateStoryImageVariantsResult> {
  const { db, storyId, focal } = input;

  let imageId = input.imageId;
  let row: StoryImageRow | null = null;

  if (imageId) {
    const { data, error } = await db
      .from("story_images")
      .select(STORY_IMAGE_SELECT_COLUMNS)
      .eq("id", imageId)
      .eq("story_id", storyId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    row = data as StoryImageRow | null;
  } else {
    const current = await getCurrentStoryImage(db, storyId);
    if (current.error) {
      throw new Error(current.error);
    }
    if (!current.image) {
      throw new Error("Truyện chưa có ảnh bìa để chỉnh lại.");
    }
    imageId = current.image.id;
    row = {
      id: current.image.id,
      story_id: current.image.storyId,
      original_url: current.image.originalUrl,
      portrait_url: current.image.portraitUrl,
      landscape_url: current.image.landscapeUrl,
      square_url: current.image.squareUrl,
      thumb_url: current.image.thumbUrl,
      blur_url: current.image.blurUrl,
      focal_x: current.image.focalX,
      focal_y: current.image.focalY,
      original_width: current.image.originalWidth,
      original_height: current.image.originalHeight,
      original_file_size_bytes: current.image.originalFileSizeBytes,
      processed_file_size_bytes: current.image.processedFileSizeBytes,
      mime_type: current.image.mimeType,
      storage_bucket: current.image.storageBucket,
      is_current: current.image.isCurrent,
      created_at: current.image.createdAt,
      updated_at: current.image.updatedAt
    };
  }

  if (!row?.original_url || !imageId) {
    throw new Error("Không tìm thấy ảnh gốc.");
  }

  const width = row.original_width ?? 0;
  const height = row.original_height ?? 0;

  if (width < 1 || height < 1) {
    throw new Error("Metadata ảnh gốc không hợp lệ.");
  }

  const originalBuffer = await fetchOriginalBuffer(row.original_url);

  const { variants, totalProcessedBytes } = await generateStoryImageVariants(
    originalBuffer,
    width,
    height,
    focal
  );

  const urls = await uploadStoryImageVariantsOnly(
    db,
    storyId,
    imageId,
    variants
  );

  const originalBytes = row.original_file_size_bytes ?? originalBuffer.byteLength;
  const processedFileSizeBytes = originalBytes + totalProcessedBytes;

  const { data, error } = await db
    .from("story_images")
    .update({
      portrait_url: urls.portrait,
      landscape_url: urls.landscape,
      square_url: urls.square,
      thumb_url: urls.thumb,
      blur_url: urls.blur,
      focal_x: focal.x,
      focal_y: focal.y,
      processed_file_size_bytes: processedFileSizeBytes,
      updated_at: new Date().toISOString()
    })
    .eq("id", imageId)
    .eq("story_id", storyId)
    .select(STORY_IMAGE_SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { error: coverError } = await db
    .from("stories")
    .update({ cover_url: urls.portrait })
    .eq("id", storyId);

  if (coverError) {
    throw new Error(coverError.message);
  }

  const image = mapStoryImageRow(data as StoryImageRow);

  return {
    image,
    coverUrl: resolveStoredMediaUrl(urls.portrait) ?? urls.portrait
  };
}
