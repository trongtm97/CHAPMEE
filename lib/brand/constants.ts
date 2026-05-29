/** Tên thương hiệu chính thức — dùng cho UI, metadata, thông báo. */
export const BRAND_NAME =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_APP_NAME?.trim()) ||
  "ChapMee";

export const BRAND_NAME_LOWER = "chapmee";

/** Tỷ lệ logo wordmark gốc (1107×292). */
export const BRAND_LOGO_ASPECT_RATIO = 1107 / 292;

/** Bump khi đổi file logo — tránh cache logo cũ trên mobile/PWA. */
export const BRAND_ASSET_VERSION = "chapmee-1";

export const BRAND_LOGO_PATH = "/brand/chapmee-wordmark.png";

/** @deprecated Dùng BRAND_LOGO_PATH; giữ redirect trong next.config. */
export const BRAND_LOGO_PATH_LEGACY = "/logo.png";

export function brandAssetUrl(path: string): string {
  return `${path}?v=${BRAND_ASSET_VERSION}`;
}

/** Icon vuông (ee + sách) — tab, PWA, Apple. Nguồn 1254×1254. */
export const BRAND_FAVICON_PATH = "/favicon.png";

export const BRAND_ICON_192_PATH = "/icons/icon-192.png";

export const BRAND_ICON_512_PATH = "/icons/icon-512.png";

export const BRAND_APPLE_TOUCH_ICON_PATH = "/icons/apple-touch-icon.png";
