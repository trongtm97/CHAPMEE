import {
  normalizeVietnameseSlug,
  validateSeoSlug
} from "@/lib/seo/slug";

const SLUG_MAX_LENGTH = 80;

export const CONTENT_POST_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export { normalizeVietnameseSlug };

/** @deprecated Use normalizeVietnameseSlug */
export function slugifyVietnameseTitle(title: string): string {
  return normalizeVietnameseSlug(title, SLUG_MAX_LENGTH);
}

export function validateContentPostSlug(slug: string): string | null {
  return validateSeoSlug(slug);
}

export function normalizeContentPostSlugInput(slug: string) {
  return normalizeVietnameseSlug(slug.replace(/-/g, " ")) || slug.trim().toLowerCase();
}

export async function buildUniqueContentPostSlug(
  baseSlug: string,
  isSlugTaken: (slug: string) => Promise<boolean>
): Promise<string> {
  const root = normalizeVietnameseSlug(baseSlug, SLUG_MAX_LENGTH) || "bai-viet";
  let candidate = root;
  let suffix = 1;

  while (await isSlugTaken(candidate)) {
    const suffixText = `-${suffix}`;
    candidate = `${root.slice(0, SLUG_MAX_LENGTH - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  return candidate;
}
