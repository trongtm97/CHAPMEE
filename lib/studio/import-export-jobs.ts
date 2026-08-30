"use server";

import { createClient } from "@/lib/data/server";

export type StudioImportExportJobRecord = {
  id: string;
  jobType: string;
  status: string;
  fileName: string | null;
  totalRows: number;
  successRows: number;
  errorRows: number;
  createdAt: string;
  completedAt: string | null;
};

export async function createStudioImportExportJob(input: {
  userId: string;
  jobType: "import_stories" | "export_stories";
  fileName?: string | null;
  totalRows?: number;
}) {
  const db = await createClient();
  const { data, error } = await db
    .from("studio_import_export_jobs")
    .insert({
      user_id: input.userId,
      job_type: input.jobType,
      status: "processing",
      file_name: input.fileName ?? null,
      total_rows: input.totalRows ?? 0
    })
    .select("id")
    .single();

  if (error || !data) return { id: null, error: error?.message ?? "Không tạo được job." };
  return { id: String(data.id), error: null };
}

export async function completeStudioImportExportJob(
  jobId: string,
  input: {
    status: "completed" | "failed" | "partially_completed";
    successRows: number;
    errorRows: number;
    errorSummary?: Record<string, unknown>;
  }
) {
  const db = await createClient();
  const { error } = await db
    .from("studio_import_export_jobs")
    .update({
      status: input.status,
      success_rows: input.successRows,
      error_rows: input.errorRows,
      error_summary: input.errorSummary ?? {},
      completed_at: new Date().toISOString()
    })
    .eq("id", jobId);

  return { error: error?.message ?? null };
}

export async function listStudioImportExportJobs(
  userId: string,
  limit = 30
): Promise<{ items: StudioImportExportJobRecord[]; error: string | null }> {
  const db = await createClient();
  const { data, error } = await db
    .from("studio_import_export_jobs")
    .select(
      "id, job_type, status, file_name, total_rows, success_rows, error_rows, created_at, completed_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { items: [], error: error.message };
  }

  return {
    items: (data ?? []).map((row) => ({
      id: String(row.id),
      jobType: String(row.job_type),
      status: String(row.status),
      fileName: row.file_name as string | null,
      totalRows: Number(row.total_rows ?? 0),
      successRows: Number(row.success_rows ?? 0),
      errorRows: Number(row.error_rows ?? 0),
      createdAt: String(row.created_at),
      completedAt: row.completed_at as string | null
    })),
    error: null
  };
}
