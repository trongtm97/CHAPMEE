import { resolveStoredMediaUrl } from "@/lib/media/media-url";
import type { ChapterImageBlock } from "@/types/chapter-images";
import type { DatabaseClient } from "@/lib/db/types";

export type ChapterImageMap = Record<string, ChapterImageBlock>;

type ChapterImageRow = {
  id: string;
  image_url: string;
  thumb_url: string | null;
  alt_text: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
};

export function mapChapterImageRow(row: ChapterImageRow): ChapterImageBlock {
  const imageKey = row.image_url;
  const thumbKey = row.thumb_url ?? row.image_url;
  return {
    alt: row.alt_text ?? "",
    caption: row.caption ?? "",
    height: row.height ?? 720,
    id: row.id,
    mediaAssetId: row.id,
    src: resolveStoredMediaUrl(imageKey) ?? imageKey,
    thumbSrc: resolveStoredMediaUrl(thumbKey) ?? thumbKey,
    width: row.width ?? 1280
  };
}

export async function getChapterImagesMap(
  db: DatabaseClient,
  imageIds: string[]
): Promise<ChapterImageMap> {
  const unique = [...new Set(imageIds.filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }

  const { data, error } = await db
    .from("chapter_images")
    .select("id, image_url, thumb_url, alt_text, caption, width, height")
    .in("id", unique);

  if (error) {
    console.warn("[chapter-images] map load failed", error.message);
    return {};
  }

  const map: ChapterImageMap = {};
  for (const row of (data ?? []) as ChapterImageRow[]) {
    map[row.id] = mapChapterImageRow(row);
  }
  return map;
}
