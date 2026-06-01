"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { checkStaffAnyPermission } from "@/lib/auth/staff-guards";
import {
  TAXONOMY_PERMISSION_FALLBACK,
  TAXONOMY_PERMISSIONS
} from "@/lib/admin/taxonomy-permissions";
import type { PermissionCode } from "@/types/permissions";
import { exportTaxonomyTermsAdvanced } from "@/lib/taxonomy/import-export/export-terms";
import { executeTaxonomyImport } from "@/lib/taxonomy/import-export/execute-import";
import {
  createTaxonomyImportExportJob,
  completeTaxonomyImportExportJob,
  listTaxonomyImportExportJobs
} from "@/lib/taxonomy/import-export/jobs";
import {
  parseTaxonomyImportFile,
  buildXlsxBase64FromCsv
} from "@/lib/taxonomy/import-export/parse-file";
import {
  buildTaxonomyTemplateCsv,
  buildTaxonomyValidTypesCsv,
  TAXONOMY_IMPORT_INSTRUCTIONS
} from "@/lib/taxonomy/import-export/template";
import { buildValidationErrorReportCsv } from "@/lib/taxonomy/import-export/error-report";
import {
  loadExistingTermsSnapshot
} from "@/lib/taxonomy/import-export/export-terms";
import {
  validateTaxonomyImportRows
} from "@/lib/taxonomy/import-export/validate-rows";
import { mapLegacyImportMode } from "@/lib/taxonomy/import-export/constants";
import { revalidateTaxonomyCatalogSurfaces } from "@/lib/taxonomy/revalidate-surfaces";
import type {
  TaxonomyExportFilters,
  TaxonomyImportMode,
  TaxonomyImportPreviewResult
} from "@/types/taxonomy-import-export";

const VIEW_CODES = [
  TAXONOMY_PERMISSIONS.view,
  ...TAXONOMY_PERMISSION_FALLBACK.view
] as PermissionCode[];

const IMPORT_CODES = [
  TAXONOMY_PERMISSIONS.import,
  ...TAXONOMY_PERMISSION_FALLBACK.import
] as PermissionCode[];

const EXPORT_CODES = [
  TAXONOMY_PERMISSIONS.export,
  ...TAXONOMY_PERMISSION_FALLBACK.export
] as PermissionCode[];

function normalizeMode(mode: string): TaxonomyImportMode {
  if (
    mode === "create_only" ||
    mode === "update_by_type_slug" ||
    mode === "upsert_by_type_slug" ||
    mode === "disable_missing_in_file"
  ) {
    return mode;
  }
  return mapLegacyImportMode(mode);
}

async function requireView() {
  const guard = await checkStaffAnyPermission(VIEW_CODES);
  if (!guard.ok) return { ok: false as const, error: guard.error ?? "Không có quyền." };
  return { ok: true as const, actorId: guard.userId };
}

async function requireImport() {
  const guard = await checkStaffAnyPermission(IMPORT_CODES);
  if (!guard.ok) return { ok: false as const, error: guard.error ?? "Không có quyền import." };
  return { ok: true as const, actorId: guard.userId };
}

async function requireExport() {
  const guard = await checkStaffAnyPermission(EXPORT_CODES);
  if (!guard.ok) return { ok: false as const, error: guard.error ?? "Không có quyền export." };
  return { ok: true as const, actorId: guard.userId };
}

export async function previewTaxonomyCatalogImportAction(input: {
  content: string;
  format: "csv" | "xlsx";
  mode: TaxonomyImportMode | "create" | "update" | "upsert";
  autoGenerateSlug?: boolean;
  aliasConflictAsError?: boolean;
}): Promise<{ preview: TaxonomyImportPreviewResult | null; error: string | null }> {
  const guard = await requireView();
  if (!guard.ok) return { preview: null, error: guard.error };

  const parsed = parseTaxonomyImportFile({
    content: input.content,
    format: input.format,
    autoGenerateSlug: input.autoGenerateSlug
  });

  if (parsed.parseErrors.length > 0 && parsed.rows.length === 0) {
    return { preview: null, error: parsed.parseErrors.join(" ") };
  }

  const snapshot = await loadExistingTermsSnapshot();
  const mode = normalizeMode(input.mode);

  const preview = validateTaxonomyImportRows({
    rows: parsed.rows,
    existingTerms: snapshot.terms,
    mode,
    aliasConflictAsError: input.aliasConflictAsError ?? false
  });

  preview.issues = [
    ...parsed.parseErrors.map((msg, i) => ({
      rowNumber: 0,
      field: "file",
      value: "",
      errorCode: "parse_error",
      severity: "error" as const,
      message: msg
    })),
    ...preview.issues
  ];
  preview.errorCount = preview.issues.filter((i) => i.severity === "error").length;
  preview.canImport = preview.errorCount === 0;

  await logAdminAction({
    actorId: guard.actorId,
    action: "taxonomy_import_preview",
    targetType: "taxonomy_import_export_job",
    metadata: {
      rowCount: preview.rows.length,
      errorCount: preview.errorCount,
      warningCount: preview.warningCount,
      mode
    }
  });

  return { preview, error: null };
}

