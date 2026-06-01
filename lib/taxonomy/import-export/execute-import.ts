import { createClient } from "@/lib/supabase/server";
import {
  createTaxonomyTermAdmin,
  updateTaxonomyTermAdmin
} from "@/lib/taxonomy/admin-data";
import { taxonomyParentTypeFor } from "@/lib/taxonomy/parent-types";
import type {
  TaxonomyImportExecuteResult,
  TaxonomyImportMode,
  TaxonomyImportParsedRow,
  TaxonomyImportValidationIssue
} from "@/types/taxonomy-import-export";
import {
  parsedRowToUpsertInput,
  type ExistingTermSnapshot
} from "@/lib/taxonomy/import-export/validate-rows";
import { buildValidationErrorReportCsv } from "@/lib/taxonomy/import-export/error-report";
import {
  completeTaxonomyImportExportJob,
  createTaxonomyImportExportJob
} from "@/lib/taxonomy/import-export/jobs";

function termKey(type: string, slug: string) {
  return `${type}:${slug}`;
}

async function resolveParentId(
  row: TaxonomyImportParsedRow,
  fileIdMap: Map<string, string>,
  existingByKey: Map<string, ExistingTermSnapshot>
): Promise<string | null> {
  if (!row.parentSlug?.trim()) return null;

  const parentType =
    row.parentType?.trim() || taxonomyParentTypeFor(row.type);
  if (!parentType) return null;

  const parentKey = termKey(parentType, row.parentSlug.trim());
  if (fileIdMap.has(parentKey)) return fileIdMap.get(parentKey)!;

  const existing = existingByKey.get(parentKey);
  return existing?.id ?? null;
}

function sortRowsForParentFirst(rows: TaxonomyImportParsedRow[]) {
  const keySet = new Set(rows.map((r) => termKey(r.type, r.slug)));
  const sorted: TaxonomyImportParsedRow[] = [];
  const remaining = [...rows];

  let guard = 0;
  while (remaining.length > 0 && guard < rows.length * 2) {
    guard += 1;
    const next = remaining.shift();
    if (!next) break;

    if (next.parentSlug?.trim()) {
      const parentType =
        next.parentType?.trim() || taxonomyParentTypeFor(next.type);
      if (parentType) {
        const parentKey = termKey(parentType, next.parentSlug.trim());
        const parentInFile = keySet.has(parentKey);
        const parentProcessed = sorted.some(
          (r) => termKey(r.type, r.slug) === parentKey
        );
        if (parentInFile && !parentProcessed) {
          remaining.push(next);
          continue;
        }
      }
    }
    sorted.push(next);
  }

  return sorted.length === rows.length ? sorted : rows;
}

