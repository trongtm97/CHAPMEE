import { resolveStoredMediaUrl } from "@/lib/media/media-url";

export type MediaSurface =
  | "thumbnail"
  | "card"
  | "cover"
  | "reader"
  | "reels"
  | "avatar"
  | "admin";

export type MediaVariantMap = Record<string, string | null | undefined>;

const surfacePreference: Record<MediaSurface, string[]> = {
  admin: ["thumb", "thumbnail", "card", "small", "original"],
  avatar: ["small", "thumb", "thumbnail", "medium", "original"],
  card: ["card", "landscape", "square", "thumb", "thumbnail"],
  cover: ["cover", "hero", "portrait", "landscape", "card"],
  reader: ["reader", "content", "cover", "landscape", "original"],
  reels: ["reels", "portrait", "cover", "card"],
  thumbnail: ["thumb", "thumbnail", "small", "square"]
};

export function pickMediaVariantUrl(
  variants: MediaVariantMap | null | undefined,
  surface: MediaSurface,
  fallbackUrl?: string | null
) {
  const map = variants ?? {};
  for (const key of surfacePreference[surface]) {
    const value = map[key];
    if (typeof value === "string" && value.trim()) {
      return resolveStoredMediaUrl(value) ?? value;
    }
  }
  const resolvedFallback = resolveStoredMediaUrl(fallbackUrl);
  return resolvedFallback ?? fallbackUrl ?? null;
}

/** Resolve all variant entries that store object keys. */
export function resolveMediaVariantMap(
  variants: MediaVariantMap | null | undefined
): MediaVariantMap {
  const map = variants ?? {};
  const resolved: MediaVariantMap = {};
  for (const [key, value] of Object.entries(map)) {
    if (typeof value === "string" && value.trim()) {
      resolved[key] = resolveStoredMediaUrl(value) ?? value;
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

export function hasMediaVariant(
  variants: MediaVariantMap | null | undefined,
  surface: MediaSurface
) {
  return Boolean(pickMediaVariantUrl(variants, surface));
}