export async function confirmTaxonomyCatalogImportAction(input: {
  content: string;
  format: "csv" | "xlsx";
  mode: TaxonomyImportMode | "create" | "update" | "upsert";
  fileName?: string | null;
  autoGenerateSlug?: boolean;
  confirmDisableMissing?: boolean;
  confirmDeactivateInUse?: boolean;
  aliasConflictAsError?: boolean;
}) {
  const guard = await requireImport();
  if (!guard.ok) {
    return { ok: false, error: guard.error, result: null, preview: null };
  }

  const mode = normalizeMode(input.mode);
  if (mode === "disable_missing_in_file" && !input.confirmDisableMissing) {
    return {
      ok: false,
      error: "Mode disable_missing_in_file cần xác nhận rõ ràng.",
      result: null,
      preview: null
    };
  }

  const previewResult = await previewTaxonomyCatalogImportAction({
    content: input.content,
    format: input.format,
    mode,
    autoGenerateSlug: input.autoGenerateSlug,
    aliasConflictAsError: input.aliasConflictAsError
  });

  if (!previewResult.preview?.canImport) {
    return {
      ok: false,
      error: "Có lỗi nghiêm trọng — không ghi DB.",
      result: null,
      preview: previewResult.preview
    };
  }

  const snapshot = await loadExistingTermsSnapshot();
  const result = await executeTaxonomyImport({
    actorId: guard.actorId,
    rows: previewResult.preview.rows,
    mode,
    existingTerms: snapshot.terms,
    warnings: previewResult.preview.issues.filter((i) => i.severity === "warning"),
    issues: previewResult.preview.issues.filter((i) => i.severity === "error"),
    fileName: input.fileName,
    confirmDisableMissing: input.confirmDisableMissing,
    confirmDeactivateInUse: input.confirmDeactivateInUse
  });

  if (result.created + result.updated + result.disabled > 0) {
    await logAdminAction({
      actorId: guard.actorId,
      action: "taxonomy_import_confirmed",
      targetType: "taxonomy_import_export_job",
      targetId: result.jobId ?? undefined,
      metadata: {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        failed: result.failed,
        disabled: result.disabled,
        mode
      }
    });
    if (result.disabled > 0) {
      await logAdminAction({
        actorId: guard.actorId,
        action: "taxonomy_import_disabled_missing",
        targetType: "taxonomy_import_export_job",
        targetId: result.jobId ?? undefined,
        metadata: { disabled: result.disabled, mode }
      });
    }
    await revalidateTaxonomyCatalogSurfaces();
  } else if (result.failed > 0) {
    await logAdminAction({
      actorId: guard.actorId,
      action: "taxonomy_import_failed",
      targetType: "taxonomy_import_export_job",
      targetId: result.jobId ?? undefined,
      metadata: { failed: result.failed, mode }
    });
  }

  return { ok: result.ok, error: result.error, result, preview: null };
}

