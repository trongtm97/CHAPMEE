import { ENTITY_CODE_PREFIX, SLUG_MAX_LENGTH, type PublicEntityType } from "@/lib/urls/constants";
import { normalizeVietnameseSlug } from "@/lib/seo/slug";

/**
 * Normalize Vietnamese text for slug/username processing (no hyphen rules).
 */
export function normalizeVietnameseText(input: string): string {
  return normalizeVietnameseSlug(input, SLUG_MAX_LENGTH);
}

export function createVietnameseSlug(input: string, maxLength = SLUG_MAX_LENGTH): string {
  return normalizeVietnameseSlug(input, maxLength);
}

export function fallbackContentSlug(
  entityType: PublicEntityType,
  publicCode: string
): string {
  const prefix = ENTITY_CODE_PREFIX[entityType];
  return `${entityType.replace("_", "-")}-${prefix}-${publicCode}`.slice(0, SLUG_MAX_LENGTH);
}

export function resolveContentSlug(
  title: string | null | undefined,
  entityType: PublicEntityType,
  publicCode: string
): string {
  const fromTitle = createVietnameseSlug(title ?? "");
  if (fromTitle) {
    return fromTitle;
  }
  return fallbackContentSlug(entityType, publicCode);
}
