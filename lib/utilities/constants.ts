/** Route gốc khu vực tiện ích. */
export const UTILITIES_BASE_PATH = "/tien-ich";

/** Chiều ngang tối đa của shell Tiện ích (sidebar + nội dung). */
export const UTILITIES_SHELL_MAX_WIDTH_CLASS = "max-w-[1600px]";

/** Lớp chiều ngang chuẩn cho mọi trang con trong /tien-ich/. */
export const UTILITIES_PAGE_WIDTH_CLASS = "w-full min-w-0";

export const UTILITIES_FULL_NAME = "Tiện ích ChapMee";

export const UTILITIES_TAGLINE =
  "Công cụ nhỏ hữu ích khi đăng bài, bình luận hoặc trang trí nội dung.";

export function utilitiesPath(subpath = ""): string {
  if (!subpath) {
    return UTILITIES_BASE_PATH;
  }

  return subpath.startsWith("/")
    ? `${UTILITIES_BASE_PATH}${subpath}`
    : `${UTILITIES_BASE_PATH}/${subpath}`;
}
