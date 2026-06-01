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
      return value;
    }
  }
  return fallbackUrl ?? null;
}

export function hasMediaVariant(
  variants: MediaVariantMap | null | undefined,
  surface: MediaSurface
) {
  return Boolean(pickMediaVariantUrl(variants, surface));
}
