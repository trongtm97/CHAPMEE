"use client";

import { useState, useTransition } from "react";
import type { AdminSeoCapabilities, SeoHeadingGovernanceRule } from "@/types/admin-seo";

type Props = {
  rules: SeoHeadingGovernanceRule[];
  capabilities: AdminSeoCapabilities;
};

const STATUS_LABELS = {
  ok: { label: "Ổn định", className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" },
  review: { label: "Cần xem", className: "border-amber-400/30 bg-amber-500/10 text-amber-100" },
  warning: { label: "Cảnh báo", className: "border-red-400/30 bg-red-500/10 text-red-100" }
} as const;

export function SeoHeadingsTab({ rules, capabilities }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRunHeadingCheck() {
    startTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const issueCount = rules.reduce((sum, rule) => sum + rule.issues.length, 0);
      setToast(
        issueCount > 0
          ? `Phát hiện ${issueCount} vấn đề heading từ audit gần nhất.`
          : "Không phát hiện lỗi heading nghiêm trọng trong audit gần nhất."
      );
      window.setTimeout(() => setToast(null), 4000);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-zinc-400">
          Mỗi loại trang chỉ được 1 H1 mô tả nội dung chính. H2 cho section, H3 cho subsection — không
          nhảy cấp (H1 → H4).
        </p>
        {capabilities.canRunAudit ? (
          <button
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
            disabled={pending}
            onClick={handleRunHeadingCheck}
            type="button"
          >
            {pending ? "Đang kiểm tra…" : "Chạy audit heading"}
          </button>
        ) : null}
      </div>

      {toast ? (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
          {toast}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[1000px] w-full divide-y divide-white/10 text-sm">
          <thead className="bg-zinc-950/80 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">Loại trang</th>
              <th className="px-3 py-3">Route ví dụ</th>
              <th className="px-3 py-3">H1 mong đợi</th>
              <th className="px-3 py-3">H2 được phép</th>
              <th className="px-3 py-3">Trạng thái</th>
              <th className="px-3 py-3">Vấn đề</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-zinc-950/40 text-zinc-200">
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td className="px-3 py-3 font-medium text-white">{rule.page_type}</td>
                <td className="px-3 py-3 font-mono text-xs text-cyan-100">{rule.route_example ?? "—"}</td>
                <td className="px-3 py-3 text-zinc-300">{rule.expected_h1}</td>
                <td className="px-3 py-3 text-xs text-zinc-400">{rule.allowed_h2.join(" · ") || "—"}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_LABELS[rule.status].className}`}
                  >
                    {STATUS_LABELS[rule.status].label}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-zinc-500">
                  {rule.issues.length > 0 ? rule.issues.join("; ") : "Không có"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
