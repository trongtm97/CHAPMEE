import Link from "next/link";
import { notFound } from "next/navigation";
import { ImportJobReviewForm } from "@/components/admin/imports/ImportJobReviewForm";
import { ImportPipelineFlash } from "@/components/admin/imports/ImportPipelineFlash";
import { ErrorState } from "@/components/ui";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";
import {
  cancelImportJobFormAction,
  parseImportJobFormAction
} from "@/lib/admin/import-pipeline-actions";
import {
  getImportJobById,
  listImportItemsForJob
} from "@/lib/import/pipeline/import-jobs";
import { createAdminClient } from "@/lib/data/admin";
import { IMPORT_CLEANUP_POLICY } from "@/types/import-pipeline";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ jobId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminImportJobDetailPage({ params, searchParams }: PageProps) {
  const { jobId } = await params;
  const query = (await searchParams) ?? {};
  const guard = await requireAdminOrModerator(`/admin/imports/${jobId}`);
  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền" />;
  }

  const db = createAdminClient();
  const job = await getImportJobById(db, jobId);
  if (!job) {
    notFound();
  }

  const items = await listImportItemsForJob(db, jobId);
  const canParse = ["uploaded", "parsed", "failed"].includes(job.status);
  const storyPublished = items.find(
    (item) => item.item_type === "story" && item.target_story_id
  );

  return (
    <section className="mx-auto max-w-5xl space-y-6 p-6">
      <Link className="text-sm text-cyan-300" href="/admin/imports">
        ← Danh sách import
      </Link>

      <ImportPipelineFlash
        error={firstParam(query.error)}
        info={firstParam(query.info)}
        success={firstParam(query.success)}
      />

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
        Chỉ import nội dung bạn có quyền sử dụng. Không đăng bản dịch/tác phẩm có bản quyền nếu chưa
        được phép.
      </div>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">{job.original_filename ?? "Import job"}</h1>
        <p className="text-sm text-slate-300">
          Status: <strong>{job.status}</strong>
          {job.source_name ? (
            <>
              {" "}
              · Nguồn: <code>{job.source_name}</code>
            </>
          ) : null}
        </p>
        <p className="text-xs text-slate-400 break-all">Raw: {job.raw_object_key}</p>
        {job.owner_profile_id ? (
          <p className="text-xs text-slate-400">Owner profile: {job.owner_profile_id}</p>
        ) : null}
        {job.error_message ? (
          <p className="text-sm text-red-300">{job.error_message}</p>
        ) : null}
        <p className="text-xs text-slate-400">
          Tổng {job.total_items} · OK {job.success_count} · Dup {job.duplicate_count} · Fail{" "}
          {job.failed_count}
        </p>
        {storyPublished?.target_story_id ? (
          <p className="text-sm">
            <Link
              className="text-cyan-300 underline"
              href={`/studio/stories/${storyPublished.target_story_id}/chapters`}
            >
              Mở truyện đã publish trong Studio →
            </Link>
          </p>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2">
        <form action={parseImportJobFormAction}>
          <input name="job_id" type="hidden" value={jobId} />
          <button
            className="rounded bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-40"
            disabled={!canParse}
            title={canParse ? undefined : "Không parse job ở trạng thái hiện tại"}
            type="submit"
          >
            {job.status === "parsed" ? "Parse lại (xóa items cũ)" : "Parse job"}
          </button>
        </form>
        <form action={cancelImportJobFormAction}>
          <input name="job_id" type="hidden" value={jobId} />
          <button
            className="rounded border border-red-500/50 px-3 py-2 text-sm text-red-200 disabled:opacity-40"
            disabled={job.status === "cancelled" || job.status === "published"}
            type="submit"
          >
            Cancel job
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400">
          Chưa có items — upload xong bấm Parse (hoặc tick auto-parse lúc upload).
        </p>
      ) : (
        <ImportJobReviewForm
          items={items}
          jobId={jobId}
          ownerProfileId={job.owner_profile_id}
        />
      )}

      <p className="text-xs text-slate-500">
        Cleanup policy: raw failed {IMPORT_CLEANUP_POLICY.rawFailedRetentionDays}d · processed{" "}
        {IMPORT_CLEANUP_POLICY.processedTempRetentionDays}d ·{" "}
        <code>npm run import:cleanup -- --dry-run</code>
      </p>
    </section>
  );
}
