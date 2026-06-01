"use client";

import type { ImportPreviewRow } from "@/types/studio-import";
import { previewColumnsForType } from "@/lib/studio/import-export";
import type { ImportExportDataType } from "@/types/studio-import";

const STATUS_LABELS = {
  error: "Lỗi",
  valid: "Hợp lệ",
  warning: "Cảnh báo"
} as const;

const STATUS_CLASS = {
  error: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  valid: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  warning: "border-amber-400/40 bg-amber-400/10 text-amber-200"
} as const;

type ImportPreviewTableProps = {
  rows: ImportPreviewRow[];
  importType: ImportExportDataType;
};

export function ImportPreviewTable({ importType, rows }: ImportPreviewTableProps) {
  const columns = previewColumnsForType(importType);
  const previewRows = rows.slice(0, 20);

  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">Trạng thái</th>
              {columns.map((column) => (
                <th className="px-3 py-3" key={column}>
                  {column}
                </th>
              ))}
              <th className="px-3 py-3">Thông báo</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row) => (
              <tr className="border-t border-white/5" key={row.rowIndex}>
                <td className="px-3 py-3 text-zinc-500">{row.rowIndex}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${STATUS_CLASS[row.status]}`}
                  >
                    {STATUS_LABELS[row.status]}
                  </span>
                </td>
                {columns.map((column) => (
                  <td className="max-w-[12rem] truncate px-3 py-3 text-zinc-300" key={column} title={row.data[column]}>
                    {row.data[column] || "—"}
                  </td>
                ))}
                <td className="max-w-[16rem] px-3 py-3 text-xs text-zinc-400">
                  {row.messages.join(" · ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {previewRows.map((row) => (
          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-4" key={row.rowIndex}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-500">Dòng {row.rowIndex}</span>
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${STATUS_CLASS[row.status]}`}
              >
                {STATUS_LABELS[row.status]}
              </span>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              {columns.slice(0, 4).map((column) => (
                <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2" key={column}>
                  <dt className="text-zinc-500">{column}</dt>
                  <dd className="truncate text-zinc-200">{row.data[column] || "—"}</dd>
                </div>
              ))}
            </dl>
            {row.messages.length > 0 ? (
              <p className="mt-3 text-xs text-amber-200">{row.messages.join(" · ")}</p>
            ) : null}
          </article>
        ))}
      </div>

      {rows.length > 20 ? (
        <p className="text-xs text-zinc-500">Hiển thị 20/{rows.length} dòng đầu tiên.</p>
      ) : null}
    </div>
  );
}
