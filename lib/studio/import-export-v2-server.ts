"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { persistStoryTaxonomyFromForm } from "@/lib/creator/persist-story-taxonomy";
import { normalizeHeader, exportRowsToCsv, parseCsv } from "@/lib/studio/csv";
import {
  buildChaptersTemplateCsv,
  buildInstructionsWithLabels,
  buildStoriesTemplateCsv,
  buildTaxonomyReferenceCsv,
  STUDIO_IMPORT_INSTRUCTIONS
} from "@/lib/studio/import-export-templates";
import {
  buildHeaderLabelRow,
  CHAPTERS_IMPORT_V2_HEADER_LABELS,
  STORIES_IMPORT_V2_HEADER_LABELS,
  TAXONOMY_REFERENCE_HEADER_LABELS
} from "@/lib/studio/import-v2-header-labels";
import {
  CHAPTERS_IMPORT_V2_HEADERS,
  STORIES_IMPORT_V2_HEADERS,
  STORIES_IMPORT_V2_ALL_FIELDS,
  CHAPTERS_IMPORT_V2_ALL_FIELDS,
  TAXONOMY_REFERENCE_HEADERS,
  type ChaptersImportV2Row,
  type StoriesImportV2Row,
  type StoryImportV2Validation
} from "@/types/studio-import-v2";
import { loadCreatorTaxonomyCatalog, resolveCatalogTerm } from "@/lib/studio/taxonomy-catalog";
import { isStoriesImportV2Headers, isChaptersImportV2Headers } from "@/lib/studio/import-v2-headers";
import { validateStoryImportV2Row } from "@/lib/studio/story-import-taxonomy";
import { studioPath } from "@/lib/studio/constants";
import { normalizeStoryStructureType } from "@/lib/stories/story-structure";
import { slugifyVietnamese } from "@/lib/seo/slugify-vi";
import { createClient } from "@/lib/data/server";
import { resolveStoryDisplayStatus } from "@/lib/studio/status-labels";
import { normalizeCreatorImportContentStatus, resolveChapterImportStatus } from "@/lib/studio/normalize-import-status";
import { getStoryTaxonomy } from "@/lib/taxonomy/story-taxonomy";
import { getExportScopedStoryIds } from "@/lib/studio/import-export-server";
import type { ExportScopeInput } from "@/types/studio-import";
import { generateNumericPublicCode } from "@/lib/urls/public-code";
import { resolveContentSlug } from "@/lib/urls/slug";
import { getChapterUrl } from "@/lib/urls/paths";
import { storyAgeRatingFromTaxonomySlug } from "@/lib/taxonomy/age-rating-map";
import { recordStudioImportExportJobAction } from "@/lib/studio/studio-import-export-jobs-actions";
import { isContentFormat, isPresentationMode } from "@/lib/presentation/constants";
import { buildPlainContentFallback } from "@/lib/presentation/plain-fallback-content";
import {
  parseStructuredContentJson,
  validateStructuredContentForImport
} from "@/lib/presentation/parse-structured";
import { applyEpisodeObjectStorageAfterSave } from "@/lib/chapters/apply-episode-object-storage-save";
import { resolveEffectivePresentationMode } from "@/lib/presentation/resolve-mode";
import { getStoryPresentationSettings } from "@/lib/taxonomy/presentation";
import { collectMediaIdsFromComposer } from "@/lib/composer/collect-media-ids";
import { runComposerImportValidation } from "@/lib/composer/publish-validation";
import { isComposerStructuredDocument } from "@/lib/composer/serializer";
import { resolveKnownComposerMediaIds } from "@/lib/composer/verify-composer-media";
import { assertCreatorOwnsStory } from "@/lib/auth/ownership";
import { upsertChapterMonetizationSetting } from "@/lib/data/chapter-monetization";
import {
  getStoryMonetizationSettings,
  upsertStoryMonetizationSettings
} from "@/lib/data/story-monetization";
import type { StoryAgeRating } from "@/types/moderation";
import { normalizeImportCell } from "@/lib/encoding/normalize-import-cell";
import { getStoryMonetizationCapabilities } from "@/lib/content-origin/content-origin-policy";
import {
  DEFAULT_TRANSLATED_LANGUAGE,
  resolveTranslationFormDefaults
} from "@/lib/creator/story-translation-defaults";
import { buildImportFieldValuesReferenceCsv } from "@/lib/studio/import-field-value-guide";
import { ingestImportStoryCoverFromUrl } from "@/lib/studio/ingest-import-cover-url";
import { resolveStoryCoverUrlsForExport } from "@/lib/studio/resolve-export-cover-url";

function buildStoryOriginFieldsFromImportRow(
  row: StoriesImportV2Row,
  validation: StoryImportV2Validation
): Record<string, unknown> {
  if (validation.contentOrigin !== "translation") {
    return { content_origin: "original" };
  }

  const translationDefaults = resolveTranslationFormDefaults({
    translationType: validation.translationType
  });
  const capabilities = getStoryMonetizationCapabilities({
    content_origin: "translation",
    monetization_policy: "free_only",
    rights_status: "pending_review"
  });

  return {
    content_origin: "translation",
    translation_type: validation.translationType,
    translated_language: DEFAULT_TRANSLATED_LANGUAGE,
    source_title: row.source_title?.trim() || null,
    source_author_name: row.source_author_name?.trim() || null,
    original_language: validation.originalLanguage,
    source_url: validation.sourceUrl,
    source_platform: translationDefaults.sourcePlatform,
    license_note: translationDefaults.licenseNote,
    license_document_media_id: translationDefaults.licenseDocumentMediaId,
    rights_status: "pending_review",
    monetization_policy: "free_only",
    must_be_free_to_read: capabilities.mustBeFreeToRead,
    can_sell_chapters: capabilities.canSellChapters,
    can_sell_story_bundle: capabilities.canSellStoryBundle,
    can_receive_tips: capabilities.canReceiveTips,
    can_share_ads_revenue: capabilities.canShareAdsRevenue,
    can_join_boost_campaign: capabilities.canJoinBoostCampaign
  };
}

function buildStoryPresentationFieldsFromImportRow(
  row: StoriesImportV2Row
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  if (row.hook?.trim()) patch.hook = row.hook.trim();
  if (row.long_description?.trim()) patch.long_description = row.long_description.trim();
  if (row.seo_title?.trim()) patch.seo_title = row.seo_title.trim();
  if (row.seo_description?.trim()) patch.seo_description = row.seo_description.trim();

  return patch;
}

