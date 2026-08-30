"use client";

import Link from "next/link";
import type { SeoAuditResultItem } from "@/lib/seo/seo-audit-service";
import { issueMatchesTab, type SeoAuditTabId } from "@/lib/seo/seo-audit-rules";

type SeoAuditTableProps = {
  items: SeoAuditResultItem[];
  tab: SeoAuditTabId;
  selectedPath?: string | null;
  onSelect?: (item: SeoAuditResultItem) => void;
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-400",
  error: "bg-orange-400",
  warning: "bg-amber-400",
  info: "bg-cyan-400"
};

function buildActions(item: SeoAuditResultItem) {
  const path = encodeURIComponent(item.path);
  const actions: Array<{ href: string; label: string; external?: boolean }> = [
    { href: item.path, label: "Xem trang", external: true }
  ];

  if (item.group !== "redirects_404" && item.path !== "—") {
    actions.push({
      href: `/admin/seo/overrides/new?path=${path}`,
      label: "Edit override"
    });
  }

  if (item.issues.some((issue) => issue.code === "missing_content_block")) {
    actions.push({
      href: `/admin/seo/content-blocks/new?routePath=${path}`,
      label: "Add content block"
    });
  }

  if (item.issues.some((issue) => issue.code === "redirect_404_spike")) {
    actions.push({
      href: `/admin/seo/redirects/new?source_path=${path}`,
      label: "Create redirect"
    });
  }

  if (
    item.issues.some(
      (issue) =>
        issue.code === "private_route_indexable" ||
        issue.code === "robots_should_noindex"
    )
  ) {
    actions.push({
      href: `/admin/seo/overrides/new?path=${path}&noindex=1`,
      label: "Set noindex"
    });
  }

  return actions;
}

export function SeoAuditTable({ items, tab, selectedPath, onSelect }: SeoAuditTableProps) {
  const filtered = items.filter((item) => issueMatchesTab(tab, item.issues));

  if (filtered.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-6 text-sm text-zinc-400">
        Không có issue trong tab này — chạy audit nhóm hoặc chọn tab khác.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3">Route</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Issues</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => {
            const isSelected = selectedPath === item.path;
            return (
              <tr
                className={`border-b border-white/5 ${isSelected ? "bg-cyan-400/5" : "hover:bg-white/[0.02]"}`}
                key={`${item.path}:${item.group}`}
              >
                <td className="px-4 py-3">
                  <button
                    className="text-left"
                    onClick={() => onSelect?.(item)}
                    type="button"
                  >
                    <p className="font-medium text-zinc-100">{item.label}</p>
                    <p className="mt-0.5 font-mono text-xs text-zinc-500">{item.path}</p>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex min-w-10 justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                      item.score >= 85
                        ? "bg-emerald-400/15 text-emerald-200"
                        : item.score >= 60
                          ? "bg-amber-400/15 text-amber-200"
                          : "bg-red-400/15 text-red-200"
                    }`}
                  >
                    {item.score}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ul className="space-y-1">
                    {item.issues.slice(0, 3).map((issue) => (
                      <li className="flex items-start gap-2 text-xs text-zinc-300" key={issue.code}>
                        <span
                          className={`mt-1 size-1.5 shrink-0 rounded-full ${SEVERITY_DOT[issue.severity] ?? "bg-zinc-500"}`}
                        />
                        {issue.message}
                      </li>
                    ))}
                    {item.issues.length > 3 ? (
                      <li className="text-xs text-zinc-500">+{item.issues.length - 3} nữa</li>
                    ) : null}
                  </ul>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {buildActions(item).map((action) =>
                      action.external ? (
                        <a
                          className="rounded-lg border border-white/10 px-2 py-1 text-xs text-cyan-200 hover:border-cyan-400/30"
                          href={action.href}
                          key={action.label}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {action.label}
                        </a>
                      ) : (
                        <Link
                          className="rounded-lg border border-white/10 px-2 py-1 text-xs text-cyan-200 hover:border-cyan-400/30"
                          href={action.href}
                          key={action.label}
                        >
                          {action.label}
                        </Link>
                      )
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
