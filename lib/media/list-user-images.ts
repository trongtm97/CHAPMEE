import { resolveMediaObjectUrl } from "@/lib/media/media-resolver";
import { sanitizeIlikePattern } from "@/lib/studio/studio-hub-filters";
import type { DatabaseClient } from "@/lib/db/types";
import type { LibraryImage } from "@/types/media-library";

export type { LibraryImage };

export type ListUserLibraryImagesOptions = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export type ListUserLibraryImagesResult = {
  images: LibraryImage[];
  total: number;
};
type ChapterImageRow = {
  id: string;
  image_url: string;
  thumb_url: string | null;
  alt_text: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  created_at: string | null;
};

type StorageAssetRow = {
  id: string;
  path: string;
  width: number | null;
  height: number | null;
  original_filename: string | null;
  created_at: string | null;
};

const PER_SOURCE_LIMIT = 500;

/** Reusable image asset usage types surfaced in the account-wide library. */const LIBRARY_ASSET_USAGE_TYPES = [
  "content_post_inline",
  "content_post_cover",
  "story_cover",
  "avatar",
  "composer_image",
  "seo_og_image"
];

export async function listUserLibraryImages(
  db: DatabaseClient,
  ownerId: string,
  options?: ListUserLibraryImagesOptions
): Promise<ListUserLibraryImagesResult> {
  const images: LibraryImage[] = [];
  const search = options?.search?.trim() ?? "";
  const safeSearch = search ? sanitizeIlikePattern(search) : "";
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.max(1, options?.pageSize ?? 25);

  let chapterQuery = db
    .from("chapter_images")
    .select("id, image_url, thumb_url, alt_text, caption, width, height, created_at")
    .eq("uploader_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(PER_SOURCE_LIMIT);

  if (safeSearch) {
    chapterQuery = chapterQuery.or(
      `alt_text.ilike.%${safeSearch}%,caption.ilike.%${safeSearch}%,image_url.ilike.%${safeSearch}%`
    );
  }

  const { data: chapterRows } = await chapterQuery;
  for (const row of (chapterRows ?? []) as ChapterImageRow[]) {
    const url = resolveMediaObjectUrl(row.image_url);
    if (!url) {
      continue;
    }
    const thumbKey = row.thumb_url ?? row.image_url;
    images.push({
      id: row.id,
      source: "chapter",
      url,
      objectKey: row.image_url,
      thumbUrl: resolveMediaObjectUrl(thumbKey) ?? url,
      thumbKey,
      width: row.width,
      height: row.height,
      alt: row.alt_text ?? "",
      caption: row.caption ?? "",
      createdAt: row.created_at ?? ""
    });
  }

  let assetQuery = db
    .from("storage_assets")
    .select("id, path, width, height, original_filename, created_at")
    .eq("owner_id", ownerId)
    .eq("status", "active")
    .in("usage_type", LIBRARY_ASSET_USAGE_TYPES)
    .order("created_at", { ascending: false })
    .limit(PER_SOURCE_LIMIT);

  if (safeSearch) {
    assetQuery = assetQuery.or(
      `path.ilike.%${safeSearch}%,original_filename.ilike.%${safeSearch}%`
    );
  }

  const { data: assetRows } = await assetQuery;
  for (const row of (assetRows ?? []) as StorageAssetRow[]) {
    const url = resolveMediaObjectUrl(row.path);
    if (!url) {
      continue;
    }
    images.push({
      id: row.id,
      source: "asset",
      url,
      objectKey: row.path,
      thumbUrl: url,
      thumbKey: row.path,
      width: row.width,
      height: row.height,
      alt: "",
      caption: "",
      createdAt: row.created_at ?? ""
    });
  }

  images.sort((a, b) => (b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0));

  if (!options) {
    return { images, total: images.length };
  }

  const total = images.length;
  const start = (page - 1) * pageSize;
  return {
    images: images.slice(start, start + pageSize),
    total
  };
}