import Link from "next/link";
import { ImportPipelineUploadForm } from "@/components/admin/imports/ImportPipelineUploadForm";
import { ErrorState } from "@/components/ui";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";
import { listImportJobs } from "@/lib/import/pipeline/import-jobs";
import { createAdminClient } from "@/lib/data/admin";
import { IMPORT_CLEANUP_POLICY } from "@/types/import-pipeline";

export const dynamic = "force-dynamic";

export default async function AdminImportsPage() {
  const guard = await requireAdminOrModerator("/admin/imports");
  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền" />;
  }

  const db = createAdminClient();
  const jobs = await listImportJobs(db, { limit: 40 });

  return (
    <section className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Import pipeline</h1>
        <p className="text-sm text-slate-300">
          Raw file → MinIO → parse → review → publish (draft/private mặc định). Không import nội
          dung không có quyền.
        </p>
        <p className="text-xs text-slate-400">
          Cleanup (TODO): raw failed {IMPORT_CLEANUP_POLICY.rawFailedRetentionDays}d, processed temp{" "}
          {IMPORT_CLEANUP_POLICY.processedTempRetentionDays}d.
        </p>
      </header>

      <ImportPipelineUploadForm />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Jobs gần đây</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có job.</p>
        ) : (
          <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
            {jobs.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <Link className="font-medium text-cyan-300 hover:underline" href={`/admin/imports/${job.id}`}>
                    {job.original_filename ?? job.id.slice(0, 8)}
                  </Link>
                  <p className="text-xs text-slate-400">
                    {job.status} · {job.total_items} items · dup {job.duplicate_count} · fail{" "}
                    {job.failed_count}
                  </p>
                </div>
                <time className="text-xs text-slate-500">
                  {new Date(job.created_at).toLocaleString("vi-VN")}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
