import type { TaxonomyImportRow } from "@/lib/taxonomy/import-terms";
import { parseTaxonomyImportJson } from "@/lib/taxonomy/import-terms";
import type { TaxonomyImportParsedRow } from "@/types/taxonomy-import-export";
import type { TaxonomyImportMode } from "@/types/taxonomy-import-export";
import { parseTaxonomyImportFile } from "@/lib/taxonomy/import-export/parse-file";
import { loadExistingTermsSnapshot } from "@/lib/taxonomy/import-export/export-terms";
import { validateTaxonomyImportRows } from "@/lib/taxonomy/import-export/validate-rows";
import { executeTaxonomyImport } from "@/lib/taxonomy/import-export/execute-import";
import { assertNoEncodingIssuesInImportText } from "@/lib/encoding/detect-encoding-issues";
import { mapLegacyImportMode } from "@/lib/taxonomy/import-export/constants";

export type CatalogImportFlowResult = {
  imported: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  disabled: number;
  errors: string[];
  error: string | null;
  jobId: string | null;
  canImport: boolean;
};

function legacyRowToParsed(
  row: TaxonomyImportRow,
  rowNumber: number
): TaxonomyImportParsedRow {
  return {
    rowNumber,
    type: row.type,
    parentType: null,
    parentSlug: row.parent_slug ?? null,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    displayLabel: row.display_label ?? null,
    aliases: row.aliases ?? [],
    icon: row.icon ?? null,
    color: row.color ?? null,
    isActive: row.is_active ?? true,
    isPublic: row.is_public ?? true,
    isSelectableByCreator: row.is_selectable_by_creator ?? true,
    isFeatured: row.is_featured ?? false,
    useForSeo: row.use_for_seo ?? true,
    useForDiscover: row.use_for_discover ?? true,
    useForRanking: row.use_for_ranking ?? false,
    useForModeration: row.use_for_moderation ?? false,
    sortOrder: row.sort_order ?? 0,
    seoTitle: row.seo_title ?? null,
    seoDescription: row.seo_description ?? null,
    seoH1: row.seo_h1 ?? null,
    seoIntro: row.seo_intro ?? null,
    seoIndexable: row.seo_indexable ?? true,
    sitemapPriority: row.sitemap_priority ?? null,
    sitemapChangefreq: row.sitemap_changefreq ?? null,
    canonicalPath: row.canonical_path ?? null,
    internalNote: row.internal_note ?? null
  };
}

function parseContent(input: {
  content: string;
  format: "csv" | "xlsx" | "json";
  autoGenerateSlug?: boolean;
}): { rows: TaxonomyImportParsedRow[]; parseErrors: string[] } {
  if (input.format === "json") {
    const { rows, errors } = parseTaxonomyImportJson(input.content);
    return {
      rows: rows.map((row, index) => legacyRowToParsed(row, index + 2)),
      parseErrors: errors
    };
  }

  const fileFormat = input.format === "xlsx" ? "xlsx" : "csv";
  return parseTaxonomyImportFile({
    content: input.content,
    format: fileFormat,
    autoGenerateSlug: input.autoGenerateSlug
  });
}

function issuesToStrings(
  issues: Array<{ rowNumber: number; message: string; severity: string }>
) {
  return issues.map((i) =>
    i.rowNumber > 0 ? `Dòng ${i.rowNumber}: ${i.message}` : i.message
  );
}

export async function runTaxonomyCatalogImportFlow(input: {
  actorId: string;
  content: string;
  format: "csv" | "xlsx" | "json";
  mode: TaxonomyImportMode | "create" | "update" | "upsert";
  dryRun?: boolean;
  fileName?: string | null;
  autoGenerateSlug?: boolean;
  confirmDisableMissing?: boolean;
  confirmDeactivateInUse?: boolean;
  aliasConflictAsError?: boolean;
}): Promise<CatalogImportFlowResult> {
  const mode =
    input.mode === "create" ||
    input.mode === "update" ||
    input.mode === "upsert"
      ? mapLegacyImportMode(input.mode)
      : input.mode;

  const encodingCheck = assertNoEncodingIssuesInImportText(
    input.content,
    input.fileName ? `File ${input.fileName}` : "Nội dung import"
  );
  if (!encodingCheck.ok) {
    return {
      imported: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      disabled: 0,
      errors: [encodingCheck.error],
      error: encodingCheck.error,
      jobId: null,
      canImport: false
    };
  }

  const parsed = parseContent({
    content: input.content,
    format: input.format,
    autoGenerateSlug: input.autoGenerateSlug
  });

  if (parsed.parseErrors.length > 0 && parsed.rows.length === 0) {
    return {
      imported: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      disabled: 0,
      errors: parsed.parseErrors,
      error: parsed.parseErrors.join(" "),
      jobId: null,
      canImport: false
    };
  }

  const snapshot = await loadExistingTermsSnapshot();
  const preview = validateTaxonomyImportRows({
    rows: parsed.rows,
    existingTerms: snapshot.terms,
    mode,
    aliasConflictAsError: input.aliasConflictAsError
  });

  const allIssues = [
    ...parsed.parseErrors.map((msg) => ({
      rowNumber: 0,
      message: msg,
      severity: "error" as const
    })),
    ...preview.issues
  ];
  const errors = issuesToStrings(allIssues);

  if (input.dryRun || !preview.canImport) {
    return {
      imported: preview.canImport ? preview.rows.length : 0,
      created: preview.canImport ? preview.rows.length : 0,
      updated: 0,
      skipped: 0,
      failed: preview.errorCount,
      disabled: 0,
      errors,
      error: preview.canImport ? null : errors.slice(0, 3).join(" | ") || "Validation failed.",
      jobId: null,
      canImport: preview.canImport
    };
  }

  if (mode === "disable_missing_in_file" && !input.confirmDisableMissing) {
    return {
      imported: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      disabled: 0,
      errors: ["Mode disable_missing_in_file cần xác nhận."],
      error: "Mode disable_missing_in_file cần xác nhận.",
      jobId: null,
      canImport: false
    };
  }

  const result = await executeTaxonomyImport({
    actorId: input.actorId,
    rows: preview.rows,
    mode,
    existingTerms: snapshot.terms,
    warnings: preview.issues.filter((i) => i.severity === "warning"),
    issues: preview.issues.filter((i) => i.severity === "error"),
    fileName: input.fileName,
    confirmDisableMissing: input.confirmDisableMissing,
    confirmDeactivateInUse: input.confirmDeactivateInUse
  });

  const runtimeErrors = issuesToStrings(result.issues);

  return {
    imported: result.created + result.updated,
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    failed: result.failed,
    disabled: result.disabled,
    errors: runtimeErrors.length > 0 ? runtimeErrors : errors,
    error: result.error,
    jobId: result.jobId,
    canImport: true
  };
}
