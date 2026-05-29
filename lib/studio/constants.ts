/** Route gốc khu vực viết truyện. */
export const STUDIO_BASE_PATH = "/studio";

export const STUDIO_FULL_NAME = "ChapMee Studio";

export const STUDIO_SHORT_NAME = "Studio";

export const STUDIO_TAGLINE = "Viết, quản lý và phát triển truyện của bạn.";

export function studioPath(subpath = ""): string {
  if (!subpath) {
    return STUDIO_BASE_PATH;
  }

  return subpath.startsWith("/")
    ? `${STUDIO_BASE_PATH}${subpath}`
    : `${STUDIO_BASE_PATH}/${subpath}`;
}
