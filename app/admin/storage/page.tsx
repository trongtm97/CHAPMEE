import Link from "next/link";
import { StorageIntegrityRuns } from "@/components/admin/StorageIntegrityRuns";
import { ErrorState } from "@/components/ui";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";
import { getStorageArchiveOverview } from "@/lib/storage/archive-overview";
import { IMPORT_CLEANUP_POLICY } from "@/types/import-pipeline";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default async function AdminStorageOverviewPage() {
  const guard = await requireAdminOrModerator("/admin/storage");
  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền" />;
  }

  const overview = await getStorageArchiveOverview();

  const cards = [
    {
      label: "Chapter objects (S3)",
      value: String(overview.chapterContentObjects),
      sub: formatBytes(overview.chapterContentBytes)
    },
    {
      label: "Chapters inline DB (legacy)",
      value: String(overview.episodesInlineDbOnly),
      sub: "Chưa migrate S3 — backfill script"
    },
    {
      label: "Cache backend",
      value: overview.cacheBackend,
      sub: overview.redisConfigured ? "REDIS_URL set" : "Memory only"
    },
    {
      label: "Import jobs",
      value: String(overview.importJobsTotal),
      sub: `${overview.importJobsFailed} failed · ${overview.importItemsPublished}/${overview.importItemsTotal} items published`
    },
    {
      label: "Episodes s3, thiếu key",
      value: String(overview.episodesMissingKeyWhileS3),
      sub: "Chạy storage:check-chapters"
    },
    {
      label: "Import raw retention",
      value: `${IMPORT_CLEANUP_POLICY.rawFailedRetentionDays}d`,
      sub: `Processed temp ${IMPORT_CLEANUP_POLICY.processedTempRetentionDays}d`
    }
  ];

  return (
    <section className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Storage & lifecycle</h1>
        <p className="text-sm text-slate-300">
          PostgreSQL = metadata/search · MinIO/S3 = full chapter + import raw · không search qua
          S3 body.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <p className="text-xs text-slate-400">{card.label}</p>
            <p className="text-2xl font-semibold text-white">{card.value}</p>
            <p className="text-xs text-slate-500">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 p-4 text-sm text-slate-300">
        <h2 className="font-semibold text-white">Health & integrity (CLI)</h2>
        <ul className="list-inside list-disc space-y-1 font-mono text-xs text-slate-400">
          <li>npm run db:migrate:status</li>
          <li>npm run storage:health [--probe-s3]</li>
          <li>npm run storage:check-all [--verify-hash]</li>
          <li>npm run storage:check-chapters [--verify-hash]</li>
          <li>npm run storage:check-imports</li>
          <li>npm run storage:check-s3-orphans</li>
          <li>npm run storage:scheduled-dry-run (cron dry-run)</li>
          <li>npm run storage:cleanup-import-temp (dry-run)</li>
          <li>npm run storage:cleanup-orphan-chapters (dry-run)</li>
          <li>npm run backfill:chapter-content</li>
          <li>npm run test:chapter-content</li>
        </ul>
        <h3 className="pt-2 text-sm font-medium text-white">Lần kiểm tra gần nhất</h3>
        <StorageIntegrityRuns runs={overview.lastIntegrityRuns} />
        <p className="text-xs text-amber-200">{overview.lastCheckHint}</p>
        <p className="text-xs text-red-300">
          Không chạy docker compose down -v khi volume có dữ liệu thật.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link className="text-cyan-300 underline" href="/admin/storage-cleanup">
          Media cleanup
        </Link>
        <Link className="text-cyan-300 underline" href="/admin/imports">
          Import pipeline
        </Link>
        <span className="text-slate-500">docs/OPERATIONS_STORAGE.md · STORAGE_LIFECYCLE.md</span>
      </div>
    </section>
  );
}
