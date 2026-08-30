import { STORY_TAXONOMY_LIMITS } from "@/lib/taxonomy/constants";

import { PRESENTATION_MODE_SLUGS } from "@/lib/taxonomy/constants";

import {

  loadCreatorTaxonomyCatalog,

  parseImportTaxonomyValues,

  resolveCatalogTerm,

  type TaxonomyCatalog

} from "@/lib/studio/taxonomy-catalog";

import type { ContentOrigin, TranslationType } from "@/lib/content-origin/content-origin-types";

import {

  isValidSourceUrl,

  SOURCE_URL_VALIDATION_MESSAGE

} from "@/lib/creator/validate-source-url";

import {

  resolveImportContentOrigin,

  resolveImportOriginalLanguage,

  resolveImportTranslationType

} from "@/lib/studio/import-field-value-guide";

import { shouldIngestExternalCoverUrl } from "@/lib/studio/ingest-import-cover-url";

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



function resolvePresentationModeInput(

  catalog: TaxonomyCatalog,

  raw: string

): string | null {

  const trimmed = raw.trim();

  if (!trimmed) return null;



  if (

    PRESENTATION_MODE_SLUGS.includes(

      trimmed as (typeof PRESENTATION_MODE_SLUGS)[number]

    )

  ) {

    return trimmed;

  }



  const term = resolveCatalogTerm(catalog, "presentation_mode", trimmed);

  if (term) return term.slug;



  const underscoreCandidate = trimmed.includes("_")

    ? trimmed

    : trimmed.replace(/-/g, "_");

  if (

    PRESENTATION_MODE_SLUGS.includes(

      underscoreCandidate as (typeof PRESENTATION_MODE_SLUGS)[number]

    )

  ) {

    return underscoreCandidate;

  }



  return null;

}



