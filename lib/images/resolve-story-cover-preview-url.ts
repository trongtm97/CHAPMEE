import { resolvePublicMediaUrlClient } from "@/lib/media/public-media-client";
import type { StoryImage } from "@/types/story-images";

function resolveClientStoredUrl(stored: string | null | undefined): string | null {
  const value = stored?.trim();
  if (!value) {
    return null;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return resolvePublicMediaUrlClient(value) ?? value;
  }

  return resolvePublicMediaUrlClient(value);
}

/** Client-safe preview URL for studio cover uploader (object key or legacy URL). */
export function resolveStoryCoverPreviewUrl(
  stored: string | null | undefined,
  currentImage?: StoryImage | null
): string | null {
  const fromStored = resolveClientStoredUrl(stored);
  if (fromStored) {
    return fromStored;
  }

  return (
    resolveClientStoredUrl(currentImage?.portraitUrl) ??
    resolveClientStoredUrl(currentImage?.originalUrl)
  );
}
