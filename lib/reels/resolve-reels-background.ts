import {
  containsForbiddenLocalMediaUrl,
  isMediaObjectKey,
  resolveStoredMediaUrl
} from "@/lib/media/media-url";
import { LOCAL_MEDIA_URL_ERROR } from "@/lib/media/content-media-validator";

/** Display URL for reels_items.background_image_url (object key or legacy URL). */
export function resolveReelsBackgroundUrl(stored: string | null | undefined): string | null {
  return resolveStoredMediaUrl(stored);
}

/**
 * Normalize value before saving to reels_items.background_image_url.
 * Prefer object keys; reject localhost/file paths.
 */
export function normalizeReelsBackgroundForStorage(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (containsForbiddenLocalMediaUrl(trimmed)) {
    throw new Error(LOCAL_MEDIA_URL_ERROR);
  }

  if (isMediaObjectKey(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const publicBase = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
    if (publicBase && trimmed.startsWith(`${publicBase}/`)) {
      return trimmed.slice(publicBase.length + 1);
    }
    throw new Error(
      "Không được lưu URL ảnh ngoài vào Reels. Chọn ảnh bìa/chương từ truyện (media nội bộ)."
    );
  }

  return trimmed;
}