function rowFromCsv(headers: string[], cells: string[]): StoriesImportV2Row {
  const map = new Map<string, string>();
  headers.forEach((h, i) =>
    map.set(normalizeHeader(h), normalizeImportCell(cells[i] ?? ""))
  );
  const row = {} as StoriesImportV2Row;
  for (const key of STORIES_IMPORT_V2_ALL_FIELDS) {
    row[key] = map.get(key) ?? "";
  }
  return row;
}

function exportImportV2Csv(
  headers: readonly string[],
  rows: Array<Record<string, string>>
): string {
  return exportRowsToCsv(
    [...headers],
    rows.map((row) => Object.fromEntries(headers.map((header) => [header, row[header] ?? ""])))
  );
}

function termsCsv(terms: Array<{ name: string }> | undefined) {
  return (terms ?? []).map((t) => t.name).join(", ");
}

function termCsvName(
  terms: Array<{ name: string }> | undefined
): string {
  return terms?.[0]?.name ?? "";
}

function parseLooseBool(value: string): boolean | null {
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "có", "co"].includes(v)) return true;
  if (["0", "false", "no", "không", "khong"].includes(v)) return false;
  return null;
}

async function applyStoryMonetizationFromImportRow(
  storyId: string,
  creatorUserId: string,
  row: StoriesImportV2Row
) {
  const hasMonetizationColumn =
    row.free_first_chapters_count?.trim() ||
    row.auto_pricing_enabled?.trim() ||
    row.auto_price_coin?.trim() ||
    row.full_access_enabled?.trim() ||
    row.full_access_price_coin?.trim() ||
    row.full_access_includes_future_chapters?.trim() ||
    row.default_new_chapter_price_coin?.trim() ||
    row.full_access_note?.trim();

  if (!hasMonetizationColumn) {
    return;
  }

  const patch: Partial<{
    free_first_chapters_count: number;
    auto_pricing_enabled: boolean;
    auto_price_coin: number | null;
    full_access_enabled: boolean;
    full_access_price_coin: number | null;
    full_access_includes_future_chapters: boolean;
    default_new_chapter_price_coin: number | null;
    full_access_note: string | null;
  }> = {};

  if (row.free_first_chapters_count?.trim()) {
    const count = Number.parseInt(row.free_first_chapters_count, 10);
    if (Number.isFinite(count) && count >= 0) {
      patch.free_first_chapters_count = count;
    }
  }

  if (row.auto_pricing_enabled?.trim()) {
    const enabled = parseLooseBool(row.auto_pricing_enabled);
    if (enabled !== null) {
      patch.auto_pricing_enabled = enabled;
    }
  }

  if (row.auto_price_coin?.trim()) {
    const price = Number.parseInt(row.auto_price_coin, 10);
    if (Number.isFinite(price) && price > 0) {
      patch.auto_price_coin = price;
    }
  }

  if (row.full_access_enabled?.trim()) {
    const enabled = parseLooseBool(row.full_access_enabled);
    if (enabled !== null) {
      patch.full_access_enabled = enabled;
    }
  }

  if (row.full_access_price_coin?.trim()) {
    const price = Number.parseInt(row.full_access_price_coin, 10);
    if (Number.isFinite(price) && price > 0) {
      patch.full_access_price_coin = price;
    }
  }

  if (row.full_access_includes_future_chapters?.trim()) {
    const includes = parseLooseBool(row.full_access_includes_future_chapters);
    if (includes !== null) {
      patch.full_access_includes_future_chapters = includes;
    }
  }

  if (row.default_new_chapter_price_coin?.trim()) {
    const price = Number.parseInt(row.default_new_chapter_price_coin, 10);
    if (Number.isFinite(price) && price > 0) {
      patch.default_new_chapter_price_coin = price;
    }
  }

  if (row.full_access_note?.trim()) {
    patch.full_access_note = row.full_access_note.trim().slice(0, 500);
  }

  if (Object.keys(patch).length === 0) {
    return;
  }

  const existing = await getStoryMonetizationSettings(storyId);

  await upsertStoryMonetizationSettings({
    story_id: storyId,
    creator_user_id: creatorUserId,
    free_first_chapters_count:
      patch.free_first_chapters_count ??
      existing.data?.free_first_chapters_count ??
      0,
    auto_pricing_enabled:
      patch.auto_pricing_enabled ?? existing.data?.auto_pricing_enabled ?? false,
    auto_price_coin: patch.auto_price_coin ?? existing.data?.auto_price_coin ?? null,
    full_access_enabled:
      patch.full_access_enabled ?? existing.data?.full_access_enabled ?? false,
    full_access_price_coin:
      patch.full_access_price_coin ?? existing.data?.full_access_price_coin ?? null,
    full_access_includes_future_chapters:
      patch.full_access_includes_future_chapters ??
      existing.data?.full_access_includes_future_chapters ??
      true,
    default_new_chapter_price_coin:
      patch.default_new_chapter_price_coin ??
      existing.data?.default_new_chapter_price_coin ??
      null,
    full_access_note:
      patch.full_access_note ?? existing.data?.full_access_note ?? null
  });
}

async function applyImportStoryCoverFromRow(
  db: Awaited<ReturnType<typeof createClient>>,
  storyId: string,
  row: StoriesImportV2Row,
  rowIndex: number
): Promise<string | null> {
  const raw = row.cover_url?.trim();
  if (!raw) {
    return null;
  }

  const result = await ingestImportStoryCoverFromUrl(db, storyId, raw);
  if (result.ok) {
    return null;
  }

  return `Dòng ${rowIndex}: ${result.warning}`;
}

async function applyChapterMonetizationFromImportRow(input: {
  chapterId: string;
  storyId: string;
  creatorUserId: string;
  priceCoin: string;
  isFree: string;
}) {
  const priceRaw = input.priceCoin.trim();
  const freeRaw = input.isFree.trim();

  if (!priceRaw && !freeRaw) {
    return;
  }

  let isPaid = false;
  let coinPrice: number | null = null;

  if (priceRaw) {
    const price = Number.parseInt(priceRaw, 10);
    if (Number.isFinite(price) && price > 0) {
      isPaid = true;
      coinPrice = price;
    }
  } else {
    const isFree = parseLooseBool(freeRaw);
    if (isFree === false) {
      isPaid = true;
      coinPrice = 10;
    }
  }

  await upsertChapterMonetizationSetting({
    chapterId: input.chapterId,
    storyId: input.storyId,
    creatorUserId: input.creatorUserId,
    isPaid,
    coinPrice,
    freePreviewEnabled: false,
    freePreviewPercent: null,
    freePreviewChars: null,
    pricingSource: isPaid ? "paid_manual" : "free_manual",
    monetizationOverride: true
  });
}

