"use server";

import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import {
  completeStudioImportExportJob,
  createStudioImportExportJob,
  listStudioImportExportJobs
} from "@/lib/studio/import-export-jobs";

export async function recordStudioImportExportJobAction(input: {
  jobType: "import_stories" | "export_stories";
  fileName: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  errorSummary?: Record<string, unknown>;
}) {
  const { user } = await getCurrentCreatorProfile();
  if (!user) {
    return { jobId: null, error: "Chưa đăng nhập." };
  }

  const status =
    input.errorRows > 0 && input.successRows > 0
      ? "partially_completed"
      : input.errorRows > 0
        ? "failed"
        : "completed";

  const created = await createStudioImportExportJob({
    userId: user.id,
    jobType: input.jobType,
    fileName: input.fileName,
    totalRows: input.totalRows
  });

  if (!created.id) {
    return { jobId: null, error: created.error };
  }

  await completeStudioImportExportJob(created.id, {
    status,
    successRows: input.successRows,
    errorRows: input.errorRows,
    errorSummary: input.errorSummary
  });

  return { jobId: created.id, error: null };
}

export async function listStudioImportExportJobsAction() {
  const { user } = await getCurrentCreatorProfile();
  if (!user) {
    return { items: [], error: "Chưa đăng nhập." };
  }

  return listStudioImportExportJobs(user.id);
}
