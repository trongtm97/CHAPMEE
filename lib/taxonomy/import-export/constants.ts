import { COMPOSER_BLOCK_TYPES } from "@/lib/composer/types";
import { TAXONOMY_TYPES } from "@/types/taxonomy";

/** Values that must never appear in the taxonomy `type` column. */
export const BLOCKED_TAXONOMY_TYPE_VALUES = new Set<string>([
  ...COMPOSER_BLOCK_TYPES,
  "structured_content",
  "structured_content_json",
  "block",
  "composer_block"
]);

export const COMPOSER_BLOCK_EXAMPLES = [
  "chat_message",
  "system_notice",
  "case_evidence"
] as const;

export const TAXONOMY_VALID_TYPES_TEXT = TAXONOMY_TYPES.join(", ");

export function isValidTaxonomyTypeValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (BLOCKED_TAXONOMY_TYPE_VALUES.has(normalized)) return false;
  return (TAXONOMY_TYPES as readonly string[]).includes(normalized);
}

export function mapLegacyImportMode(
  mode: string
): "create_only" | "update_by_type_slug" | "upsert_by_type_slug" {
  switch (mode) {
    case "create":
      return "create_only";
    case "update":
      return "update_by_type_slug";
    case "upsert":
    default:
      return "upsert_by_type_slug";
  }
}
