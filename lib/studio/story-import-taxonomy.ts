import { STORY_TAXONOMY_LIMITS } from "@/lib/taxonomy/constants";
import { PRESENTATION_MODE_SLUGS } from "@/lib/taxonomy/constants";
import {
  loadCreatorTaxonomyCatalog,
  parsePipeSeparatedSlugs,
  resolveCatalogTerm,
  type TaxonomyCatalog
} from "@/lib/studio/taxonomy-catalog";
import type { StoriesImportV2Row, StoryImportV2Validation } from "@/types/studio-import-v2";
import type { TaxonomyType } from "@/types/taxonomy";

const MULTI_SLUG_FIELDS: Array<{
  field: keyof StoriesImportV2Row;
  type: TaxonomyType;
}> = [
  { field: "subgenre_slugs", type: "subgenre" },
  { field: "trope_tag_slugs", type: "trope_tag" },
  { field: "setting_tag_slugs", type: "setting_tag" },
  { field: "character_tag_slugs", type: "character_tag" },
  { field: "relationship_tag_slugs", type: "relationship_tag" },
  { field: "narrative_style_slugs", type: "narrative_style" },
  { field: "reader_experience_slugs", type: "reader_experience" },
  { field: "content_warning_slugs", type: "content_warning" }
];

function parseBool(value: string): boolean | null {
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "có", "co"].includes(v)) return true;
  if (["0", "false", "no", "không", "khong"].includes(v)) return false;
  return null;
}

function resolveMulti(
  catalog: TaxonomyCatalog,
  type: TaxonomyType,
  raw: string,
  label: string,
  errors: string[]
): string[] {
  const slugs = parsePipeSeparatedSlugs(raw);
  const limit = STORY_TAXONOMY_LIMITS[type]?.max;
  if (limit && slugs.length > limit) {
    errors.push(`${label}: tối đa ${limit} (đang có ${slugs.length}).`);
  }

  const ids: string[] = [];
  for (const slug of slugs) {
    const term = resolveCatalogTerm(catalog, type, slug);
    if (!term) {
      errors.push(`${label}: slug "${slug}" không tồn tại — dùng taxonomy_reference.`);
      continue;
    }
    ids.push(term.id);
  }
  return ids;
}

export async function validateStoryImportV2Row(
  row: StoriesImportV2Row,
  rowIndex: number,
  catalogInput?: TaxonomyCatalog
): Promise<StoryImportV2Validation> {
  const { catalog, error: catalogError } = catalogInput
    ? { catalog: catalogInput, error: null }
    : await loadCreatorTaxonomyCatalog();
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = `Dòng ${rowIndex}`;

  if (catalogError) {
    return {
      ok: false,
      errors: [`${prefix}: ${catalogError}`],
      warnings: [],
      termIds: [],
      presentationMode: null,
      hasContentWarning: false,
      contentWarningsConfirmed: false
    };
  }

  if (!row.title?.trim()) {
    errors.push(`${prefix}: title bắt buộc.`);
  }

  const contentType = resolveCatalogTerm(
    catalog,
    "content_type",
    row.content_type_slug
  );
  if (!row.content_type_slug?.trim()) {
    errors.push(`${prefix}: content_type_slug bắt buộc.`);
  } else if (!contentType) {
    errors.push(`${prefix}: content_type_slug không hợp lệ.`);
  }

  const mainGenre = resolveCatalogTerm(catalog, "main_genre", row.main_genre_slug);
  if (!row.main_genre_slug?.trim()) {
    errors.push(`${prefix}: main_genre_slug bắt buộc.`);
  } else if (!mainGenre) {
    errors.push(`${prefix}: main_genre_slug không tồn tại.`);
  }

  const ageRating = resolveCatalogTerm(catalog, "age_rating", row.age_rating_slug);
  if (!row.age_rating_slug?.trim()) {
    errors.push(`${prefix}: age_rating_slug bắt buộc.`);
  } else if (!ageRating) {
    errors.push(`${prefix}: age_rating_slug không tồn tại.`);
  }

  const presentation = row.presentation_mode?.trim() || "";
  if (!presentation) {
    errors.push(`${prefix}: presentation_mode bắt buộc.`);
  } else if (
    !PRESENTATION_MODE_SLUGS.includes(
      presentation as (typeof PRESENTATION_MODE_SLUGS)[number]
    )
  ) {
    errors.push(`${prefix}: presentation_mode không hợp lệ.`);
  }

  const hasCw = parseBool(row.has_content_warning);
  if (hasCw === null && row.has_content_warning?.trim()) {
    errors.push(`${prefix}: has_content_warning phải true/false.`);
  }

  const hasContentWarning = hasCw === true;
  const warningIds = resolveMulti(
    catalog,
    "content_warning",
    row.content_warning_slugs,
    "content_warning_slugs",
    errors
  );

  if (hasContentWarning && warningIds.length === 0) {
    errors.push(`${prefix}: has_content_warning=true cần ít nhất 1 content_warning_slugs.`);
  }
  if (hasCw === false && warningIds.length > 0) {
    errors.push(`${prefix}: has_content_warning=false thì content_warning_slugs phải rỗng.`);
  }

  const termIds: string[] = [];
  if (contentType) termIds.push(contentType.id);
  if (mainGenre) termIds.push(mainGenre.id);
  if (ageRating) termIds.push(ageRating.id);

  for (const { field, type } of MULTI_SLUG_FIELDS) {
    if (type === "content_warning") continue;
    const ids = resolveMulti(
      catalog,
      type,
      row[field],
      String(field),
      errors
    );
    termIds.push(...ids);
  }
  termIds.push(...warningIds);

  if (row.subgenre_slugs?.trim() && !mainGenre) {
    warnings.push(`${prefix}: subgenre bỏ qua vì thiếu main_genre hợp lệ.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    termIds: [...new Set(termIds)],
    presentationMode: presentation || null,
    hasContentWarning,
    contentWarningsConfirmed: true
  };
}

export {
  isChaptersImportV2Headers,
  isStoriesImportV2Headers
} from "@/lib/studio/import-v2-headers";
