"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { checkStaffAnyPermission } from "@/lib/auth/staff-guards";
import {
  TAXONOMY_PERMISSION_FALLBACK,
  TAXONOMY_PERMISSIONS
} from "@/lib/admin/taxonomy-permissions";
import type { PermissionCode } from "@/types/permissions";
import {
  approveTaxonomyRequest,
  mergeTaxonomyRequest,
  rejectTaxonomyRequest
} from "@/lib/taxonomy/requests";
import {
  createTaxonomyTermAdmin,
  deleteTaxonomyTermAdmin,
  duplicateFormatTemplateAdmin,
  duplicateTaxonomyTermAdmin,
  exportTaxonomyAuditLogsForAdmin,
  exportTaxonomyTermsForAdmin,
  type TaxonomyExportScope,
  getTaxonomyAdminDashboardStats,
  getCatalogQualityForAdmin,
  getTaxonomyTermById,
  listFormatTemplatesForAdmin,
  listStoriesUsingTerm,
  listTaxonomyAuditLogsForAdmin,
  listTaxonomyRequestsForAdmin,
  listTaxonomyTermsForAdmin,
  mergeTaxonomyTermsAdmin,
  saveFormatTemplateAdmin,
  updateTaxonomyTermAdmin,
  type AdminTaxonomyListFilters,
  type UpsertFormatTemplateInput,
  type UpsertTaxonomyTermInput
} from "@/lib/taxonomy/admin-data";
import {
  parseTaxonomyImportPayload
} from "@/lib/taxonomy/import-terms";
import type { TaxonomyType } from "@/types/taxonomy";

const TAXONOMY_VIEW_CODES = [
  TAXONOMY_PERMISSIONS.view,
  ...TAXONOMY_PERMISSION_FALLBACK.view
] as PermissionCode[];

const TAXONOMY_MUTATE_CODES = [
  TAXONOMY_PERMISSIONS.edit,
  TAXONOMY_PERMISSIONS.create,
  ...TAXONOMY_PERMISSION_FALLBACK.mutate
] as PermissionCode[];

async function requireTaxonomyPermission(codes: PermissionCode[]) {
  const guard = await checkStaffAnyPermission(codes);
  if (!guard.ok) {
    return { ok: false as const, error: guard.error ?? "Không có quyền." };
  }
  return { ok: true as const, actorId: guard.userId };
}

async function requireTaxonomyAdmin() {
  return requireTaxonomyPermission(TAXONOMY_MUTATE_CODES);
}

async function requireTaxonomyCreate() {
  return requireTaxonomyPermission([
    TAXONOMY_PERMISSIONS.create,
    ...TAXONOMY_PERMISSION_FALLBACK.mutate
  ]);
}

async function requireTaxonomyEdit() {
  return requireTaxonomyPermission([
    TAXONOMY_PERMISSIONS.edit,
    ...TAXONOMY_PERMISSION_FALLBACK.mutate
  ]);
}

async function requireTaxonomyImport() {
  return requireTaxonomyPermission([
    TAXONOMY_PERMISSIONS.import,
    ...TAXONOMY_PERMISSION_FALLBACK.import
  ]);
}

async function requireTaxonomyExport() {
  const guard = await checkStaffAnyPermission([
    TAXONOMY_PERMISSIONS.export,
    ...TAXONOMY_PERMISSION_FALLBACK.export
  ]);
  if (!guard.ok) {
    return { ok: false as const, error: guard.error ?? "Không có quyền." };
  }
  return { ok: true as const };
}

async function requireTaxonomyDelete() {
  return requireTaxonomyPermission([
    TAXONOMY_PERMISSIONS.delete,
    ...TAXONOMY_PERMISSION_FALLBACK.delete
  ]);
}

async function requireTaxonomyRequestsReview() {
  return requireTaxonomyPermission([
    TAXONOMY_PERMISSIONS.requestsReview,
    ...TAXONOMY_PERMISSION_FALLBACK.requests
  ]);
}

async function requireTaxonomyTemplates() {
  return requireTaxonomyPermission([
    TAXONOMY_PERMISSIONS.templatesManage,
    ...TAXONOMY_PERMISSION_FALLBACK.templates
  ]);
}

async function requireTaxonomyView() {
  const guard = await checkStaffAnyPermission(TAXONOMY_VIEW_CODES);
  if (!guard.ok) {
    return { ok: false as const, error: guard.error ?? "Không có quyền." };
  }
  return { ok: true as const };
}

