"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  exportTaxonomySeoChecklistAction,
  generateMissingTaxonomySeoFallbacksAction,
  loadTaxonomySeoGovernanceAction,
  rebuildTaxonomyCanonicalPathsAction,
  toggleTaxonomySeoIndexableAction
} from "@/lib/admin/taxonomy-seo-actions";
import type { TaxonomySeoGovernanceSnapshot } from "@/lib/admin/taxonomy-seo-governance";

export function TaxonomySeoGovernanceTab() {
  const [snapshot, setSnapshot] = useState<TaxonomySeoGovernanceSnapshot | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const result = await loadTaxonomySeoGovernanceAction();
      if (result.error && !result.snapshot) {
        setToast(result.error);
        return;
      }
      if (result.snapshot) setSnapshot(result.snapshot);
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  function runAction(label: string, fn: () => Promise<{ error: string | null; updated?: number; csv?: string | null }>) {
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        setToast(result.error);
        return;
      }
      if ("csv" in result && result.csv) {
        const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "taxonomy-seo-checklist.csv";
        anchor.click();
        URL.revokeObjectURL(url);
      }
      setToast(
        "updated" in result && result.updated != null
          ? `${label}: ${result.updated} mục.`
          : `${label} xong.`
      );
      refresh();
    });
  }

  if (!snapshot) {
    return <p className="text-sm text-zinc-500">Đang tải governance taxonomy…</p>;
  }

  const { stats, alerts } = snapshot;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white hover:border-cyan-400/40"
          disabled={pending}
          onClick={() =>
            runAction("Sinh metadata fallback", () => generateMissingTaxonomySeoFallbacksAction())
          }
          type="button"
        >
          Sinh metadata fallback
        </button>
        <button
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white hover:border-cyan-400/40"
          disabled={pending}
          onClick={() =>
            runAction("Rebuild canonical", () => rebuildTaxonomyCanonicalPathsAction())
          }
          type="button"
        >
          Rebuild canonical paths
        </button>
        <button
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white hover:border-cyan-400/40"
          disabled={pending}
          onClick={() => runAction("Export checklist", () => exportTaxonomySeoChecklistAction())}
          type="button"
        >
          Export checklist CSV
        </button>
        <Link
          className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-500/20"
          href="/admin/taxonomy"
        >
          Mở Taxonomy Admin
        </Link>
      </div>

      {toast ? <p className="text-sm text-zinc-300">{toast}</p> : null}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Active + public" value={stats.totalActivePublic} />
        <Stat label="Indexable" value={stats.indexableCount} tone="ok" />
        <Stat label="Noindex" value={stats.noindexCount} tone="warn" />
        <Stat label="Trong sitemap" value={stats.inSitemap} />
        <Stat label="Thiếu SEO title" value={stats.missingSeoTitle} tone="warn" />
        <Stat label="Thiếu mô tả" value={stats.missingDescription} tone="warn" />
        <Stat label="Không có truyện" value={stats.noStories} />
        <Stat label="Slug UUID" value={stats.uuidSlugWarnings} tone="critical" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {alerts.map((alert) => (
          <div
            className={`rounded-xl border px-4 py-3 ${
              alert.tone === "critical"
                ? "border-red-400/30 bg-red-500/10"
                : alert.tone === "warning"
                  ? "border-amber-400/30 bg-amber-500/10"
                  : alert.tone === "ok"
                    ? "border-emerald-400/25 bg-emerald-500/5"
                    : "border-violet-400/30 bg-violet-500/10"
            }`}
            key={alert.id}
          >
            <p className="text-xl font-bold text-white">{alert.count}</p>
            <p className="mt-1 text-xs text-zinc-400">{alert.label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-xs text-zinc-300">
          <thead className="border-b border-white/10 bg-white/[0.03] text-zinc-500">
            <tr>
              <th className="px-3 py-2">Tên</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Truyện</th>
              <th className="px-3 py-2">Index</th>
              <th className="px-3 py-2">Canonical</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {snapshot.rows.slice(0, 80).map((row) => (
              <tr className="border-b border-white/5" key={row.id}>
                <td className="px-3 py-2 font-medium text-white">{row.name}</td>
                <td className="px-3 py-2">{row.type}</td>
                <td className="px-3 py-2">{row.usage_count}</td>
                <td className="px-3 py-2">{row.indexable ? "yes" : "no"}</td>
                <td className="max-w-[200px] truncate px-3 py-2" title={row.resolvedCanonical ?? ""}>
                  {row.resolvedCanonical ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {row.publicUrl ? (
                      <Link
                        className="text-cyan-300 hover:underline"
                        href={row.publicUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Xem
                      </Link>
                    ) : null}
                    <button
                      className="text-amber-200 hover:underline"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await toggleTaxonomySeoIndexableAction(row.id, !row.seo_indexable);
                          refresh();
                        })
                      }
                      type="button"
                    >
                      {row.seo_indexable ? "Noindex" : "Index"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {snapshot.rows.length > 80 ? (
        <p className="text-xs text-zinc-500">Hiển thị 80/{snapshot.rows.length} — export CSV để xem đầy đủ.</p>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn" | "critical";
}) {
  const cls =
    tone === "ok"
      ? "border-emerald-400/25 bg-emerald-500/5"
      : tone === "warn"
        ? "border-amber-400/30 bg-amber-500/10"
        : tone === "critical"
          ? "border-red-400/25 bg-red-500/10"
          : "border-white/10 bg-white/[0.03]";
  return (
    <div className={`rounded-xl border px-3 py-3 ${cls}`}>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="mt-1 text-[11px] text-zinc-400">{label}</p>
    </div>
  );
}