function headerLabelsForTemplateCsv(fileName: string): string[] | undefined {
  if (/^stories(-|$)/i.test(fileName)) {
    return buildHeaderLabelRow(STORIES_IMPORT_V2_HEADERS, STORIES_IMPORT_V2_HEADER_LABELS);
  }
  if (/^chapters/i.test(fileName)) {
    return buildHeaderLabelRow(CHAPTERS_IMPORT_V2_HEADERS, CHAPTERS_IMPORT_V2_HEADER_LABELS);
  }
  if (/^taxonomy_reference/i.test(fileName)) {
    return buildHeaderLabelRow(TAXONOMY_REFERENCE_HEADERS, TAXONOMY_REFERENCE_HEADER_LABELS);
  }
  if (/^field_values_reference/i.test(fileName)) {
    return [
      "Cột kỹ thuật",
      "Giá trị ghi vào Excel",
      "Nhãn tiếng Việt",
      "Ý nghĩa",
      "Các cách ghi khác"
    ];
  }
  return undefined;
}

export async function downloadStudioImportTemplatesAction(mode: "create" | "update") {
  const creatorState = await getCurrentCreatorProfile();
  if (!creatorState.creatorProfile) {
    return { error: "Cần đăng nhập Studio.", files: [] as Array<{ name: string; content: string }> };
  }

  const { catalog } = await loadCreatorTaxonomyCatalog();

  return {
    error: null,
    files: [
      { name: `stories-${mode}.csv`, content: buildStoriesTemplateCsv(mode) },
      { name: "chapters.csv", content: buildChaptersTemplateCsv() },
      { name: "taxonomy_reference.csv", content: buildTaxonomyReferenceCsv(catalog) },
      { name: "field_values_reference.csv", content: buildImportFieldValuesReferenceCsv() },
      { name: "instructions.txt", content: buildInstructionsWithLabels() }
    ]
  };
}

export async function downloadStudioImportTemplatesZipAction(mode: "create" | "update") {
  const pack = await downloadStudioImportTemplatesAction(mode);
  if (pack.error) {
    return { error: pack.error, fileName: null as string | null, zipBase64: null as string | null };
  }

  const { buildZipFromTextFiles, zipToBase64 } = await import("@/lib/studio/build-import-zip");
  const zip = buildZipFromTextFiles(pack.files);

  return {
    error: null,
    fileName: `chapmee-import-templates-${mode}.zip`,
    zipBase64: zipToBase64(zip)
  };
}

export async function fetchImportExportBundleZipAction(scope: ExportScopeInput) {
  const creatorState = await getCurrentCreatorProfile();
  if (!creatorState.creatorProfile) {
    return { error: "Cần đăng nhập.", fileName: null as string | null, zipBase64: null as string | null };
  }

  const storyIds = await getExportScopedStoryIds(creatorState.creatorProfile, scope);
  if (storyIds.length === 0) {
    return {
      error: "Không có truyện trong phạm vi đã chọn.",
      fileName: null,
      zipBase64: null
    };
  }

  const [storiesExport, chaptersExport, catalogResult] = await Promise.all([
    fetchStoriesExportV2Action(storyIds),
    fetchChaptersExportV2Action(scope),
    loadCreatorTaxonomyCatalog()
  ]);

  if (storiesExport.error || chaptersExport.error) {
    return {
      error: storiesExport.error ?? chaptersExport.error ?? "Không xuất được gói ZIP.",
      fileName: null,
      zipBase64: null
    };
  }

  const { buildZipFromTextFiles, zipToBase64 } = await import("@/lib/studio/build-import-zip");
  const zip = buildZipFromTextFiles([
    { name: "stories.csv", content: storiesExport.csv },
    { name: "chapters.csv", content: chaptersExport.csv },
    {
      name: "taxonomy_reference.csv",
      content: buildTaxonomyReferenceCsv(catalogResult.catalog)
    },
    { name: "instructions.txt", content: buildInstructionsWithLabels() }
  ]);

  await recordStudioImportExportJobAction({
    jobType: "export_stories",
    fileName: `studio-export-bundle-${storyIds.length}.zip`,
    totalRows: storyIds.length,
    successRows: storyIds.length,
    errorRows: 0
  });

  return {
    error: null,
    fileName: `chapmee-export-${new Date().toISOString().slice(0, 10)}.zip`,
    zipBase64: zipToBase64(zip)
  };
}

export async function fetchImportExportBundleXlsxAction(scope: ExportScopeInput) {
  const creatorState = await getCurrentCreatorProfile();
  if (!creatorState.creatorProfile) {
    return { error: "Cần đăng nhập.", fileName: null, xlsxBase64: null };
  }

  const storyIds = await getExportScopedStoryIds(creatorState.creatorProfile, scope);
  const [storiesExport, chaptersExport, catalogResult] = await Promise.all([
    fetchStoriesExportV2Action(storyIds),
    fetchChaptersExportV2Action(scope),
    loadCreatorTaxonomyCatalog()
  ]);

  if (storiesExport.error || chaptersExport.error) {
    return {
      error: storiesExport.error ?? chaptersExport.error ?? "Không xuất được XLSX.",
      fileName: null,
      xlsxBase64: null
    };
  }

  const { buildWorkbookBase64 } = await import("@/lib/studio/build-import-xlsx");
  const xlsxBase64 = buildWorkbookBase64([
    { name: "stories", csv: storiesExport.csv, headerLabels: buildHeaderLabelRow(STORIES_IMPORT_V2_HEADERS, STORIES_IMPORT_V2_HEADER_LABELS) },
    { name: "chapters", csv: chaptersExport.csv, headerLabels: buildHeaderLabelRow(CHAPTERS_IMPORT_V2_HEADERS, CHAPTERS_IMPORT_V2_HEADER_LABELS) },
    {
      name: "taxonomy_reference",
      csv: buildTaxonomyReferenceCsv(catalogResult.catalog),
      headerLabels: buildHeaderLabelRow(
        TAXONOMY_REFERENCE_HEADERS,
        TAXONOMY_REFERENCE_HEADER_LABELS
      )
    }
  ]);

  return {
    error: null,
    fileName: `chapmee-export-${new Date().toISOString().slice(0, 10)}.xlsx`,
    xlsxBase64
  };
}

