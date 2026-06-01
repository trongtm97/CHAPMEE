import type { ChapterImageBlock } from "@/types/chapter-images";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  return {
    alt: row.alt_text ?? "",
    caption: row.caption ?? "",
    height: row.height ?? 720,
    id: row.id,
    src: row.image_url,
    thumbSrc: row.thumb_url ?? row.image_url,
    width: row.width ?? 1280
  };
}

export async function getChapterImagesMap(
  supabase: SupabaseClient,
  imageIds: string[]
): Promise<ChapterImageMap> {
  const unique = [...new Set(imageIds.filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("chapter_images")
    .select("id, image_url, thumb_url, alt_text, caption, width, height")
    .in("id", unique);

  if (error) {
    return {};
  }

  const map: ChapterImageMap = {};
  for (const row of (data ?? []) as ChapterImageRow[]) {
    map[row.id] = mapChapterImageRow(row);
  }
  return map;
}