export async function exportTaxonomyCatalogAction(input: {
  filters?: TaxonomyExportFilters;
  format: "csv" | "xlsx";
}) {
  const guard = await requireExport();
  if (!guard.ok) return { csv: "", xlsxBase64: "", rowCount: 0, jobId: null, error: guard.error };

  const exported = await exportTaxonomyTermsAdvanced(input.filters ?? {});
  if (exported.error) {
    return { csv: "", xlsxBase64: "", rowCount: 0, jobId: null, error: exported.error };
  }

  const job = await createTaxonomyImportExportJob({
    actorId: guard.actorId,
    direction: "export",
    jobType: "taxonomy_catalog",
    fileName: `taxonomy-export-${Date.now()}.${input.format}`,
    status: "completed"
  });

  if (job.id) {
    await completeTaxonomyImportExportJob(job.id, {
      status: "completed",
      totalRows: exported.rowCount,
      createdRows: 0,
      updatedRows: 0,
      skippedRows: 0,
      failedRows: 0,
      errorSummary: { filters: input.filters ?? {} }
    });
  }

  await logAdminAction({
    actorId: guard.actorId,
    action: "taxonomy_export",
    targetType: "taxonomy_import_export_job",
    targetId: job.id ?? undefined,
    metadata: { rowCount: exported.rowCount, format: input.format }
  });

  const xlsxBase64 =
    input.format === "xlsx" ? buildXlsxBase64FromCsv(exported.csv) : "";

  revalidatePath("/admin/taxonomy/import-export");

  return {
    csv: exported.csv,
    xlsxBase64,
    rowCount: exported.rowCount,
    jobId: job.id,
    error: null
  };
}

export async function getTaxonomyImportExportTemplatesAction() {
  const guard = await requireView();
  if (!guard.ok) {
    return { templateCsv: "", validTypesCsv: "", instructions: "", error: guard.error };
  }

  return {
    templateCsv: buildTaxonomyTemplateCsv(),
    validTypesCsv: buildTaxonomyValidTypesCsv(),
    instructions: TAXONOMY_IMPORT_INSTRUCTIONS,
    error: null
  };
}

export async function listTaxonomyImportExportJobsAction(options?: {
  page?: number;
  pageSize?: number;
}) {
  const guard = await requireView();
  if (!guard.ok) {
    return { items: [], total: 0, error: guard.error };
  }
  return listTaxonomyImportExportJobs(options);
}

export async function downloadTaxonomyTemplateXlsxAction() {
  const guard = await requireView();
  if (!guard.ok) return { xlsxBase64: "", error: guard.error };

  const csv = buildTaxonomyTemplateCsv();
  return { xlsxBase64: buildXlsxBase64FromCsv(csv), error: null };
}

export async function getTaxonomyImportExportJobErrorReportAction(jobId: string) {
  const guard = await requireView();
  if (!guard.ok) return { csv: "", error: guard.error };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("taxonomy_import_export_jobs")
    .select("error_summary")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !data) {
    return { csv: "", error: error?.message ?? "Không tìm thấy job." };
  }

  const summary = (data.error_summary as Record<string, unknown>) ?? {};
  const storedCsv =
    typeof summary.errorReportCsv === "string" ? summary.errorReportCsv : null;
  if (storedCsv) {
    return { csv: storedCsv, error: null };
  }

  const issues = Array.isArray(summary.issues) ? summary.issues : [];
  if (issues.length === 0) {
    return { csv: "", error: "Job không có error report." };
  }

  return {
    csv: buildValidationErrorReportCsv(
      issues.map((row) => ({
        rowNumber: Number((row as Record<string, unknown>).rowNumber ?? 0),
        field: String((row as Record<string, unknown>).field ?? ""),
        value: String((row as Record<string, unknown>).value ?? ""),
        errorCode: String((row as Record<string, unknown>).errorCode ?? ""),
        severity: ((row as Record<string, unknown>).severity as "error" | "warning") ?? "error",
        message: String((row as Record<string, unknown>).message ?? "")
      }))
    ),
    error: null
  };
}

export async function buildTaxonomyImportErrorReportAction(
  issues: Array<{
    rowNumber: number;
    field: string;
    value: string;
    errorCode: string;
    severity: "error" | "warning";
    message: string;
  }>
) {
  const guard = await requireView();
  if (!guard.ok) return { csv: "", error: guard.error };
  return { csv: buildValidationErrorReportCsv(issues), error: null };
}

export async function getTaxonomyImportExportPermissionsAction() {
  const [view, imp, exp] = await Promise.all([
    checkStaffAnyPermission(VIEW_CODES),
    checkStaffAnyPermission(IMPORT_CODES),
    checkStaffAnyPermission(EXPORT_CODES)
  ]);
  return {
    canView: view.ok,
    canImport: imp.ok,
    canExport: exp.ok
  };
}