export async function downloadStudioImportTemplatesXlsxAction(mode: "create" | "update") {
  const pack = await downloadStudioImportTemplatesAction(mode);
  if (pack.error) {
    return { error: pack.error, fileName: null as string | null, xlsxBase64: null as string | null };
  }

  const { buildWorkbookBase64 } = await import("@/lib/studio/build-import-xlsx");
  const instructionLines = STUDIO_IMPORT_INSTRUCTIONS.split("\n").map((line) => [line]);
  const xlsxBase64 = buildWorkbookBase64([
    ...pack.files
      .filter((file) => file.name.endsWith(".csv"))
      .map((file) => ({
        name: file.name.replace(/\.csv$/i, ""),
        csv: file.content,
        headerLabels: headerLabelsForTemplateCsv(file.name)
      })),
    {
      name: "instructions",
      csv: ["line", ...instructionLines.map((row) => row[0] ?? "")].join("\n")
    }
  ]);

  return {
    error: null,
    fileName: `chapmee-import-templates-${mode}.xlsx`,
    xlsxBase64
  };
}

export async function fetchStoriesExportV2ByScopeAction(scope: ExportScopeInput) {
  const creatorState = await getCurrentCreatorProfile();
  if (!creatorState.creatorProfile) {
    return { error: "Cần đăng nhập.", csv: "" };
  }

  const storyIds = await getExportScopedStoryIds(creatorState.creatorProfile, scope);
  if (storyIds.length === 0) {
    return { error: "Không có truyện trong phạm vi đã chọn.", csv: "" };
  }

  return fetchStoriesExportV2Action(storyIds);
}

function parseImportV2CsvText(csvText: string): {
  headers: string[];
  rows: string[][];
  error?: string;
} {
  const trimmed = csvText.trim();
  if (!trimmed) {
    return { headers: [], rows: [], error: "File CSV trống." };
  }

  const parsed = parseCsv(trimmed);
  if (parsed.headers.length === 0) {
    return { headers: [], rows: [], error: "Không đọc được header CSV." };
  }

  return parsed;
}

export async function previewStoriesImportV2Action(input: { csvText: string }) {
  const parsed = parseImportV2CsvText(input.csvText);
  if (parsed.error) {
    return { error: parsed.error, rows: [] };
  }

  const { headers, rows } = parsed;

  if (!isStoriesImportV2Headers(headers)) {
    return { error: "Header không phải định dạng truyện v2.", rows: [] };
  }

  const { catalog } = await loadCreatorTaxonomyCatalog();
  const previewRows = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rowFromCsv(headers, rows[index]);
    const validation = await validateStoryImportV2Row(row, index + 2, catalog);
    const status = !validation.canImport
      ? ("error" as const)
      : validation.warnings.length > 0
        ? ("warning" as const)
        : ("valid" as const);
    previewRows.push({
      rowIndex: index + 2,
      data: row,
      status,
      messages: [...validation.blockingErrors, ...validation.warnings]
    });
  }

  return { error: null, rows: previewRows };
}

