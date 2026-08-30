import { resolveStoredMediaUrl } from "@/lib/media/media-url";

/** Resolve story cover from DB field (object key or legacy URL). */
export function resolveStoryCoverUrl(coverUrl: string | null | undefined): string | null {
  return resolveStoredMediaUrl(coverUrl);
}
