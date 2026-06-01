import { studioPath } from "@/lib/studio/constants";

/** Canonical public Reels feed path. */
export const REELS_PUBLIC_PATH = "/reels";

export function studioReelsPath(subpath = ""): string {
  if (!subpath) {
    return studioPath("/reels");
  }

  const normalized = subpath.startsWith("/") ? subpath : `/${subpath}`;
  return studioPath(`/reels${normalized}`);
}

/** Map internal DB/API source keys to user-facing label. */
export function displayReelsLabel(source?: string | null): string {
  if (!source) {
    return "Reels";
  }

  const normalized = source.toLowerCase();
  if (normalized === "reels" || normalized === "reel") {
    return "Reels";
  }

  return source;
}

/** Share payloads use kind `reel` or `reels`. */
export function isReelsShareKind(kind?: string | null): boolean {
  return kind === "reel" || kind === "reels";
}

export const REELS_SHARE_CTA_LABEL = "Xem Reels truyện này trên ChapMee";

export const REELS_SHARE_BADGE_LABEL = "Reels excerpt";

export const REELS_SHARE_IMAGE_KICKER = "REELS TRUYỆN";