export async function executeStoriesImportV2Action(input: {
  csvText: string;
  skipInvalid?: boolean;
}) {
  const parsed = parseImportV2CsvText(input.csvText);
  if (parsed.error) {
    return { error: parsed.error, created: 0, updated: 0, errors: [] };
  }

  const { headers, rows } = parsed;

  if (!isStoriesImportV2Headers(headers)) {
    return {
      error: "Header không phải định dạng truyện v2.",
      created: 0,
      updated: 0,
      errors: []
    };
  }

  const creatorState = await getCurrentCreatorProfile();
  if (!creatorState.creatorProfile) {
    return { error: "Cần đăng nhập Studio.", created: 0, updated: 0, errors: [] };
  }

  const db = await createClient();
  const { catalog } = await loadCreatorTaxonomyCatalog();
  const errors: Array<{ rowIndex: number; message: string }> = [];
  const rowIssues: Array<{ rowIndex: number; storyId?: string; messages: string[] }> = [];
  const importedStoryIds: string[] = [];
  let created = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rowFromCsv(headers, rows[i]);
    const rowIndex = i + 2;
    const validation = await validateStoryImportV2Row(row, rowIndex, catalog);

    if (!validation.canImport) {
      for (const message of validation.blockingErrors) {
        errors.push({ rowIndex, message });
      }
      rowIssues.push({ rowIndex, messages: validation.blockingErrors });
      continue;
    }

    if (validation.warnings.length > 0) {
      rowIssues.push({ rowIndex, messages: validation.warnings });
    }

    let storyId: string | null = null;

    if (row.story_code?.trim()) {
      const { data } = await db
        .from("stories")
        .select("id")
        .eq("public_code", row.story_code.trim())
        .eq("creator_id", creatorState.creatorProfile.id)
        .maybeSingle();
      storyId = data?.id ? String(data.id) : null;
      if (!storyId) {
        errors.push({ rowIndex, message: "story_code không thuộc tài khoản bạn." });
        continue;
      }
    }

    if (storyId) {
      try {
        await assertCreatorOwnsStory(creatorState.creatorProfile, storyId);
      } catch {
        errors.push({ rowIndex, message: "story_code không thuộc tài khoản bạn." });
        continue;
      }
    }

    const isUpdate = Boolean(storyId);

    const structureType = normalizeStoryStructureType(row.story_structure_type?.trim());

    if (!isUpdate) {
      const slug =
        row.slug?.trim() ||
        `${slugifyVietnamese(row.title.trim())}-${Date.now().toString(36)}`;
      const publicCode = await generateNumericPublicCode(db, "story");
      const insertPayload: Record<string, unknown> = {
        creator_id: creatorState.creatorProfile.id,
        owner_user_id: creatorState.creatorProfile.user_id,
        title: row.title.trim(),
        slug,
        public_code: publicCode,
        short_description: row.description?.trim() || null,
        status: "draft",
        visibility: "private",
        is_completed: row.is_completed?.toLowerCase() === "true",
        content_warnings_confirmed: true,
        structure_type: structureType,
        content_format: row.content_format?.trim() || null,
        ...buildStoryOriginFieldsFromImportRow(row, validation),
        ...buildStoryPresentationFieldsFromImportRow(row)
      };

      if (structureType === "standalone") {
        insertPayload.standalone_plain_text = row.standalone_content?.trim() || null;
        if (row.standalone_content_json?.trim()) {
          try {
            insertPayload.standalone_content_json = JSON.parse(
              row.standalone_content_json.trim()
            );
          } catch {
            rowIssues.push({
              rowIndex,
              messages: ["standalone_content_json không hợp lệ — bỏ qua, vẫn tạo nháp."]
            });
          }
        }
      }

      const { data: inserted, error: insertError } = await db
        .from("stories")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertError || !inserted) {
        errors.push({
          rowIndex,
          message: insertError?.message ?? "Không tạo được truyện."
        });
        continue;
      }
      storyId = String(inserted.id);
      created += 1;
    } else {
      const patch: Record<string, unknown> = {};
      if (row.title?.trim()) patch.title = row.title.trim();
      if (row.description?.trim()) patch.short_description = row.description.trim();
      if (row.is_completed?.trim()) {
        patch.is_completed = row.is_completed.toLowerCase() === "true";
      }
      if (row.story_structure_type?.trim()) {
        patch.structure_type = structureType;
      }
      if (row.content_format?.trim()) {
        patch.content_format = row.content_format.trim();
      }
      if (
        row.content_origin?.trim() ||
        row.original_language?.trim() ||
        row.source_url?.trim() ||
        row.translation_type?.trim() ||
        validation.contentOrigin === "translation"
      ) {
        Object.assign(patch, buildStoryOriginFieldsFromImportRow(row, validation));
      }
      Object.assign(patch, buildStoryPresentationFieldsFromImportRow(row));
      if (structureType === "standalone") {
        if (row.standalone_content?.trim()) {
          patch.standalone_plain_text = row.standalone_content.trim();
        }
        if (row.standalone_content_json?.trim()) {
          try {
            patch.standalone_content_json = JSON.parse(row.standalone_content_json.trim());
          } catch {
            rowIssues.push({
              rowIndex,
              storyId: storyId ?? undefined,
              messages: ["standalone_content_json không hợp lệ — bỏ qua."]
            });
          }
        }
      }
      if (Object.keys(patch).length > 0) {
        await db.from("stories").update(patch).eq("id", storyId);
      }
      updated += 1;
    }

    const coverWarning = await applyImportStoryCoverFromRow(db, storyId!, row, rowIndex);
    if (coverWarning) {
      rowIssues.push({
        rowIndex,
        storyId: storyId ?? undefined,
        messages: [coverWarning]
      });
    }

    const ageRating = storyAgeRatingFromTaxonomySlug(
      validation.ageRatingSlug ?? row.age_rating_slug ?? ""
    );

    if (validation.termIds.length > 0 || validation.presentationMode) {
      const persist = await persistStoryTaxonomyFromForm(db, storyId!, {
        taxonomyTermIds: validation.termIds,
        presentationMode: validation.presentationMode,
        contentWarningsConfirmed: validation.contentWarningsConfirmed,
        ageRating
      });

      await db.from("stories").update({ age_rating: ageRating }).eq("id", storyId);

      if (!persist.ok) {
        errors.push({ rowIndex, message: persist.error ?? "Lỗi taxonomy." });
        rowIssues.push({
          rowIndex,
          storyId: storyId ?? undefined,
          messages: [persist.error ?? "Lỗi taxonomy."]
        });
      } else {
        if (storyId) {
          importedStoryIds.push(storyId);
        }
        try {
          await applyStoryMonetizationFromImportRow(
            storyId!,
            creatorState.creatorProfile.user_id,
            row
          );
        } catch (monetizationError) {
          errors.push({
            rowIndex,
            message:
              monetizationError instanceof Error
                ? monetizationError.message
                : "Lỗi monetization truyện."
          });
        }
      }
    } else {
      await db.from("stories").update({ age_rating: ageRating }).eq("id", storyId);
      if (storyId) {
        importedStoryIds.push(storyId);
      }
      try {
        await applyStoryMonetizationFromImportRow(
          storyId!,
          creatorState.creatorProfile.user_id,
          row
        );
      } catch (monetizationError) {
        errors.push({
          rowIndex,
          message:
            monetizationError instanceof Error
              ? monetizationError.message
              : "Lỗi monetization truyện."
        });
      }
    }
  }

  revalidatePath(studioPath("/stories"));
  revalidatePath(studioPath("/import"));

  const jobResult = await recordStudioImportExportJobAction({
    jobType: "import_stories",
    fileName: "stories-import-v2.csv",
    totalRows: rows.length,
    successRows: created + updated,
    errorRows: errors.length,
    errorSummary: errors.length ? { sample: errors.slice(0, 5) } : {}
  });

  if (jobResult.jobId && importedStoryIds.length > 0) {
    try {
      const { createAdminClient } = await import("@/lib/data/admin");
      const { recordImportBatchTaxonomyFlags } = await import(
        "@/lib/content-taxonomy-quality/import-flags"
      );
      await recordImportBatchTaxonomyFlags(createAdminClient(), {
        jobId: jobResult.jobId,
        rowIssues,
        importedStoryIds: [...new Set(importedStoryIds)]
      });
    } catch {
      // Bảng taxonomy quality có thể chưa migrate trên môi trường dev cũ
    }
  }

  return {
    error: errors.length && !input.skipInvalid ? errors[0]?.message : null,
    created,
    updated,
    errors
  };
}

