/** Catalog / card cover helpers — portrait 3:4 only. */

export const CATALOG_ROW_COVER_WIDTH_CLASS = "w-[7.25rem]" as const;

/** Short title for fallback surface (single line, no overflow). */
export function getStoryCoverShortTitle(title: string, maxLength = 22): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Responsive `sizes` for catalog cover slots. */
export function getCatalogCoverSizes(variant: "row" | "grid"): string {
  if (variant === "row") {
    return "116px";
  }
  return "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 280px";
}

/** Pick first non-empty legacy cover field from story-like objects. */
export function pickStoryLegacyCoverUrl(
  story: Record<string, unknown> & {
    coverUrl?: string | null;
    cover_url?: string | null;
  }
): string | null {
  const candidates = [
    story.coverUrl,
    story.cover_url,
    story.coverImageUrl,
    story.cover_image_url,
    story.coverAsset,
    story.cover_asset,
    story.thumbnailUrl,
    story.thumbnail_url,
    story.mediaAsset,
    story.media_asset,
    story.imageUrl,
    story.image_url
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}
