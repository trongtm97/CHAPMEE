const SLUG_MAX_LENGTH = 80;

/** Map Vietnamese characters that NFD does not decompose (e.g. đ). */
const VIETNAMESE_CHAR_MAP: Record<string, string> = {
  đ: "d",
  Đ: "d"
};

export const SEO_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Chuẩn slug tiếng Việt: không dấu, viết thường, chỉ a-z 0-9 và dấu gạch ngang.
 * "Bánh Cuốn Nhỏ" => "banh-cuon-nho"
 * "Đặng Lên 24h" => "dang-len-24h"
 */
export function normalizeVietnameseSlug(input: string, maxLength = SLUG_MAX_LENGTH): string {
  let value = input.trim();

  for (const [from, to] of Object.entries(VIETNAMESE_CHAR_MAP)) {
    value = value.replaceAll(from, to);
  }

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

export function isValidSeoSlug(slug: string) {
  return SEO_SLUG_REGEX.test(slug);
}

export function validateSeoSlug(slug: string): string | null {
  const trimmed = slug.trim();

  if (!trimmed) {
    return "Slug không được để trống.";
  }

  if (trimmed !== trimmed.toLowerCase()) {
    return "Slug phải viết thường.";
  }

  if (/\s/.test(trimmed)) {
    return "Slug không được chứa khoảng trắng.";
  }

  if (/[^a-z0-9-]/.test(trimmed)) {
    return "Slug chỉ được chứa chữ thường không dấu, số và dấu gạch ngang.";
  }

  if (trimmed.startsWith("-") || trimmed.endsWith("-")) {
    return "Slug không được bắt đầu hoặc kết thúc bằng dấu gạch ngang.";
  }

  if (!SEO_SLUG_REGEX.test(trimmed)) {
    return "Slug không hợp lệ.";
  }

  return null;
}
