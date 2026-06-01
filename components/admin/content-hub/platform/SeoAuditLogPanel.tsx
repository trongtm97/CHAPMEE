"use client";

import { useMemo, useState } from "react";
import { AUDIT_SEVERITY_STYLES } from "@/components/admin/seo/SeoBadges";
import type { SeoAuditFinding } from "@/lib/seo/audit";
import type { AdminSeoCapabilities } from "@/types/admin-seo";
import type { SeoAuditLog } from "@/types/platform-content";

type Props = {
  findings: SeoAuditFinding[];
  auditLogs: SeoAuditLog[];
  capabilities: AdminSeoCapabilities;
};

const PAGE_SIZE = 20;

export function SeoAuditLogPanel({ findings, auditLogs, capabilities }: Props) {
  const [tab, setTab] = useState<"findings" | "changes">("findings");
  const [severity, setSeverity] = useState<"all" | SeoAuditFinding["severity"]>("all");
  const [page, setPage] = useState(1);

  const visibleFindings = useMemo(() => {
    const items =
      severity === "all" ? findings : findings.filter((item) => item.severity === severity);
    return items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [findings, severity, page]);

  const findingsTotalPages = Math.max(
    1,
    Math.ceil(
      (severity === "all"
        ? findings.length
        : findings.filter((item) => item.severity === severity).length) / PAGE_SIZE
    )
  );

  if (!capabilities.canViewAudit) {
    return (
      <div className="rounded-2xl border border-white/10 px-6 py-10 text-center text-sm text-zinc-500">
        Bạn không có quyền xem audit SEO.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
            tab === "findings"
              ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
              : "border-white/10 text-zinc-400"
          }`}
          onClick={() => setTab("findings")}
          type="button"
        >
          Kết quả kiểm tra ({findings.length})
        </button>
        <button
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
            tab === "changes"
              ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
              : "border-white/10 text-zinc-400"
          }`}
          onClick={() => setTab("changes")}
          type="button"
        >
          Lịch sử thay đổi ({auditLogs.length})
        </button>
      </div>

      {tab === "findings" ? (
        <>
          <div className="flex flex-wrap gap-2">
            {(["all", "critical", "error", "warning", "info"] as const).map((value) => (
              <button
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  severity === value
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                    : "border-white/10 text-zinc-400"
                }`}
                key={value}
                onClick={() => {
                  setSeverity(value);
                  setPage(1);
                }}
                type="button"
              >
                {value === "all" ? "Tất cả" : value}
              </button>
            ))}
          </div>

          {visibleFindings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-400/20 bg-emerald-400/5 px-6 py-10 text-center text-sm text-emerald-100">
              Không có cảnh báo SEO trong lần quét gần nhất.
            </div>
          ) : (
            <ul className="space-y-2">
              {visibleFindings.map((item, index) => (
                <li
                  className="rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm"
                  key={`${item.route}-${item.issue_type}-${index}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${AUDIT_SEVERITY_STYLES[item.severity]}`}
                    >
                      {item.severity}
                    </span>
                    <span className="font-mono text-xs text-cyan-100">{item.route}</span>
                  </div>
                  <p className="mt-2 text-zinc-300">{item.message}</p>
                  <p className="mt-1 text-xs text-zinc-500">{item.issue_type}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end gap-2">
            <button
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              type="button"
            >
              Trước
            </button>
            <button
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={page >= findingsTotalPages}
              onClick={() => setPage((value) => value + 1)}
              type="button"
            >
              Sau
            </button>
          </div>
        </>
      ) : null}

      {tab === "changes" ? (
        auditLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-zinc-500">
            Chưa có log thay đổi rule trong DB — sẽ ghi khi admin sửa rule.
          </div>
        ) : (
          <ul className="space-y-2">
            {auditLogs.slice(0, PAGE_SIZE).map((log) => (
              <li
                className="rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm"
                key={log.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-cyan-100">{log.route}</span>
                  <span className="text-xs text-zinc-500">
                    {new Date(log.created_at).toLocaleString("vi-VN")}
                  </span>
                </div>
                <p className="mt-2 text-zinc-300">{log.message}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {log.issue_type} · {log.severity}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
