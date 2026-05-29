import {
  STORY_IMAGE_STORAGE_BUCKET,
  type StoryImage,
  type StoryImageRow
} from "@/types/story-images";

function toNumber(value: number | string | null | undefined, fallback: number) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mapStoryImageRow(row: StoryImageRow): StoryImage {
  return {
    id: row.id,
    storyId: row.story_id,
    originalUrl: row.original_url,
    portraitUrl: row.portrait_url,
    landscapeUrl: row.landscape_url,
    squareUrl: row.square_url,
    thumbUrl: row.thumb_url,
    blurUrl: row.blur_url,
    focalX: toNumber(row.focal_x, 0.5),
    focalY: toNumber(row.focal_y, 0.5),
    originalWidth: row.original_width,
    originalHeight: row.original_height,
    originalFileSizeBytes: row.original_file_size_bytes,
    processedFileSizeBytes: row.processed_file_size_bytes,
    mimeType: row.mime_type,
    storageBucket: row.storage_bucket ?? STORY_IMAGE_STORAGE_BUCKET,
    isCurrent: Boolean(row.is_current),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