export async function fetchStoriesExportV2Action(storyIds: string[]) {
  const creatorState = await getCurrentCreatorProfile();
  if (!creatorState.creatorProfile) {
    return { error: "Cần đăng nhập.", csv: "" };
  }

  if (storyIds.length === 0) {
    return { error: "Không có truyện để xuất.", csv: "" };
  }

  const db = await createClient();
  const { data: stories, error } = await db
    .from("stories")
    .select(
      "id, title, slug, public_code, hook, short_description, long_description, cover_url, seo_title, seo_description, content_origin, translation_type, source_title, source_author_name, original_language, source_url, status, visibility, is_completed, content_warnings_confirmed, structure_type, content_format, standalone_plain_text, standalone_content_json"
    )
    .eq("creator_id", creatorState.creatorProfile.id)
    .in("id", storyIds);

  if (error) {
    return { error: error.message, csv: "" };
  }

  const storyIdList = (stories ?? []).map((s) => String(s.id));
  const exportCoverUrls = await resolveStoryCoverUrlsForExport(db, stories ?? []);
  const { data: monetizationRows } =
    storyIdList.length > 0
      ? await db
          .from("story_monetization_settings")
          .select(
            "story_id, free_first_chapters_count, auto_pricing_enabled, auto_price_coin, full_access_enabled, full_access_price_coin, full_access_includes_future_chapters, default_new_chapter_price_coin, full_access_note"
          )
          .in("story_id", storyIdList)
      : { data: [] };

  const monetizationByStory = new Map(
    (monetizationRows ?? []).map((row) => [String(row.story_id), row])
  );

  const { catalog } = await loadCreatorTaxonomyCatalog();

  const exportRows: Array<Record<string, string>> = [];

  for (const story of stories ?? []) {
    const taxonomy = await getStoryTaxonomy(String(story.id));
    const byType = taxonomy.data;
    const presentation = await db
      .from("story_presentation_settings")
      .select("mode")
      .eq("story_id", story.id)
      .maybeSingle();

    const warnings = byType.content_warning ?? [];
    const monetization = monetizationByStory.get(String(story.id));
    const row: StoriesImportV2Row = {
      external_key: String(story.id).slice(0, 8),
      story_code: String(story.public_code ?? ""),
      story_structure_type: String(
        (story as { structure_type?: string }).structure_type ?? "chaptered"
      ),
      content_format: String((story as { content_format?: string | null }).content_format ?? ""),
      title: String(story.title),
      slug: String(story.slug),
      hook: String((story as { hook?: string | null }).hook ?? ""),
      description: String(story.short_description ?? ""),
      long_description: String(
        (story as { long_description?: string | null }).long_description ?? ""
      ),
      cover_url: exportCoverUrls.get(String(story.id)) ?? "",
      seo_title: String((story as { seo_title?: string | null }).seo_title ?? ""),
      seo_description: String(
        (story as { seo_description?: string | null }).seo_description ?? ""
      ),
      content_origin: String(
        (story as { content_origin?: string | null }).content_origin ?? "original"
      ),
      source_title: String(
        (story as { source_title?: string | null }).source_title ?? ""
      ),
      source_author_name: String(
        (story as { source_author_name?: string | null }).source_author_name ?? ""
      ),
      original_language: String(
        (story as { original_language?: string | null }).original_language ?? ""
      ),
      source_url: String((story as { source_url?: string | null }).source_url ?? ""),
      translation_type: String(
        (story as { translation_type?: string | null }).translation_type ?? ""
      ),
      content_type_slug: termCsvName(byType.content_type),
      main_genre_slug: termCsvName(byType.main_genre),
      subgenre_slugs: termsCsv(byType.subgenre),
      trope_tag_slugs: termsCsv(byType.trope_tag),
      setting_tag_slugs: termsCsv(byType.setting_tag),
      character_tag_slugs: termsCsv(byType.character_tag),
      relationship_tag_slugs: termsCsv(byType.relationship_tag),
      narrative_style_slugs: termsCsv(byType.narrative_style),
      reader_experience_slugs: termsCsv(byType.reader_experience),
      presentation_mode: (() => {
        const slug = String(presentation.data?.mode ?? "standard_prose");
        const term = resolveCatalogTerm(catalog, "presentation_mode", slug);
        return term?.name ?? slug;
      })(),
      age_rating_slug: termCsvName(byType.age_rating),
      has_content_warning: warnings.length > 0 ? "true" : "false",
      content_warning_slugs: termsCsv(byType.content_warning),
      status: resolveStoryDisplayStatus({
        isCompleted: Boolean(story.is_completed),
        status: story.status as "draft",
        visibility: story.visibility as "public"
      }),
      publish_at: "",
      is_completed: story.is_completed ? "true" : "false",
      free_first_chapters_count: monetization
        ? String(monetization.free_first_chapters_count ?? "")
        : "",
      auto_pricing_enabled: monetization
        ? monetization.auto_pricing_enabled
          ? "true"
          : "false"
        : "",
      auto_price_coin:
        monetization?.auto_price_coin != null
          ? String(monetization.auto_price_coin)
          : "",
      full_access_enabled: monetization
        ? monetization.full_access_enabled
          ? "true"
          : "false"
        : "",
      full_access_price_coin:
        monetization?.full_access_price_coin != null
          ? String(monetization.full_access_price_coin)
          : "",
      full_access_includes_future_chapters: monetization
        ? monetization.full_access_includes_future_chapters
          ? "true"
          : "false"
        : "",
      default_new_chapter_price_coin:
        monetization?.default_new_chapter_price_coin != null
          ? String(monetization.default_new_chapter_price_coin)
          : "",
      full_access_note: monetization?.full_access_note
        ? String(monetization.full_access_note)
        : "",
      standalone_content: String(
        (story as { standalone_plain_text?: string | null }).standalone_plain_text ?? ""
      ),
      standalone_content_json: (story as { standalone_content_json?: unknown | null })
        .standalone_content_json
        ? JSON.stringify(
            (story as { standalone_content_json?: unknown }).standalone_content_json
          )
        : "",
      standalone_price:
        monetization?.full_access_price_coin != null
          ? String(monetization.full_access_price_coin)
          : ""
    };

    exportRows.push(row);
  }

  const csv = exportImportV2Csv(STORIES_IMPORT_V2_HEADERS, exportRows);

  await recordStudioImportExportJobAction({
    jobType: "export_stories",
    fileName: `taxonomy-export-${storyIds.length}.csv`,
    totalRows: (stories ?? []).length,
    successRows: (stories ?? []).length,
    errorRows: 0
  });

  return { error: null, csv };
}

