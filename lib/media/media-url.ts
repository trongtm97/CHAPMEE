import { getClientPublicMediaBaseUrl } from "@/lib/media/public-media-client";
import { getPublicMediaUrl } from "@/lib/storage/s3";

export type MediaAssetRef = {
  bucket?: string | null;
  storage_path?: string | null;
  path?: string | null;
  object_key?: string | null;
  status?: string | null;
  is_public?: boolean | null;
};

const LOCAL_URL_PATTERNS = [
  /localhost/i,
  /127\.0\.0\.1/,
  /\/public\/uploads/i,
  /file:\/\//i,
  /^[a-zA-Z]:\\/,
  /https?:\/\/localhost:\d+/i,
  /https?:\/\/127\.0\.0\.1:\d+/i
] as const;

const RAW_LOCAL_PATH_PATTERNS = [/\/public\/uploads/i, /file:\/\//i, /^[a-zA-Z]:\\/] as const;

/** Hostnames for ChapMee-owned media (CDN, app, local dev, S3 endpoint from env). */
export function getOwnedMediaHostnames(): Set<string> {
  const hosts = new Set([
    "chapmee.com",
    "www.chapmee.com",
    "media.chapmee.com",
    "localhost",
    "127.0.0.1"
  ]);

  for (const envKey of [
    "S3_MEDIA_PUBLIC_BASE_URL",
    "S3_PUBLIC_BASE_URL",
    "NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL",
    "NEXT_PUBLIC_S3_PUBLIC_BASE_URL",
    "NEXT_PUBLIC_MEDIA_BASE_URL",
    "S3_ENDPOINT"
  ]) {
    const raw = process.env[envKey]?.trim();
    if (!raw) {
      continue;
    }
    try {
      hosts.add(new URL(raw).hostname.toLowerCase());
    } catch {
      // ignore invalid env URL
    }
  }

  return hosts;
}

/** True when URL points at ChapMee-owned media (not a third-party host). */
export function isOwnedMediaUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value) {
    return false;
  }
  if (isMediaObjectKey(value)) {
    return true;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    return getOwnedMediaHostnames().has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** True when value should be downloaded and stored on ChapMee media (external http(s) URL). */
export function shouldIngestExternalMediaUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value || isMediaObjectKey(value)) {
    return false;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    return !getOwnedMediaHostnames().has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export type NormalizeStoryCoverStorageResult =
  | { kind: "object_key"; objectKey: string }
  | { kind: "ingest"; url: string }
  | { kind: "empty" }
  | { kind: "rejected"; reason: string };

/** Normalize story cover before DB write — object keys only; external URLs must ingest. */
export function normalizeStoryCoverForStorage(
  value: string | null | undefined
): NormalizeStoryCoverStorageResult {
  const trimmed = value?.trim();
  if (!trimmed) {
    return { kind: "empty" };
  }

  if (containsForbiddenLocalMediaUrl(trimmed)) {
    return {
      kind: "rejected",
      reason: "cover_url là đường dẫn local — hãy upload qua media ChapMee."
    };
  }

  if (isMediaObjectKey(trimmed)) {
    return { kind: "object_key", objectKey: trimmed };
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (shouldIngestExternalMediaUrl(trimmed)) {
      return { kind: "ingest", url: trimmed };
    }

    const configuredBase =
      getClientPublicMediaBaseUrl() ||
      process.env.S3_MEDIA_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
      process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
    if (configuredBase && trimmed.startsWith(`${configuredBase}/`)) {
      const key = decodeURIComponent(trimmed.slice(configuredBase.length + 1));
      if (key) {
        return { kind: "object_key", objectKey: key };
      }
    }

    return {
      kind: "rejected",
      reason: "cover_url không phải media ChapMee — dùng link ngoài để tự tải hoặc upload."
    };
  }

  return { kind: "rejected", reason: "cover_url không hợp lệ." };
}

/** True when value is an object key (not a full http URL). */
export function isMediaObjectKey(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return false;
  }
  return trimmed.includes("/");
}

export function resolveStoredMediaUrl(
  stored: string | null | undefined,
  options?: { bucket?: string | null }
): string | null {
  const value = stored?.trim();
  if (!value) {
    return null;
  }
  if (RAW_LOCAL_PATH_PATTERNS.some((pattern) => pattern.test(value))) {
    return null;
  }

  if (isMediaObjectKey(value)) {
    return getPublicMediaUrl(value);
  }

  try {
    const url = new URL(value);
    const configuredBase = getClientPublicMediaBaseUrl() || process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");

    if (configuredBase) {
      const baseWithSlash = `${configuredBase}/`;
      if (url.href.startsWith(baseWithSlash)) {
        const key = url.href.slice(baseWithSlash.length);
        if (key) {
          return getPublicMediaUrl(decodeURIComponent(key));
        }
      }
    }

    if (options?.bucket && url.pathname.includes(`/${options.bucket}/`)) {
      const key = url.pathname.split(`/${options.bucket}/`)[1];
      if (key) {
        return getPublicMediaUrl(decodeURIComponent(key));
      }
    }

    // ponytail: legacy external URLs in DB are not displayed — creator re-uploads in Studio.
    if (!isOwnedMediaUrl(value)) {
      return null;
    }

    return value;
  } catch {
    return getPublicMediaUrl(value);
  }
}

export function getMediaAssetObjectKey(asset: MediaAssetRef): string | null {
  const key = (asset.storage_path ?? asset.path ?? asset.object_key)?.trim();
  return key || null;
}

export function getMediaUrlFromAsset(asset: MediaAssetRef): string | null {
  const key = getMediaAssetObjectKey(asset);
  if (!key) {
    return null;
  }
  return getPublicMediaUrl(key);
}

export async function resolveMediaAssets<T extends MediaAssetRef>(
  assets: T[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const asset of assets) {
    const id = (asset as { id?: string }).id;
    const url = getMediaUrlFromAsset(asset);
    if (id && url) {
      map.set(id, url);
    }
  }
  return map;
}

export function containsForbiddenLocalMediaUrl(raw: string): boolean {
  return LOCAL_URL_PATTERNS.some((pattern) => pattern.test(raw));
}

export function assertNoForbiddenLocalMediaUrls(
  raw: string,
  context = "nội dung"
): void {
  if (containsForbiddenLocalMediaUrl(raw)) {
    throw new Error(
      `Không được lưu URL local vào ${context}. Hãy upload ảnh qua hệ thống media của ChapMee.`
    );
  }
}

/** Walk JSON content and collect resolved URLs for image blocks with mediaAssetId. */
export function resolveContentMedia(
  contentJson: unknown,
  assetUrlById: Map<string, string>
): unknown {
  if (contentJson === null || contentJson === undefined) {
    return contentJson;
  }
  if (Array.isArray(contentJson)) {
    return contentJson.map((item) => resolveContentMedia(item, assetUrlById));
  }
  if (typeof contentJson !== "object") {
    return contentJson;
  }
  const record = contentJson as Record<string, unknown>;
  const next: Record<string, unknown> = { ...record };
  const mediaId =
    (typeof record.mediaAssetId === "string" && record.mediaAssetId) ||
    (typeof record.media_id === "string" && record.media_id) ||
    null;
  if (mediaId && assetUrlById.has(mediaId)) {
    next.resolvedUrl = assetUrlById.get(mediaId);
  }
  for (const [key, value] of Object.entries(record)) {
    if (value && typeof value === "object") {
      next[key] = resolveContentMedia(value, assetUrlById);
    }
  }
  return next;
}