function resolveMulti(

  catalog: TaxonomyCatalog,

  type: TaxonomyType,

  raw: string,

  label: string,

  warnings: string[]

): string[] {

  const values = parseImportTaxonomyValues(raw);

  const limit = STORY_TAXONOMY_LIMITS[type]?.max;

  if (limit && values.length > limit) {

    warnings.push(`${label}: chỉ lấy tối đa ${limit} giá trị (file có ${values.length}).`);

  }



  const ids: string[] = [];

  const capped = limit ? values.slice(0, limit) : values;



  for (const value of capped) {

    const term = resolveCatalogTerm(catalog, type, value);

    if (!term) {

      warnings.push(

        `${label}: bỏ qua "${value}" — không khớp taxonomy (xem sheet taxonomy_reference).`

      );

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

  const blockingErrors: string[] = [];

  const warnings: string[] = [];

  const skippedFields: string[] = [];

  const prefix = `Dòng ${rowIndex}`;



  if (catalogError) {

    return {

      canImport: false,

      ok: false,

      blockingErrors: [`${prefix}: ${catalogError}`],

      errors: [`${prefix}: ${catalogError}`],

      warnings: [],

      skippedFields: [],

      termIds: [],

      presentationMode: null,

      hasContentWarning: false,

      contentWarningsConfirmed: true,

      contentOrigin: "original",

      originalLanguage: null,

      sourceUrl: null,

      translationType: "fan_translation",

      ageRatingSlug: null

    };

  }



  const hasTitle = Boolean(row.title?.trim());

  const hasStoryCode = Boolean(row.story_code?.trim());



  if (!hasTitle && !hasStoryCode) {

    blockingErrors.push(

      `${prefix}: cần title (tạo mới) hoặc story_code (cập nhật truyện có sẵn).`

    );

  }



  const termIds: string[] = [];

  let presentationMode: string | null = null;

  let ageRatingSlug: string | null = null;



  const contentType = row.content_type_slug?.trim()

    ? resolveCatalogTerm(catalog, "content_type", row.content_type_slug)

    : null;

  if (!row.content_type_slug?.trim()) {

    warnings.push(`${prefix}: thiếu content_type_slug — bỏ qua, bổ sung taxonomy sau trong Studio.`);

    skippedFields.push("content_type_slug");

  } else if (!contentType) {

    warnings.push(

      `${prefix}: content_type_slug không khớp — bỏ qua (vd: Truyện dài).`

    );

    skippedFields.push("content_type_slug");

  } else {

    termIds.push(contentType.id);

  }



  const mainGenre = row.main_genre_slug?.trim()

    ? resolveCatalogTerm(catalog, "main_genre", row.main_genre_slug)

    : null;

  if (!row.main_genre_slug?.trim()) {

    warnings.push(`${prefix}: thiếu main_genre_slug — bỏ qua, bổ sung sau trong Studio.`);

    skippedFields.push("main_genre_slug");

  } else if (!mainGenre) {

    warnings.push(`${prefix}: main_genre_slug không khớp — bỏ qua (vd: Ngôn tình).`);

    skippedFields.push("main_genre_slug");

  } else {

    termIds.push(mainGenre.id);

  }



  const ageRating = row.age_rating_slug?.trim()

    ? resolveCatalogTerm(catalog, "age_rating", row.age_rating_slug)

    : null;

  if (!row.age_rating_slug?.trim()) {

    warnings.push(`${prefix}: thiếu age_rating_slug — bỏ qua, mặc định all_ages.`);

    skippedFields.push("age_rating_slug");

  } else if (!ageRating) {

    warnings.push(`${prefix}: age_rating_slug không khớp — bỏ qua (vd: 13+).`);

    skippedFields.push("age_rating_slug");

  } else {

    termIds.push(ageRating.id);

    ageRatingSlug = ageRating.slug;

  }



  const presentationInput = row.presentation_mode?.trim() || "";

  const resolvedPresentation = presentationInput

    ? resolvePresentationModeInput(catalog, presentationInput)

    : null;

  if (!presentationInput) {

    warnings.push(`${prefix}: thiếu presentation_mode — bỏ qua, bổ sung sau trong Studio.`);

    skippedFields.push("presentation_mode");

  } else if (!resolvedPresentation) {

    warnings.push(

      `${prefix}: presentation_mode không khớp — bỏ qua (vd: Văn xuôi truyền thống).`

    );

    skippedFields.push("presentation_mode");

  } else {

    presentationMode = resolvedPresentation;

  }



  const hasCw = parseBool(row.has_content_warning);

  if (hasCw === null && row.has_content_warning?.trim()) {

    warnings.push(`${prefix}: has_content_warning không hợp lệ — bỏ qua (dùng true/false).`);

    skippedFields.push("has_content_warning");

  }



  const hasContentWarning = hasCw === true;

  const warningIds = resolveMulti(

    catalog,

    "content_warning",

    row.content_warning_slugs,

    "content_warning_slugs",

    warnings

  );



  if (hasContentWarning && warningIds.length === 0 && row.content_warning_slugs?.trim()) {

    warnings.push(`${prefix}: has_content_warning=true nhưng không có content_warning hợp lệ.`);

  }

  if (hasCw === false && warningIds.length > 0) {

    warnings.push(`${prefix}: has_content_warning=false — bỏ qua các content_warning_slugs.`);

  }



  for (const { field, type } of MULTI_SLUG_FIELDS) {

    if (type === "content_warning") continue;

    const ids = resolveMulti(catalog, type, row[field], String(field), warnings);

    termIds.push(...ids);

  }

  termIds.push(...(hasCw === false ? [] : warningIds));



  if (row.subgenre_slugs?.trim() && !mainGenre) {

    warnings.push(`${prefix}: subgenre bỏ qua vì main_genre chưa hợp lệ.`);

  }



  const originResolved = resolveImportContentOrigin(row.content_origin ?? "");

  if (originResolved.warning) {

    warnings.push(`${prefix}: ${originResolved.warning}`);

    if (row.content_origin?.trim()) skippedFields.push("content_origin");

  }



  const contentOrigin = originResolved.value;

  let originalLanguage: string | null = null;

  let sourceUrl: string | null = null;

  let translationType: TranslationType = "fan_translation";



  if (contentOrigin === "translation") {

    const languageResolved = resolveImportOriginalLanguage(row.original_language ?? "");

    originalLanguage = languageResolved.value;

    if (languageResolved.warning) {

      warnings.push(`${prefix}: ${languageResolved.warning}`);

      skippedFields.push("original_language");

    } else if (!row.original_language?.trim()) {

      warnings.push(

        `${prefix}: truyện dịch chưa có original_language — vẫn tạo nháp, bổ sung sau trong Studio.`

      );

    }



    const sourceUrlRaw = row.source_url?.trim() ?? "";

    if (!sourceUrlRaw) {

      warnings.push(

        `${prefix}: truyện dịch chưa có source_url — vẫn tạo nháp, bổ sung sau trong Studio.`

      );

    } else if (!isValidSourceUrl(sourceUrlRaw)) {

      warnings.push(`${prefix}: source_url không hợp lệ — bỏ qua. ${SOURCE_URL_VALIDATION_MESSAGE}`);

      skippedFields.push("source_url");

    } else {

      sourceUrl = sourceUrlRaw;

    }



    const typeResolved = resolveImportTranslationType(row.translation_type ?? "");

    translationType = typeResolved.value;

    if (typeResolved.warning) {

      warnings.push(`${prefix}: ${typeResolved.warning}`);

      skippedFields.push("translation_type");

    }

  }



  if (row.cover_url?.trim()) {
    if (shouldIngestExternalCoverUrl(row.cover_url)) {
      warnings.push(
        `${prefix}: ảnh bìa từ link ngoài — hệ thống sẽ tải về media ChapMee khi import.`
      );
    }
  }



  const canImport = blockingErrors.length === 0;



  return {

    canImport,

    ok: canImport && warnings.length === 0,

    blockingErrors,

    errors: blockingErrors,

    warnings,

    skippedFields,

    termIds: [...new Set(termIds)],

    presentationMode,

    hasContentWarning: hasCw === false ? false : hasContentWarning,

    contentWarningsConfirmed: true,

    contentOrigin,

    originalLanguage,

    sourceUrl,

    translationType,

    ageRatingSlug

  };

}



export {

  isChaptersImportV2Headers,

  isStoriesImportV2Headers

} from "@/lib/studio/import-v2-headers";


