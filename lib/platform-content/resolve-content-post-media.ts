import { resolveMediaAssetPublicUrl } from "@/lib/seo/seo-media";
import { resolveStoredMediaUrl } from "@/lib/media/media-resolver";

export type ContentPostMediaFields = {
  cover_media_asset_id?: string | null;
  cover_image_url?: string | null;
  og_image_media_asset_id?: string | null;
  og_image_url?: string | null;
  /** Rendered post body — used to auto-pick the first image when no cover/OG is set. */
  content?: string | null;
};

const HTML_IMG_SRC_RE = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/i;
const MARKDOWN_IMG_RE = /!\[[^\]]*\]\(\s*([^)\s]+)/;

/** First usable image URL inside post content (HTML <img> or markdown ![]()). */
export function extractFirstContentImageUrl(
  content: string | null | undefined
): string | null {
  if (!content) {
    return null;
  }

  const raw =
    content.match(HTML_IMG_SRC_RE)?.[1] ?? content.match(MARKDOWN_IMG_RE)?.[1] ?? null;
  if (!raw) {
    return null;
  }

  return resolveStoredMediaUrl(raw.trim());
}

/** Resolve cover display URL — prefers cover_media_asset_id, then first content image. */
export async function resolveContentPostCoverUrl(
  post: ContentPostMediaFields
): Promise<string | null> {
  if (post.cover_media_asset_id) {
    const fromAsset = await resolveMediaAssetPublicUrl(post.cover_media_asset_id);
    if (fromAsset) {
      return fromAsset;
    }
  }
  const fromUrl = resolveStoredMediaUrl(post.cover_image_url);
  if (fromUrl) {
    return fromUrl;
  }
  return extractFirstContentImageUrl(post.content);
}

/**
 * Resolve OG image — prefers og_image_media_asset_id, then cover asset, then
 * legacy URLs, and finally the first image found in the post content.
 */
export async function resolveContentPostOgImageUrl(
  post: ContentPostMediaFields
): Promise<string | null> {
  if (post.og_image_media_asset_id) {
    const fromAsset = await resolveMediaAssetPublicUrl(post.og_image_media_asset_id);
    if (fromAsset) {
      return fromAsset;
    }
  }
  if (post.cover_media_asset_id && !post.og_image_media_asset_id) {
    const fromCover = await resolveMediaAssetPublicUrl(post.cover_media_asset_id);
    if (fromCover) {
      return fromCover;
    }
  }
  const legacyOg = resolveStoredMediaUrl(post.og_image_url);
  if (legacyOg) {
    return legacyOg;
  }
  const legacyCover = resolveStoredMediaUrl(post.cover_image_url);
  if (legacyCover) {
    return legacyCover;
  }
  return extractFirstContentImageUrl(post.content);
}