export async function executeTaxonomyImport(input: {
  actorId: string;
  rows: TaxonomyImportParsedRow[];
  mode: TaxonomyImportMode;
  existingTerms: ExistingTermSnapshot[];
  warnings: TaxonomyImportValidationIssue[];
  issues: TaxonomyImportValidationIssue[];
  fileName?: string | null;
  confirmDisableMissing?: boolean;
  confirmDeactivateInUse?: boolean;
}): Promise<TaxonomyImportExecuteResult> {
  const existingByKey = new Map<string, ExistingTermSnapshot>();
  for (const term of input.existingTerms) {
    existingByKey.set(termKey(term.type, term.slug), term);
  }

  const job = await createTaxonomyImportExportJob({
    actorId: input.actorId,
    direction: "import",
    jobType: "taxonomy_catalog",
    mode: input.mode,
    fileName: input.fileName ?? null
  });

  if (!job.id) {
    return {
      ok: false,
      jobId: null,
      totalRows: input.rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      disabled: 0,
      warnings: input.warnings,
      issues: input.issues,
      errorReportCsv: null,
      error: job.error
    };
  }

  const fileIdMap = new Map<string, string>();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let disabled = 0;
  const runtimeIssues: TaxonomyImportValidationIssue[] = [...input.issues];

  const orderedRows = sortRowsForParentFirst(input.rows);

  for (const row of orderedRows) {
    const key = termKey(row.type, row.slug);
    const exists = existingByKey.get(key);

    if (
      !row.isActive &&
      exists &&
      exists.usageCount > 0 &&
      !input.confirmDeactivateInUse
    ) {
      runtimeIssues.push({
        rowNumber: row.rowNumber,
        field: "is_active",
        value: "false",
        errorCode: "deactivate_in_use_unconfirmed",
        severity: "error",
        message: `Term ${key} đang dùng — cần confirm deactivate.`
      });
      failed += 1;
      continue;
    }

    const parentId = await resolveParentId(row, fileIdMap, existingByKey);
    if (row.parentSlug?.trim() && !parentId) {
      runtimeIssues.push({
        rowNumber: row.rowNumber,
        field: "parent_slug",
        value: row.parentSlug,
        errorCode: "parent_unresolved",
        severity: "error",
        message: "Không resolve được parent_id lúc import."
      });
      failed += 1;
      continue;
    }

    const payload = { ...parsedRowToUpsertInput(row), parent_id: parentId };

    if (exists) {
      if (input.mode === "create_only") {
        skipped += 1;
        continue;
      }
      const result = await updateTaxonomyTermAdmin(
        exists.id,
        input.actorId,
        payload
      );
      if (result.error) {
        failed += 1;
        runtimeIssues.push({
          rowNumber: row.rowNumber,
          field: "slug",
          value: row.slug,
          errorCode: "update_failed",
          severity: "error",
          message: result.error
        });
      } else {
        updated += 1;
        fileIdMap.set(key, exists.id);
      }
      continue;
    }

    if (input.mode === "update_by_type_slug") {
      skipped += 1;
      continue;
    }

    const result = await createTaxonomyTermAdmin(input.actorId, payload);
    if (result.error || !result.item) {
      failed += 1;
      runtimeIssues.push({
        rowNumber: row.rowNumber,
        field: "slug",
        value: row.slug,
        errorCode: "create_failed",
        severity: "error",
        message: result.error ?? "Create failed"
      });
    } else {
      created += 1;
      fileIdMap.set(key, result.item.id);
      existingByKey.set(key, {
        id: result.item.id,
        type: row.type,
        slug: row.slug,
        usageCount: 0,
        aliases: row.aliases
      });
    }
  }

  if (input.mode === "disable_missing_in_file" && input.confirmDisableMissing) {
    const typesInFile = [...new Set(input.rows.map((r) => r.type))];
    const keysInFile = new Set(input.rows.map((r) => termKey(r.type, r.slug)));
    const supabase = await createClient();

    for (const type of typesInFile) {
      const { data: activeTerms } = await supabase
        .from("taxonomy_terms")
        .select("id, slug, usage_count")
        .eq("type", type)
        .eq("is_active", true);

      for (const term of activeTerms ?? []) {
        const key = termKey(type, String(term.slug));
        if (keysInFile.has(key)) continue;

        if (Number(term.usage_count ?? 0) > 0) {
          runtimeIssues.push({
            rowNumber: 0,
            field: "is_active",
            value: String(term.slug),
            errorCode: "disable_missing_in_use",
            severity: "warning",
            message: `Disable ${key} — đang có ${term.usage_count} usage.`
          });
        }

        const { error } = await supabase
          .from("taxonomy_terms")
          .update({ is_active: false, updated_by: input.actorId })
          .eq("id", term.id);

        if (error) {
          failed += 1;
        } else {
          disabled += 1;
        }
      }
    }
  }

  const hasErrors = runtimeIssues.some((i) => i.severity === "error");
  const status =
    failed > 0 && created + updated === 0
      ? "failed"
      : failed > 0
        ? "partially_completed"
        : "completed";

  const errorReportCsv =
    runtimeIssues.length > 0 ? buildValidationErrorReportCsv(runtimeIssues) : null;

  const issueSample = runtimeIssues.slice(0, 100).map((i) => ({
    rowNumber: i.rowNumber,
    field: i.field,
    value: i.value,
    errorCode: i.errorCode,
    severity: i.severity,
    message: i.message
  }));

  const errorReportStored =
    errorReportCsv && errorReportCsv.length > 80_000
      ? `${errorReportCsv.slice(0, 80_000)}\n...truncated...`
      : errorReportCsv;

  await completeTaxonomyImportExportJob(job.id, {
    status,
    totalRows: input.rows.length,
    createdRows: created,
    updatedRows: updated,
    skippedRows: skipped,
    failedRows: failed,
    errorSummary: {
      disabled,
      warningCount: runtimeIssues.filter((i) => i.severity === "warning").length,
      errorCount: runtimeIssues.filter((i) => i.severity === "error").length,
      issues: issueSample,
      hasErrorReport: Boolean(errorReportCsv),
      errorReportCsv: errorReportStored
    },
    resultFileUrl: null
  });

  return {
    ok: !hasErrors || created + updated + disabled > 0,
    jobId: job.id,
    totalRows: input.rows.length,
    created,
    updated,
    skipped,
    failed,
    disabled,
    warnings: [...input.warnings, ...runtimeIssues.filter((i) => i.severity === "warning")],
    issues: runtimeIssues,
    errorReportCsv,
    error: hasErrors && created + updated === 0 ? "Import thất bại do lỗi validation." : null
  };
}
