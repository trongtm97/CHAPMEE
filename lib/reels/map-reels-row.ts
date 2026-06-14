import type { PostgrestRow } from "@/lib/db/postgrest-row";
import type { ReelsItemListItem, ReelsItemRecord, ReelsItemStatus, ReelsSourceType } from "@/types/reels";

type ReelsRow = {
  id: string;
  owner_id: string;
  story_id: string;
  chapter_id: string | null;
  title: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  cta_type: string | null;
  background_image_url: string | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  source_type: string | null;
  source_text_start: number | null;
  source_text_end: number | null;
  view_count: number | null;
  cta_click_count: number | null;
  created_at: string;
  updated_at: string;
  content_storage_type?: string | null;
  content_object_key?: string | null;
  content_hash?: string | null;
  content_encoding?: string | null;
  content_size_bytes?: number | null;
  content_blob_format?: string | null;
  body_preview?: string | null;
};

export function mapReelsRow(row: ReelsRow | PostgrestRow): ReelsItemRecord {
  const storageType =
    (row as { content_storage_type?: string | null }).content_storage_type ?? "db";
  const isS3 = storageType === "s3";

  return {
    backgroundImageUrl: row.background_image_url,
    body: isS3 ? (row as { body_preview?: string | null }).body_preview ?? null : row.body,
    bodyPreview: isS3 ? (row as { body_preview?: string | null }).body_preview ?? null : row.body,
    chapterId: row.chapter_id,
    contentEncoding: (row as { content_encoding?: string | null }).content_encoding ?? null,
    contentHash: (row as { content_hash?: string | null }).content_hash ?? null,
    contentObjectKey: (row as { content_object_key?: string | null }).content_object_key ?? null,
    contentSizeBytes: (row as { content_size_bytes?: number | null }).content_size_bytes ?? null,
    contentStorageType: isS3 ? "s3" : "db",
    createdAt: row.created_at,
    cta: isS3 ? null : row.cta,
    ctaClickCount: row.cta_click_count ?? 0,
    ctaType: row.cta_type,
    hook: isS3 ? null : row.hook,
    id: row.id,
    ownerId: row.owner_id,
    publishedAt: row.published_at,
    scheduledAt: row.scheduled_at,
    sourceTextEnd: row.source_text_end,
    sourceTextStart: row.source_text_start,
    sourceType: row.source_type as ReelsSourceType | null,
    status: row.status as ReelsItemStatus,
    storyId: row.story_id,
    title: isS3 ? null : row.title,
    updatedAt: row.updated_at,
    viewCount: row.view_count ?? 0
  };
}

export function mapReelsListRow(
  row: ReelsRow & {
    stories:
      | { title: string; slug: string }
      | { title: string; slug: string }[]
      | null;
    episodes:
      | { title: string; episode_number: number }
      | { title: string; episode_number: number }[]
      | null;
  }
): ReelsItemListItem {
  const story = Array.isArray(row.stories) ? row.stories[0] : row.stories;
  const episode = Array.isArray(row.episodes) ? row.episodes[0] : row.episodes;
  const base = mapReelsRow(row);

  return {
    ...base,
    chapterNumber: episode?.episode_number ?? null,
    chapterTitle: episode?.title ?? null,
    storySlug: story?.slug ?? "—",
    storyTitle: story?.title ?? "Chưa chọn truyện"
  };
}
