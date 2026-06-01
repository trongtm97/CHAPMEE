"use client";

import { useMemo, useState, useTransition } from "react";
import { AUDIT_SEVERITY_STYLES } from "@/components/admin/seo/SeoBadges";
import { runSeoAuditAction } from "@/lib/admin/seo-audit-actions";
import type { SeoAuditFinding } from "@/lib/seo/audit";
import type { AdminSeoCapabilities } from "@/types/admin-seo";

type Props = {
  initialFindings: SeoAuditFinding[];
  loadError?: string | null;
  capabilities: AdminSeoCapabilities;
};

const ISSUE_LABELS: Record<string, string> = {
  private_route_indexable: "Private route indexable",
  missing_seo_title: "Thiếu SEO title",
  missing_seo_description: "Thiếu SEO description",
  missing_description: "Thiếu mô tả truyện",
  invalid_slug: "Slug invalid",
  invalid_chapter_slug: "Chapter slug invalid",
  duplicate_slug: "Slug trùng",
  missing_canonical: "Thiếu canonical",
  announcement_indexable_not_published: "Announcement chưa published"
};

export function AdminSeoAuditPage({
  initialFindings,
  loadError,
  capabilities
}: Props) {
  const [findings, setFindings] = useState(initialFindings);
  const [error, setError] = useState(loadError ?? null);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | SeoAuditFinding["severity"]>("all");
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const map = new Map<string, SeoAuditFinding[]>();
    for (const item of findings) {
      const list = map.get(item.issue_type) ?? [];
      list.push(item);
      map.set(item.issue_type, list);
    }
    return map;
  }, [findings]);

  const visible = useMemo(
    () => (filter === "all" ? findings : findings.filter((item) => item.severity === filter)),
    [findings, filter]
  );

  function handleRunAudit() {
    startTransition(async () => {
      setError(null);
      const result = await runSeoAuditAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      setFindings(result.findings);
      setToast(`Đã quét ${result.findings.length} cảnh báo.`);
      window.setTimeout(() => setToast(null), 4000);
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">SEO Audit</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Audit database/config — không crawler DOM ở MVP.
          </p>
        </div>
        {capabilities.canRunAudit ? (
          <button
            className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
            disabled={pending}
            onClick={handleRunAudit}
            type="button"
          >
            {pending ? "Đang quét…" : "Chạy audit"}
          </button>
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

      {findings.length === 0 ? (
        <p className={`rounded-xl border px-4 py-3 text-sm ${AUDIT_SEVERITY_STYLES.ok}`}>
          Không có cảnh báo — cấu hình SEO ổn.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {(["all", "critical", "error", "warning", "info"] as const).map((value) => (
              <button
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  filter === value
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                    : "border-white/10 text-zinc-400"
                }`}
                key={value}
                onClick={() => setFilter(value)}
                type="button"
              >
                {value === "all" ? "Tất cả" : value}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {[...grouped.entries()].map(([issueType, items]) => (
              <section
                className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4"
                key={issueType}
              >
                <h2 className="text-sm font-semibold text-zinc-200">
                  {ISSUE_LABELS[issueType] ?? issueType}{" "}
                  <span className="text-zinc-500">({items.length})</span>
                </h2>
                <ul className="mt-3 space-y-2">
                  {items
                    .filter((item) => filter === "all" || item.severity === filter)
                    .slice(0, 8)
                    .map((item) => (
                      <li
                        className={`rounded-lg border px-3 py-2 text-xs ${AUDIT_SEVERITY_STYLES[item.severity]}`}
                        key={item.id}
                      >
                        <p className="font-medium">{item.route}</p>
                        <p className="mt-0.5 text-zinc-300">{item.message}</p>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
            <h2 className="text-lg font-semibold text-zinc-100">Tất cả findings ({visible.length})</h2>
            <ul className="mt-4 space-y-2">
              {visible.map((item) => (
                <li
                  className={`rounded-xl border px-4 py-3 text-sm ${AUDIT_SEVERITY_STYLES[item.severity]}`}
                  key={item.id}
                >
                  <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase">
                    <span>{item.severity}</span>
                    <span className="text-zinc-400">{item.issue_type}</span>
                  </div>
                  <p className="mt-1 font-medium">{item.route}</p>
                  <p className="text-zinc-300">{item.message}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
