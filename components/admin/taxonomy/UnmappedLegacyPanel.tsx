"use client";

import type { UnmappedLegacyRow } from "@/lib/taxonomy/unmapped-legacy";
import { TAXONOMY_TYPE_LABELS } from "@/lib/taxonomy/constants";

type UnmappedLegacyPanelProps = {
  rows: UnmappedLegacyRow[];
};

const STATUS_LABELS: Record<UnmappedLegacyRow["status"], string> = {
  unresolved: "Chưa resolve",
  mapped: "Có gợi ý slug",
  ignored: "Bỏ qua"
};

export function UnmappedLegacyPanel({ rows }: UnmappedLegacyPanelProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6 text-sm text-emerald-100">
        Không có giá trị legacy chưa map. Migration 162 và taxonomy seed đã cover dữ liệu hiện
        tại.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-zinc-400">
          <tr>
            <th className="px-4 py-3 font-semibold">Field cũ</th>
            <th className="px-4 py-3 font-semibold">Giá trị</th>
            <th className="px-4 py-3 font-semibold">Số story</th>
            <th className="px-4 py-3 font-semibold">Gợi ý taxonomy</th>
            <th className="px-4 py-3 font-semibold">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-white/5" key={`${row.field}-${row.legacyValue}`}>
              <td className="px-4 py-3 font-mono text-xs text-zinc-300">{row.field}</td>
              <td className="px-4 py-3 text-white">{row.legacyValue}</td>
              <td className="px-4 py-3 text-zinc-300">{row.storyCount}</td>
              <td className="px-4 py-3 text-zinc-300">
                {row.suggestedType && row.suggestedSlug ? (
                  <>
                    {TAXONOMY_TYPE_LABELS[row.suggestedType]} →{" "}
                    <code className="text-cyan-200">{row.suggestedSlug}</code>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    row.status === "unresolved"
                      ? "bg-amber-400/15 text-amber-200"
                      : row.status === "mapped"
                        ? "bg-cyan-400/15 text-cyan-200"
                        : "bg-zinc-400/15 text-zinc-300"
                  }`}
                >
                  {STATUS_LABELS[row.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
