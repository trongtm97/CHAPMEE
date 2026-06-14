/**
 * Standard media URL resolver for ChapMee.
 * Entity fields store media_asset_id and/or object_key — never absolute MinIO/S3 URLs.
 */
import { getMediaS3Bucket, getPublicMediaUrl } from "@/lib/storage/s3";
import {
  containsForbiddenLocalMediaUrl,
  getMediaAssetObjectKey,
  getMediaUrlFromAsset,
  isMediaObjectKey,
  resolveStoredMediaUrl,
  type MediaAssetRef
} from "@/lib/media/media-url";

export type MediaVariant = "original" | "portrait" | "landscape" | "square" | "thumb" | "blur";

export type ExternalMediaContext =
  | "youtube_thumbnail"
  | "external_audio"
  | "translation_source"
  | "legal_link"
  | "canonical"
  | "campaign_cta";

const EXTERNAL_CONTEXT_PATTERNS: Partial<Record<ExternalMediaContext, RegExp[]>> = {
  youtube_thumbnail: [/youtube\.com/i, /youtu\.be/i, /img\.youtube\.com/i],
  external_audio: [],
  translation_source: [],
  legal_link: [],
  canonical: [],
  campaign_cta: []
};

/** @deprecated Prefer resolveMediaObjectUrl — alias for backward compatibility. */
export function resolveStoredMediaReference(
  stored: string | null | undefined,
  options?: { bucket?: string | null }
): string | null {
  return resolveStoredMediaUrl(stored, options);
}

/** Build display URL from object key (+ optional variant path segment). */
export function resolveMediaObjectUrl(
  objectKey: string | null | undefined,
  _variant?: MediaVariant
): string | null {
  const key = objectKey?.trim();
  if (!key) {
    return null;
  }
  if (containsForbiddenLocalMediaUrl(key)) {
    return null;
  }
  // Variants are separate object keys in ChapMee (story-images/{id}/portrait.webp).
  return resolveStoredMediaUrl(key);
}

/** Display URL from a storage_assets / media_assets row. */
export function getMediaAssetPublicUrl(asset: MediaAssetRef | null | undefined): string | null {
  if (!asset) {
    return null;
  }
  const url = getMediaUrlFromAsset(asset);
  if (url && containsForbiddenLocalMediaUrl(url)) {
    return null;
  }
  return url;
}

/** Variant URL when asset.variants maps variant name → object key. */
export function getMediaVariantUrl(
  asset: MediaAssetRef & { variants?: Record<string, string> | null },
  variant: MediaVariant
): string | null {
  const variantKey = asset.variants?.[variant]?.trim();
  if (variantKey) {
    return resolveMediaObjectUrl(variantKey);
  }
  return getMediaAssetPublicUrl(asset);
}

export function assertNoLocalHardcodedMediaUrl(
  url: string,
  context = "media"
): void {
  if (containsForbiddenLocalMediaUrl(url)) {
    throw new Error(
      `Không được lưu URL media local vào ${context}. Hãy upload qua hệ thống media của ChapMee.`
    );
  }
}

/** True for intentional external URLs (YouTube, source links, etc.). */
export function isAllowedExternalMediaUrl(
  url: string,
  context: ExternalMediaContext
): boolean {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return false;
  }
  if (containsForbiddenLocalMediaUrl(trimmed)) {
    return false;
  }
  const patterns = EXTERNAL_CONTEXT_PATTERNS[context];
  if (!patterns?.length) {
    return true;
  }
  return patterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Extract object key from a known ChapMee S3/MinIO public URL.
 * Returns null if URL is external or unrecognized.
 */
export function extractObjectKeyFromPublicUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return isMediaObjectKey(trimmed) ? trimmed : null;
  }

  try {
    const parsed = new URL(trimmed);
    const buckets = new Set<string>();
    const appBucket = getMediaS3Bucket();
    buckets.add(appBucket);
    buckets.add("content-posts");
    buckets.add("story-images");

    const configuredBase = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
    if (configuredBase && trimmed.startsWith(`${configuredBase}/`)) {
      return decodeURIComponent(trimmed.slice(configuredBase.length + 1));
    }

    for (const bucket of buckets) {
      const marker = `/${bucket}/`;
      const idx = parsed.pathname.indexOf(marker);
      if (idx >= 0) {
        return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
      }
    }
  } catch {
    return null;
  }

  return null;
}

export type NormalizeMediaStorageResult =
  | { kind: "object_key"; objectKey: string }
  | { kind: "empty" }
  | { kind: "rejected"; reason: string };

/**
 * Normalize a value before persisting to a legacy `*_url` column.
 * Converts known S3 public URLs → object key; rejects forbidden local URLs.
 */
export function normalizeMediaFieldForStorage(
  value: string | null | undefined,
  context = "media"
): NormalizeMediaStorageResult {
  const trimmed = value?.trim();
  if (!trimmed) {
    return { kind: "empty" };
  }

  if (containsForbiddenLocalMediaUrl(trimmed)) {
    return { kind: "rejected", reason: `URL local không hợp lệ trong ${context}.` };
  }

  if (isMediaObjectKey(trimmed)) {
    return { kind: "object_key", objectKey: trimmed };
  }

  const extracted = extractObjectKeyFromPublicUrl(trimmed);
  if (extracted) {
    return { kind: "object_key", objectKey: extracted };
  }

  // Legacy absolute CDN URL we cannot map — reject for internal upload fields.
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return {
      kind: "rejected",
      reason: `Không lưu URL tuyệt đối vào ${context}. Dùng media_asset_id hoặc upload lại.`
    };
  }

  return { kind: "object_key", objectKey: trimmed };
}

/** Resolve display URL: prefer asset id lookup result, else legacy stored value. */
export function resolveMediaDisplayUrl(input: {
  mediaAssetId?: string | null;
  resolvedAssetUrl?: string | null;
  legacyStored?: string | null;
  bucket?: string | null;
}): string | null {
  if (input.resolvedAssetUrl) {
    return input.resolvedAssetUrl;
  }
  if (input.legacyStored) {
    return resolveStoredMediaUrl(input.legacyStored, { bucket: input.bucket });
  }
  return null;
}

/** Server-only asset lookup: import from `@/lib/seo/seo-media` (not re-exported here — avoids pulling `pg` into client bundles). */

export {
  getMediaAssetObjectKey,
  getMediaUrlFromAsset,
  isMediaObjectKey,
  resolveStoredMediaUrl
} from "@/lib/media/media-url";