async function revalidateTaxonomySurfaces(type?: TaxonomyType) {
  const { revalidateTaxonomyCatalogSurfaces } = await import(
    "@/lib/taxonomy/revalidate-surfaces"
  );
  await revalidateTaxonomyCatalogSurfaces(type);
}

export async function listTaxonomyTermsAdminAction(filters: AdminTaxonomyListFilters) {
  const guard = await requireTaxonomyView();
  if (!guard.ok) return { items: [], total: 0, error: guard.error };
  return listTaxonomyTermsForAdmin(filters);
}

export async function listTaxonomyRequestsAdminAction(options?: {
  status?: "pending" | "approved" | "rejected" | "merged";
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const guard = await requireTaxonomyView();
  if (!guard.ok) return { items: [], total: 0, error: guard.error };
  return listTaxonomyRequestsForAdmin(options);
}

export async function getTaxonomyDashboardStatsAction() {
  const guard = await requireTaxonomyView();
  if (!guard.ok) {
    return {
      totalTerms: 0,
      activeTerms: 0,
      inactiveTerms: 0,
      mainGenreCount: 0,
      creatorSelectableCount: 0,
      pendingRequests: 0,
      activeAgeRatings: 0,
      topUsage: null,
      qualityAlerts: 0,
      error: guard.error
    };
  }
  return getTaxonomyAdminDashboardStats();
}

export async function getCatalogQualityAdminAction() {
  const guard = await requireTaxonomyView();
  if (!guard.ok) {
    return {
      summary: {
        totalIssues: 0,
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
        issues: []
      },
      error: guard.error
    };
  }
  return getCatalogQualityForAdmin();
}

export async function listTaxonomyAuditLogsAdminAction(options?: {
  page?: number;
  pageSize?: number;
  action?: string;
}) {
  const guard = await requireTaxonomyView();
  if (!guard.ok) {
    return { items: [], total: 0, error: guard.error };
  }
  return listTaxonomyAuditLogsForAdmin(options);
}

export async function getTaxonomyTermAdminAction(termId: string) {
  const guard = await requireTaxonomyView();
  if (!guard.ok) return { item: null, error: guard.error };
  return getTaxonomyTermById(termId);
}

export async function saveTaxonomyTermAdminAction(input: {
  id?: string;
  data: UpsertTaxonomyTermInput;
}) {
  const actor = input.id
    ? await requireTaxonomyEdit()
    : await requireTaxonomyCreate();
  if (!actor.ok) return { item: null, error: actor.error };

  if (input.data.parent_id === undefined) {
    input.data.parent_id = null;
  }

  const result = input.id
    ? await updateTaxonomyTermAdmin(input.id, actor.actorId, input.data)
    : await createTaxonomyTermAdmin(actor.actorId, input.data);

  if (result.item) {
    await logAdminAction({
      actorId: actor.actorId,
      action: input.id ? "taxonomy_term_update" : "taxonomy_term_create",
      targetType: "taxonomy_term",
      targetId: result.item.id,
      metadata: { type: result.item.type, slug: result.item.slug }
    });
    await revalidateTaxonomySurfaces(result.item.type as TaxonomyType);
  }

  return result;
}

export async function toggleTaxonomyTermActiveAction(termId: string, isActive: boolean) {
  const actor = await requireTaxonomyEdit();
  if (!actor.ok) return { ok: false, error: actor.error };

  const before = await getTaxonomyTermById(termId);
  const result = await updateTaxonomyTermAdmin(termId, actor.actorId, {
    is_active: isActive
  });

  if (result.error) return { ok: false, error: result.error };

  await logAdminAction({
    actorId: actor.actorId,
    action: isActive ? "taxonomy_term_enable" : "taxonomy_term_disable",
    targetType: "taxonomy_term",
    targetId: termId,
    metadata: {
      usage_count: before.item?.usage_count ?? 0,
      slug: before.item?.slug
    }
  });

  await revalidateTaxonomySurfaces(before.item?.type as TaxonomyType | undefined);
  return { ok: true, error: null };
}

export async function deleteTaxonomyTermAdminAction(termId: string) {
  const actor = await requireTaxonomyDelete();
  if (!actor.ok) return { ok: false, error: actor.error };

  const result = await deleteTaxonomyTermAdmin(termId);
  if (result.ok) {
    await logAdminAction({
      actorId: actor.actorId,
      action: "taxonomy_term_delete",
      targetType: "taxonomy_term",
      targetId: termId
    });
    revalidatePath("/admin/taxonomy");
  }

  return result;
}

export async function duplicateTaxonomyTermAdminAction(termId: string) {
  const actor = await requireTaxonomyCreate();
  if (!actor.ok) return { item: null, error: actor.error };

  const result = await duplicateTaxonomyTermAdmin(termId, actor.actorId);
  if (result.item) {
    await logAdminAction({
      actorId: actor.actorId,
      action: "taxonomy_term_duplicate",
      targetType: "taxonomy_term",
      targetId: result.item.id,
      metadata: { sourceId: termId }
    });
    revalidatePath("/admin/taxonomy");
  }

  return result;
}

export async function mergeTaxonomyTermsAdminAction(
  sourceId: string,
  targetId: string
) {
  const actor = await requireTaxonomyEdit();
  if (!actor.ok) return { ok: false, error: actor.error };

  const result = await mergeTaxonomyTermsAdmin(sourceId, targetId, actor.actorId);
  if (result.ok) {
    await logAdminAction({
      actorId: actor.actorId,
      action: "taxonomy_term_merge",
      targetType: "taxonomy_term",
      targetId: targetId,
      metadata: { sourceId }
    });
    revalidatePath("/admin/taxonomy");
  }

  return result;
}

export async function listStoriesUsingTermAdminAction(termId: string) {
  const guard = await requireTaxonomyView();
  if (!guard.ok) return { items: [], error: guard.error };
  return listStoriesUsingTerm(termId);
}

export async function approveTaxonomyRequestAdminAction(
  requestId: string,
  adminNote?: string | null
) {
  const actor = await requireTaxonomyRequestsReview();
  if (!actor.ok) return { ok: false, error: actor.error };

  const result = await approveTaxonomyRequest(requestId, actor.actorId, { adminNote });
  if (result.data) {
    await logAdminAction({
      actorId: actor.actorId,
      action: "taxonomy_request_approve",
      targetType: "taxonomy_request",
      targetId: requestId
    });
    revalidatePath("/admin/taxonomy");
  }

  return { ok: Boolean(result.data), error: result.error };
}

export async function rejectTaxonomyRequestAdminAction(
  requestId: string,
  adminNote: string
) {
  const actor = await requireTaxonomyRequestsReview();
  if (!actor.ok) return { ok: false, error: actor.error };

  const result = await rejectTaxonomyRequest(requestId, actor.actorId, {
    adminNote
  });

  if (result.data) {
    await logAdminAction({
      actorId: actor.actorId,
      action: "taxonomy_request_reject",
      targetType: "taxonomy_request",
      targetId: requestId,
      metadata: { adminNote }
    });
    revalidatePath("/admin/taxonomy");
  }

  return { ok: Boolean(result.data), error: result.error };
}

export async function mergeTaxonomyRequestAdminAction(
  requestId: string,
  existingTermId: string,
  adminNote?: string | null,
  addAlias = true
) {
  const actor = await requireTaxonomyRequestsReview();
  if (!actor.ok) return { ok: false, error: actor.error };

  const result = await mergeTaxonomyRequest(
    requestId,
    existingTermId,
    actor.actorId,
    { adminNote, aliasFromRequestName: addAlias }
  );

  if (result.data) {
    await logAdminAction({
      actorId: actor.actorId,
      action: "taxonomy_request_merge",
      targetType: "taxonomy_request",
      targetId: requestId,
      metadata: { existingTermId }
    });
    revalidatePath("/admin/taxonomy");
  }

  return { ok: Boolean(result.data), error: result.error };
}

export async function previewTaxonomyImportAction(input: {
  payload: string;
  format: "json" | "csv";
}) {
  const guard = await requireTaxonomyView();
  if (!guard.ok) {
    return { rows: [], errors: [guard.error], error: guard.error };
  }

  return parseTaxonomyImportPayload(input.payload, input.format);
}

export async function importTaxonomyTermsAdminAction(input: {
  payload: string;
  format: "json" | "csv";
  mode: "create" | "update" | "upsert";
  dryRun?: boolean;
}) {
  const actor = await requireTaxonomyImport();
  if (!actor.ok) {
    return {
      imported: 0,
      updated: 0,
      created: 0,
      skipped: 0,
      errors: [actor.error],
      error: actor.error
    };
  }

  const { runTaxonomyCatalogImportFlow } = await import(
    "@/lib/taxonomy/import-export/run-import-flow"
  );

  const result = await runTaxonomyCatalogImportFlow({
    actorId: actor.actorId,
    content: input.payload,
    format: input.format,
    mode: input.mode,
    dryRun: input.dryRun
  });

  if (!input.dryRun && result.created + result.updated + result.disabled > 0) {
    await logAdminAction({
      actorId: actor.actorId,
      action: "taxonomy_import",
      targetType: "taxonomy_term",
      targetId: result.jobId ?? undefined,
      metadata: {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        mode: input.mode,
        format: input.format,
        jobId: result.jobId
      }
    });
    const { revalidateTaxonomyCatalogSurfaces } = await import(
      "@/lib/taxonomy/revalidate-surfaces"
    );
    await revalidateTaxonomyCatalogSurfaces();
    revalidatePath("/admin/taxonomy");
  }

  return {
    imported: result.imported,
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    errors: result.errors,
    error: result.error
  };
}

export async function exportTaxonomyTermsCsvAction(scope?: TaxonomyExportScope) {
  const guard = await requireTaxonomyExport();
  if (!guard.ok) return { csv: "", error: guard.error };

  const { exportTaxonomyTermsAdvanced } = await import(
    "@/lib/taxonomy/import-export/export-terms"
  );
  const result = await exportTaxonomyTermsAdvanced({
    type: scope?.type,
    types: scope?.types
  });
  return { csv: result.csv, error: result.error };
}

export async function exportTaxonomyAuditCsvAction(options?: {
  action?: string;
}) {
  const guard = await requireTaxonomyExport();
  if (!guard.ok) return { csv: "", error: guard.error };
  return exportTaxonomyAuditLogsForAdmin(options);
}

export async function exportTaxonomyTermsJsonAction(scope?: TaxonomyExportScope) {
  const guard = await requireTaxonomyExport();
  if (!guard.ok) return { json: "[]", error: guard.error };

  const result = await listTaxonomyTermsForAdmin({
    type: scope?.type,
    types: scope?.types,
    page: 1,
    pageSize: 5000
  });

  return {
    json: JSON.stringify(result.items, null, 2),
    error: result.error
  };
}

export async function listFormatTemplatesAdminAction() {
  const guard = await requireTaxonomyView();
  if (!guard.ok) return { items: [], error: guard.error };
  return listFormatTemplatesForAdmin();
}

export async function saveFormatTemplateAdminAction(input: UpsertFormatTemplateInput) {
  const actor = await requireTaxonomyTemplates();
  if (!actor.ok) return { item: null, error: actor.error };

  let schema = input.schema_json ?? {};
  let example = input.example_json ?? {};

  if (typeof schema === "string") {
    try {
      schema = JSON.parse(schema);
    } catch {
      return { item: null, error: "schema_json không hợp lệ." };
    }
  }
  if (typeof example === "string") {
    try {
      example = JSON.parse(example);
    } catch {
      return { item: null, error: "example_json không hợp lệ." };
    }
  }

  const result = await saveFormatTemplateAdmin(actor.actorId, {
    ...input,
    schema_json: schema,
    example_json: example
  });

  if (result.item) {
    await logAdminAction({
      actorId: actor.actorId,
      action: input.id ? "taxonomy_template_update" : "taxonomy_template_create",
      targetType: "story_format_template",
      targetId: result.item.id,
      metadata: { mode: result.item.mode, name: result.item.name }
    });
    revalidatePath("/admin/taxonomy");
  }

  return result;
}

export async function duplicateFormatTemplateAdminAction(templateId: string) {
  const actor = await requireTaxonomyTemplates();
  if (!actor.ok) return { item: null, error: actor.error };

  const result = await duplicateFormatTemplateAdmin(templateId, actor.actorId);
  if (result.item) {
    await logAdminAction({
      actorId: actor.actorId,
      action: "taxonomy_template_duplicate",
      targetType: "story_format_template",
      targetId: result.item.id,
      metadata: { sourceId: templateId }
    });
    revalidatePath("/admin/taxonomy");
  }

  return result;
}

export async function recalculateTaxonomyUsageCountsAction() {
  const actor = await requireTaxonomyAdmin();
  if (!actor.ok) return { ok: false, error: actor.error };

  const supabase = await createClient();
  const { recalculateTaxonomyUsageCounts } = await import(
    "@/lib/taxonomy/usage-count"
  );
  const { invalidateTaxonomyCache } = await import("@/lib/taxonomy/cache");

  const result = await recalculateTaxonomyUsageCounts(supabase);
  if (result.ok) {
    invalidateTaxonomyCache();
    await logAdminAction({
      actorId: actor.actorId,
      action: "taxonomy_usage_recalculate",
      targetType: "taxonomy_terms",
      targetId: null,
      metadata: {}
    });
    revalidatePath("/admin/taxonomy");
  }

  return result;
}
