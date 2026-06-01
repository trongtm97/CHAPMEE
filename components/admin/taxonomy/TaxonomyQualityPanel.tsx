"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import {
  CATALOG_QUALITY_CATEGORY_LABELS,
  type CatalogQualityIssue,
  type CatalogQualitySummary
} from "@/lib/taxonomy/catalog-quality";
import { TAXONOMY_TYPE_LABELS } from "@/lib/taxonomy/constants";
import type { TaxonomyAdminNotify } from "@/lib/taxonomy/admin-ui";

type TaxonomyQualityPanelProps = {
  summary: CatalogQualitySummary;
  onMessage: TaxonomyAdminNotify;
  onOpenTerm: (termId: string) => void;
  onRefresh?: () => void;
  pending?: boolean;
};

const SEVERITY_LABELS = {
  info: { label: "Info", className: "bg-sky-400/10 text-sky-200 border-sky-400/20" },
  warning: { label: "Warning", className: "bg-amber-400/10 text-amber-200 border-amber-400/20" },
  critical: { label: "Critical", className: "bg-red-400/10 text-red-200 border-red-400/20" }
} as const;

export function TaxonomyQualityPanel({
  summary,
  onMessage,
  onOpenTerm,
  onRefresh,
  pending
}: TaxonomyQualityPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const visibleIssues = useMemo(() => {
    return summary.issues.filter((issue) => {
      if (dismissed.has(issue.id)) return false;
      if (categoryFilter !== "all" && issue.category !== categoryFilter) return false;
      return true;
    });
  }, [summary.issues, dismissed, categoryFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogQualityIssue[]>();
    for (const issue of visibleIssues) {
      const list = map.get(issue.category) ?? [];
      list.push(issue);
      map.set(issue.category, list);
    }
    return map;
  }, [visibleIssues]);

  function dismiss(issue: CatalogQualityIssue) {
    setDismissed((prev) => new Set(prev).add(issue.id));
    onMessage(`Đã bỏ qua cảnh báo "${issue.title}" (phiên này).`, "success");
  }

  if (summary.totalIssues === 0) {
    return (
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-6 py-12 text-center">
        <p className="text-lg font-semibold text-emerald-100">Taxonomy ổn định</p>
        <p className="mt-2 text-sm text-zinc-400">
          Không phát hiện cảnh báo catalog-level. Hệ thống sẽ quét lại khi tải trang.
        </p>
        {onRefresh ? (
          <Button className="mt-4" disabled={pending} onClick={onRefresh} type="button" variant="secondary">
            Quét lại
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-red-200">
            {summary.criticalCount} critical
          </span>
          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-200">
            {summary.warningCount} warning
          </span>
          <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-sky-200">
            {summary.infoCount} info
          </span>
        </div>
        <div className="flex gap-2">
          <select
            className="min-h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
            onChange={(e) => setCategoryFilter(e.target.value)}
            value={categoryFilter}
          >
            <option value="all">Tất cả nhóm cảnh báo</option>
            {Object.entries(CATALOG_QUALITY_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {onRefresh ? (
            <Button disabled={pending} onClick={onRefresh} type="button" variant="secondary">
              Quét lại
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {[...grouped.entries()].map(([category, issues]) => (
          <section
            className="rounded-xl border border-white/10 bg-zinc-950/30"
            key={category}
          >
            <header className="border-b border-white/5 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">
                {CATALOG_QUALITY_CATEGORY_LABELS[category as keyof typeof CATALOG_QUALITY_CATEGORY_LABELS] ??
                  category}
              </h3>
              <p className="text-xs text-zinc-500">{issues.length} mục</p>
            </header>
            <ul className="divide-y divide-white/5">
              {issues.map((issue) => {
                const sev = SEVERITY_LABELS[issue.severity];
                return (
                  <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between" key={issue.id}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${sev.className}`}
                        >
                          {sev.label}
                        </span>
                        <span className="text-sm font-medium text-white">{issue.title}</span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">{issue.description}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {issue.termName} · {TAXONOMY_TYPE_LABELS[issue.termType]} ·{" "}
                        <code className="font-mono">{issue.termSlug}</code>
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button onClick={() => onOpenTerm(issue.termId)} type="button">
                        Xử lý
                      </Button>
                      <Button
                        onClick={() => dismiss(issue)}
                        type="button"
                        variant="secondary"
                      >
                        Bỏ qua
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
