"use client";

import { useMemo, useState, useTransition } from "react";
import { SeoGooglePreview } from "@/components/admin/seo/SeoGooglePreview";
import { SeoAuditScore } from "@/components/admin/seo/SeoAuditScore";
import { SeoAuditTable } from "@/components/admin/seo/SeoAuditTable";
import { SeoSocialPreview } from "@/components/admin/seo/SeoSocialPreview";
import { runSeoAuditGroupAction } from "@/lib/admin/seo-audit-actions";
import type { SeoAuditBatchResult, SeoAuditResultItem } from "@/lib/seo/seo-audit-service";
import {
  SEO_AUDIT_GROUP_LABELS,
  SEO_AUDIT_GROUPS,
  SEO_AUDIT_TABS,
  issueMatchesTab,
  type SeoAuditGroup,
  type SeoAuditTabId
} from "@/lib/seo/seo-audit-rules";
import type { AdminSeoCapabilities } from "@/types/admin-seo";

type Props = {
  initialItems: SeoAuditResultItem[];
  capabilities: AdminSeoCapabilities;
};

export function SeoAuditDashboard({ initialItems, capabilities }: Props) {
  const [tab, setTab] = useState<SeoAuditTabId>("overview");
  const [group, setGroup] = useState<SeoAuditGroup>("static");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState(initialItems);
  const [batch, setBatch] = useState<SeoAuditBatchResult | null>(null);
  const [selected, setSelected] = useState<SeoAuditResultItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const displayItems = batch?.items.length ? batch.items : items;

  const overviewStats = useMemo(() => {
    const source = displayItems;
    const issueCount = source.reduce((sum, item) => sum + item.issues.length, 0);
    const criticalCount = source.reduce(
      (sum, item) => sum + item.issues.filter((issue) => issue.severity === "critical").length,
      0
    );
    const averageScore =
      source.length > 0
        ? Math.round(source.reduce((sum, item) => sum + item.score, 0) / source.length)
        : 0;
    return { issueCount, criticalCount, averageScore, count: source.length };
  }, [displayItems]);

  const tabCounts = useMemo(() => {
    const counts: Record<SeoAuditTabId, number> = {
      overview: displayItems.filter((item) => item.issues.length > 0).length,
      missing_metadata: 0,
      missing_og: 0,
      noindex: 0,
      missing_content_block: 0,
      redirects_404: 0,
      headings: 0
    };
    for (const item of displayItems) {
      for (const tabItem of SEO_AUDIT_TABS) {
        if (tabItem.id !== "overview" && issueMatchesTab(tabItem.id, item.issues)) {
          counts[tabItem.id] += 1;
        }
      }
    }
    return counts;
  }, [displayItems]);

  function handleRunAudit(nextPage = page) {
    if (!capabilities.canRunAudit) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await runSeoAuditGroupAction(group, nextPage);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBatch(result);
      setItems((prev) => {
        const map = new Map(prev.map((item) => [`${item.path}:${item.group}`, item]));
        for (const item of result.items) {
          map.set(`${item.path}:${item.group}`, item);
        }
        return [...map.values()];
      });
      setPage(result.page);
      setToast(
        `Audit ${SEO_AUDIT_GROUP_LABELS[group]} — ${result.items.length} trang, score TB ${result.summary.averageScore}.`
      );
      window.setTimeout(() => setToast(null), 5000);
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">SEO Audit</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Kiểm tra metadata, OG, canonical, noindex và SEO content blocks — compute theo batch,
            không scan toàn DB mỗi lần load.
          </p>
        </div>
        {capabilities.canRunAudit ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1 text-xs text-zinc-500">
              Nhóm audit
              <select
                className="block rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
                onChange={(event) => {
                  setGroup(event.target.value as SeoAuditGroup);
                  setPage(1);
                  setBatch(null);
                }}
                value={group}
              >
                {SEO_AUDIT_GROUPS.map((value) => (
                  <option key={value} value={value}>
                    {SEO_AUDIT_GROUP_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
              disabled={pending}
              onClick={() => handleRunAudit(page)}
              type="button"
            >
              {pending ? "Đang audit…" : "Chạy audit nhóm"}
            </button>
          </div>
        ) : null}
      </header>

      {toast ? (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
          {toast}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <SeoAuditScore
          label={batch ? `Score — ${SEO_AUDIT_GROUP_LABELS[group]}` : "Score gần nhất"}
          score={batch?.summary.averageScore ?? overviewStats.averageScore}
        />
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 text-sm text-zinc-300">
          <p>
            Trang đã kiểm tra: <span className="font-semibold text-zinc-100">{overviewStats.count}</span>
          </p>
          <p className="mt-2">
            Issues: <span className="font-semibold text-amber-200">{overviewStats.issueCount}</span>
          </p>
          <p className="mt-2">
            Critical: <span className="font-semibold text-red-200">{overviewStats.criticalCount}</span>
          </p>
          {batch ? (
            <p className="mt-3 text-xs text-zinc-500">
              Batch {batch.page}/{batch.totalPages} · tổng {batch.total} targets trong nhóm
            </p>
          ) : (
            <p className="mt-3 text-xs text-zinc-500">
              Chọn nhóm và bấm &quot;Chạy audit nhóm&quot; — mặc định 25 items/batch.
            </p>
          )}
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {SEO_AUDIT_TABS.map((item) => (
          <button
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              tab === item.id
                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 text-zinc-400 hover:text-zinc-200"
            }`}
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            {item.label}
            {tabCounts[item.id] > 0 ? ` (${tabCounts[item.id]})` : ""}
          </button>
        ))}
      </nav>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <SeoAuditTable
            items={displayItems}
            onSelect={setSelected}
            selectedPath={selected?.path ?? null}
            tab={tab}
          />

          {batch && batch.totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm">
              <p className="text-zinc-500">
                Trang {batch.page}/{batch.totalPages} · {batch.total} targets
              </p>
              <div className="flex gap-2">
                <button
                  className="rounded-full border border-white/10 px-3 py-1.5 font-semibold text-zinc-200 hover:bg-white/[0.04] disabled:opacity-40"
                  disabled={pending || batch.page <= 1}
                  onClick={() => handleRunAudit(batch.page - 1)}
                  type="button"
                >
                  ← Trước
                </button>
                <button
                  className="rounded-full border border-white/10 px-3 py-1.5 font-semibold text-zinc-200 hover:bg-white/[0.04] disabled:opacity-40"
                  disabled={pending || batch.page >= batch.totalPages}
                  onClick={() => handleRunAudit(batch.page + 1)}
                  type="button"
                >
                  Sau →
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Preview</h2>
          {selected ? (
            <>
              <SeoGooglePreview
                description={selected.preview.description}
                title={selected.preview.title}
                url={selected.preview.canonical ?? selected.path}
              />
              <SeoSocialPreview
                description={selected.preview.description}
                imageUrl={selected.preview.ogImageUrl}
                title={selected.preview.title}
                url={selected.preview.canonical ?? selected.path}
              />
              <ul className="space-y-1 text-xs text-zinc-400">
                <li>Override: {selected.preview.hasOverride ? "Có" : "Không"}</li>
                <li>Content block: {selected.preview.hasContentBlock ? "Có" : "Không"}</li>
                <li>Indexable: {selected.preview.indexable ? "Có" : "Noindex"}</li>
              </ul>
            </>
          ) : (
            <p className="text-sm text-zinc-500">
              Chọn một dòng trong bảng để xem Google/Social preview.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
