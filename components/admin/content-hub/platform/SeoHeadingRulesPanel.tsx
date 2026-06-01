"use client";

import { useState, useTransition } from "react";
import { SEO_HEADING_RULES } from "@/lib/seo/content-hub-seo-data";
import type { AdminSeoCapabilities } from "@/types/admin-seo";

type Props = {
  capabilities: AdminSeoCapabilities;
};

const STATUS_LABELS = {
  ok: { label: "Ổn định", className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" },
  review: { label: "Cần xem", className: "border-amber-400/30 bg-amber-500/10 text-amber-100" },
  warning: { label: "Cảnh báo", className: "border-red-400/30 bg-red-500/10 text-red-100" }
} as const;

export function SeoHeadingRulesPanel({ capabilities }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRunHeadingCheck() {
    startTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setToast(
        "Kiểm tra heading (mock): quét metadata/DOM sẽ được nối sau. Hiện dùng rule tĩnh theo page group."
      );
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          Quy tắc heading theo nhóm trang — tránh nhiều H1, heading trên button/badge.
        </p>
        {capabilities.canRunAudit ? (
          <button
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
            disabled={pending}
            onClick={handleRunHeadingCheck}
            type="button"
          >
            {pending ? "Đang kiểm tra…" : "Chạy kiểm tra heading"}
          </button>
        ) : null}
      </div>

      {toast ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
          {toast}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[900px] w-full divide-y divide-white/10 text-sm">
          <thead className="bg-zinc-950/80 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">Nhóm trang</th>
              <th className="px-3 py-3">Nguồn H1</th>
              <th className="px-3 py-3">H2 được phép</th>
              <th className="px-3 py-3">Lỗi thường gặp</th>
              <th className="px-3 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-zinc-950/40 text-zinc-200">
            {SEO_HEADING_RULES.map((rule) => (
              <tr key={rule.pageGroup}>
                <td className="px-3 py-3 font-medium text-white">{rule.label}</td>
                <td className="px-3 py-3 text-zinc-300">{rule.h1Source}</td>
                <td className="px-3 py-3 text-xs text-zinc-400">{rule.allowedH2.join(" · ")}</td>
                <td className="px-3 py-3 text-xs text-zinc-500">{rule.commonMistakes.join(" · ")}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_LABELS[rule.status].className}`}
                  >
                    {STATUS_LABELS[rule.status].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