export async function fetchChaptersExportV2Action(scope: ExportScopeInput) {
  const creatorState = await getCurrentCreatorProfile();
  if (!creatorState.creatorProfile) {
    return { error: "Cần đăng nhập.", csv: "" };
  }

  const storyIds = await getExportScopedStoryIds(creatorState.creatorProfile, scope);
  if (storyIds.length === 0) {
    return { error: "Không có truyện trong phạm vi đã chọn.", csv: "" };
  }

  const db = await createClient();
  const { data: stories, error: storiesError } = await db
    .from("stories")
    .select("id, public_code")
    .eq("creator_id", creatorState.creatorProfile.id)
    .in("id", storyIds);

  if (storiesError) {
    return { error: storiesError.message, csv: "" };
  }

  const storyCodeById = new Map(
    (stories ?? []).map((s) => [String(s.id), String(s.public_code ?? "")])
  );

  const { data: episodes, error: episodesError } = await db
    .from("episodes")
    .select(
      "id, story_id, public_code, episode_number, title, slug, content, status, published_at, presentation_mode, structured_content, content_format, validation_status"
    )
    .in("story_id", storyIds)
    .order("episode_number", { ascending: true });

  if (episodesError) {
    return { error: episodesError.message, csv: "" };
  }

  const episodeIds = (episodes ?? []).map((ep) => String(ep.id));
  const { data: chapterMonetization } =
    episodeIds.length > 0
      ? await db
          .from("chapter_monetization_settings")
          .select("chapter_id, is_paid, coin_price")
          .in("chapter_id", episodeIds)
      : { data: [] };

  const monetizationByChapter = new Map(
    (chapterMonetization ?? []).map((row) => [String(row.chapter_id), row])
  );

  const exportRows: Array<Record<string, string>> = [];

  for (const episode of episodes ?? []) {
    const storyId = String(episode.story_id);
    const monetization = monetizationByChapter.get(String(episode.id));
    const isPaid = Boolean(monetization?.is_paid);
    const row: ChaptersImportV2Row = {
      external_key: String(episode.id).slice(0, 8),
      story_external_key: storyId.slice(0, 8),
      story_code: storyCodeById.get(storyId) ?? "",
      chapter_code: String(episode.public_code ?? ""),
      chapter_order: String(episode.episode_number ?? ""),
      title: String(episode.title ?? ""),
      slug: String(episode.slug ?? ""),
      content: String(episode.content ?? ""),
      content_format: String(episode.content_format ?? "plain_text"),
      structured_content_json: episode.structured_content
        ? JSON.stringify(episode.structured_content)
        : "",
      validation_status: String(episode.validation_status ?? ""),
      presentation_mode: String(episode.presentation_mode ?? ""),
      status: String(episode.status ?? "draft"),
      publish_at: episode.published_at ? String(episode.published_at) : "",
      price_coin:
        isPaid && monetization?.coin_price != null
          ? String(monetization.coin_price)
          : "",
      is_free: isPaid ? "false" : "true"
    };
    exportRows.push(row);
  }

  const csv = exportImportV2Csv(CHAPTERS_IMPORT_V2_HEADERS, exportRows);

  await recordStudioImportExportJobAction({
    jobType: "export_stories",
    fileName: `chapters-export-v2-${(episodes ?? []).length}.csv`,
    totalRows: (episodes ?? []).length,
    successRows: (episodes ?? []).length,
    errorRows: 0
  });

  return { error: null, csv };
}

function chapterRowFromCsv(headers: string[], cells: string[]) {
  const map = new Map<string, string>();
  headers.forEach((h, i) =>
    map.set(normalizeHeader(h), normalizeImportCell(cells[i] ?? ""))
  );
  const row = {} as ChaptersImportV2Row;
  for (const key of CHAPTERS_IMPORT_V2_ALL_FIELDS) {
    row[key] = map.get(key) ?? (key === "status" ? "draft" : "");
  }
  return row;
}

