import type { IntegrityRunRow } from "@/lib/storage/integrity-runs";

const KIND_LABELS: Record<string, string> = {
  health: "Schema health",
  chapters: "Chapter S3",
  imports: "Import S3",
  s3_orphans: "S3 orphans (sample)"
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      dateStyle: "short",
      timeStyle: "short"
    });
  } catch {
    return iso;
  }
}

function summaryLine(summary: Record<string, unknown>) {
  const parts: string[] = [];
  if (typeof summary.scanned === "number") {
    parts.push(`scanned ${summary.scanned}`);
  }
  if (typeof summary.missing === "number") {
    parts.push(`missing ${summary.missing}`);
  }
  if (typeof summary.orphans === "number") {
    parts.push(`orphans ${summary.orphans}`);
  }
  if (typeof summary.missing_raw === "number") {
    parts.push(`raw ${summary.missing_raw}`);
  }
  if (typeof summary.ok === "boolean") {
    parts.push(summary.ok ? "ok" : "fail");
  }
  return parts.length ? parts.join(" · ") : JSON.stringify(summary).slice(0, 80);
}

export function StorageIntegrityRuns({ runs }: { runs: IntegrityRunRow[] }) {
  if (runs.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        Chưa có bản ghi kiểm tra. Chạy{" "}
        <code className="text-slate-400">npm run storage:check-all</code> hoặc{" "}
        <code className="text-slate-400">storage:scheduled-dry-run</code> (cần migration
        0011).
      </p>
    );
  }

  return (
    <ul className="space-y-2 text-sm">
      {runs.map((run) => (
        <li
          key={run.check_kind}
          className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2"
        >
          <span className="font-medium text-white">
            {KIND_LABELS[run.check_kind] ?? run.check_kind}
          </span>
          <span className={run.ok ? "text-emerald-400" : "text-amber-300"}>
            {run.ok ? "OK" : "Issues"}
          </span>
          <span className="w-full text-xs text-slate-500">
            {formatWhen(run.created_at)} — {summaryLine(run.summary)}
          </span>
        </li>
      ))}
    </ul>
  );
}
