import { createAdminClient } from "@/lib/data/admin";
import type {
  TaxonomyImportExportDirection,
  TaxonomyImportExportJobRow,
  TaxonomyImportExportJobStatus
} from "@/types/taxonomy-import-export";

function mapJob(row: Record<string, unknown>): TaxonomyImportExportJobRow {
  const actor = row.profiles as { display_name?: string } | null;
  return {
    id: String(row.id),
    actorId: String(row.actor_id),
    jobType: String(row.job_type),
    direction: row.direction as TaxonomyImportExportJobRow["direction"],
    mode: row.mode ? String(row.mode) : null,
    status: row.status as TaxonomyImportExportJobStatus,
    fileName: row.file_name ? String(row.file_name) : null,
    totalRows: Number(row.total_rows ?? 0),
    createdRows: Number(row.created_rows ?? 0),
    updatedRows: Number(row.updated_rows ?? 0),
    skippedRows: Number(row.skipped_rows ?? 0),
    failedRows: Number(row.failed_rows ?? 0),
    errorSummary: (row.error_summary as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    actorDisplayName: actor?.display_name ?? null
  };
}

export async function createTaxonomyImportExportJob(input: {
  actorId: string;
  direction: TaxonomyImportExportDirection;
  jobType: string;
  mode?: string | null;
  fileName?: string | null;
  status?: TaxonomyImportExportJobStatus;
}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("taxonomy_import_export_jobs")
    .insert({
      actor_id: input.actorId,
      direction: input.direction,
      job_type: input.jobType,
      mode: input.mode ?? null,
      file_name: input.fileName ?? null,
      status: input.status ?? "processing"
    })
    .select("id")
    .single();

  if (error || !data) return { id: null, error: error?.message ?? "Không tạo job." };
  return { id: String(data.id), error: null };
}

export async function completeTaxonomyImportExportJob(
  jobId: string,
  patch: {
    status: TaxonomyImportExportJobStatus;
    totalRows?: number;
    createdRows?: number;
    updatedRows?: number;
    skippedRows?: number;
    failedRows?: number;
    errorSummary?: Record<string, unknown>;
    resultFileUrl?: string | null;
  }
) {
  const db = createAdminClient();
  const { error } = await db
    .from("taxonomy_import_export_jobs")
    .update({
      status: patch.status,
      total_rows: patch.totalRows,
      created_rows: patch.createdRows,
      updated_rows: patch.updatedRows,
      skipped_rows: patch.skippedRows,
      failed_rows: patch.failedRows,
      error_summary: patch.errorSummary ?? {},
      result_file_url: patch.resultFileUrl ?? null,
      completed_at: new Date().toISOString()
    })
    .eq("id", jobId);

  return { error: error?.message ?? null };
}

export async function listTaxonomyImportExportJobs(options?: {
  page?: number;
  pageSize?: number;
}) {
  const db = createAdminClient();
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, options?.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await db
    .from("taxonomy_import_export_jobs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return { items: [] as TaxonomyImportExportJobRow[], total: 0, error: error.message };
  }

  return {
    items: (data ?? []).map((row) =>
      mapJob({ ...(row as Record<string, unknown>), profiles: null })
    ),
    total: count ?? 0,
    error: null
  };
}