export async function executeChaptersImportV2Action(input: { csvText: string }) {
  const parsed = parseImportV2CsvText(input.csvText);
  if (parsed.error) {
    return { error: parsed.error, created: 0, updated: 0, errors: [] };
  }

  const { headers, rows } = parsed;

  if (!isChaptersImportV2Headers(headers)) {
    return {
      error: "Header không phải định dạng chương v2.",
      created: 0,
      updated: 0,
      errors: []
    };
  }

  const creatorState = await getCurrentCreatorProfile();
  if (!creatorState.creatorProfile) {
    return { error: "Chưa đăng nhập.", created: 0, updated: 0, errors: [] };
  }

  const db = await createClient();
  const errors: Array<{ rowIndex: number; message: string }> = [];
  let created = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = chapterRowFromCsv(headers, rows[i]);
    const rowIndex = i + 2;

    if (!row.story_code?.trim()) {
      errors.push({ rowIndex, message: "story_code bắt buộc." });
      continue;
    }
    if (!row.chapter_order?.trim()) {
      errors.push({ rowIndex, message: "chapter_order bắt buộc." });
      continue;
    }

    const { data: story } = await db
      .from("stories")
      .select("id, slug, public_code")
      .eq("public_code", row.story_code.trim())
      .eq("creator_id", creatorState.creatorProfile.id)
      .maybeSingle();

    if (!story?.id) {
      errors.push({ rowIndex, message: "story_code không thuộc tài khoản bạn." });
      continue;
    }

    const storyId = String(story.id);
    const storySlug = String(story.slug ?? "");
    const storyPublicCode = String(story.public_code ?? "");

    try {
      await assertCreatorOwnsStory(creatorState.creatorProfile, storyId);
    } catch {
      errors.push({ rowIndex, message: "story_code không thuộc tài khoản bạn." });
      continue;
    }

    const episodeNumber = Number.parseInt(row.chapter_order, 10);
    if (!Number.isFinite(episodeNumber) || episodeNumber < 1) {
      errors.push({ rowIndex, message: "chapter_order không hợp lệ." });
      continue;
    }

    let chapterId: string | null = null;

    if (row.chapter_code?.trim()) {
      const { data: ep } = await db
        .from("episodes")
        .select("id")
        .eq("public_code", row.chapter_code.trim())
        .eq("story_id", storyId)
        .maybeSingle();
      chapterId = ep?.id ? String(ep.id) : null;
      if (!chapterId) {
        errors.push({
          rowIndex,
          message: "chapter_code không thuộc story_code của bạn."
        });
        continue;
      }
    }

    if (!chapterId) {
      const { data: byOrder } = await db
        .from("episodes")
        .select("id")
        .eq("story_id", storyId)
        .eq("episode_number", episodeNumber)
        .maybeSingle();
      chapterId = byOrder?.id ? String(byOrder.id) : null;
    }

    const title = row.title.trim() || `Chương ${episodeNumber}`;
    let content = (row.content ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    const presentationSettings = await getStoryPresentationSettings(storyId);
    const chapterPresentationMode = row.presentation_mode?.trim() || null;
    if (chapterPresentationMode && !isPresentationMode(chapterPresentationMode)) {
      errors.push({ rowIndex, message: "presentation_mode không hợp lệ." });
      continue;
    }

    const effectiveMode = resolveEffectivePresentationMode({
      chapterMode: chapterPresentationMode,
      storyMode: presentationSettings.data?.mode ?? null
    });

    const structuredJson = row.structured_content_json?.trim() ?? "";
    if (structuredJson) {
      const validation = validateStructuredContentForImport(
        effectiveMode,
        structuredJson
      );
      if (!validation.ok) {
        errors.push({ rowIndex, message: validation.error });
        continue;
      }
    }

    const contentFormatRaw = row.content_format?.trim() || "plain_text";
    if (contentFormatRaw && !isContentFormat(contentFormatRaw)) {
      errors.push({ rowIndex, message: "content_format không hợp lệ." });
      continue;
    }

    let structuredContent: unknown | null = null;
    let contentFormat: string | null = contentFormatRaw || "plain_text";

    if (structuredJson) {
      if (/https?:\/\//i.test(structuredJson) && !/media_id/i.test(structuredJson)) {
        errors.push({
          rowIndex,
          message: "structured_content_json không được chứa URL ảnh ngoài — dùng media_id."
        });
        continue;
      }

      const parsed = parseStructuredContentJson(structuredJson);
      if (!parsed.ok) {
        errors.push({ rowIndex, message: parsed.error });
        continue;
      }
      structuredContent = parsed.value;

      const wantsBlocks =
        contentFormatRaw === "structured_blocks" ||
        isComposerStructuredDocument(structuredContent);

      if (wantsBlocks) {
        const composerCheck = runComposerImportValidation(effectiveMode, structuredContent);
        if (!composerCheck.ok) {
          errors.push({ rowIndex, message: composerCheck.error });
          continue;
        }
        const knownMedia = await resolveKnownComposerMediaIds(
          db,
          structuredContent,
          storyId
        );
        let mediaRowError = false;
        for (const mediaId of collectMediaIdsFromComposer(structuredContent)) {
          if (!knownMedia.has(mediaId)) {
            errors.push({
              rowIndex,
              message: `media_id "${mediaId}" không tồn tại trong truyện.`
            });
            mediaRowError = true;
          }
        }
        if (mediaRowError) {
          continue;
        }
        contentFormat = "structured_blocks";
      } else {
        contentFormat = "structured_json";
      }

      content = buildPlainContentFallback(effectiveMode, structuredContent, content);
    } else if (!content.trim()) {
      errors.push({ rowIndex, message: "content hoặc structured_content_json bắt buộc." });
      continue;
    }

    let currentChapterStatus: string | null = null;
    if (chapterId && row.status?.trim()) {
      const { data: currentChapter } = await db
        .from("episodes")
        .select("status")
        .eq("id", chapterId)
        .maybeSingle();
      currentChapterStatus =
        currentChapter && "status" in currentChapter
          ? String(currentChapter.status)
          : null;
    }

    const importStatus = resolveChapterImportStatus(
      row.status,
      Boolean(chapterId),
      currentChapterStatus
    );

    const episodePatch = {
      title,
      content,
      episode_number: episodeNumber,
      status: importStatus,
      ...(importStatus === "published"
        ? {
            published_at: row.publish_at?.trim() || new Date().toISOString()
          }
        : {}),
      presentation_mode: chapterPresentationMode,
      structured_content: structuredContent,
      content_format: contentFormat,
      ...(contentFormat === "structured_blocks"
        ? { composer_version: 1, validation_status: "not_checked" as const }
        : {})
    };

    if (chapterId) {
      const { error } = await db
        .from("episodes")
        .update(episodePatch)
        .eq("id", chapterId);
      if (error) {
        errors.push({ rowIndex, message: error.message });
        continue;
      }
      updated += 1;
    } else {
      if (!storyPublicCode || !storySlug) {
        errors.push({ rowIndex, message: "Truyện thiếu mã public URL — mở truyện trong Studio rồi thử lại." });
        continue;
      }

      let chapterPublicCode: string;
      try {
        chapterPublicCode = await generateNumericPublicCode(db, "chapter");
      } catch (codeError) {
        errors.push({
          rowIndex,
          message:
            codeError instanceof Error
              ? codeError.message
              : "Không tạo được mã chương."
        });
        continue;
      }

      const chapterSlug = resolveContentSlug(title, "chapter", chapterPublicCode);
      const canonicalPath = getChapterUrl(
        { slug: storySlug, public_code: storyPublicCode },
        { slug: chapterSlug, public_code: chapterPublicCode }
      );

      const { data: inserted, error } = await db
        .from("episodes")
        .insert({
          story_id: storyId,
          slug: chapterSlug,
          public_code: chapterPublicCode,
          canonical_path: canonicalPath,
          ...episodePatch
        })
        .select("id")
        .single();

      if (error || !inserted?.id) {
        errors.push({ rowIndex, message: error?.message ?? "Không tạo được chương." });
        continue;
      }
      chapterId = String(inserted.id);
      created += 1;
    }

    if (chapterId) {
      const storageResult = await applyEpisodeObjectStorageAfterSave(db, {
        storyId,
        chapterId,
        content,
        structuredContent,
        contentFormat
      });
      if (!storageResult.ok) {
        errors.push({
          rowIndex,
          message: `⚠ Chương đã lưu; lỗi lưu trữ nội dung: ${storageResult.error}`
        });
        continue;
      }
    }

    if (chapterId) {
      try {
        await applyChapterMonetizationFromImportRow({
          chapterId,
          storyId,
          creatorUserId: creatorState.creatorProfile.user_id,
          priceCoin: row.price_coin,
          isFree: row.is_free
        });
      } catch (monetizationError) {
        // ponytail: monetization lỗi không huỷ chương đã tạo — chỉ ghi cảnh báo
        errors.push({
          rowIndex,
          message: `⚠ Chương đã lưu; monetization: ${
            monetizationError instanceof Error
              ? monetizationError.message
              : "lỗi monetization"
          }`
        });
      }
    }
  }

  await recordStudioImportExportJobAction({
    jobType: "import_stories",
    fileName: "chapters-import-v2.csv",
    totalRows: rows.length,
    successRows: created + updated,
    errorRows: errors.length,
    errorSummary: errors.length ? { sample: errors.slice(0, 5) } : {}
  });

  revalidatePath(studioPath("/stories"));

  return { created, updated, errors, error: null };
}
