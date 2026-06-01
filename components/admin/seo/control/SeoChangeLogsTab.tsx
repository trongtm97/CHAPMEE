"use client";

import { useMemo, useState } from "react";
import { SEO_CHANGE_ACTION_LABELS } from "@/types/admin-seo";
import type { SeoChangeLog } from "@/types/admin-seo";

type Props = {
  logs: SeoChangeLog[];
};

const PAGE_SIZE = 25;

export function SeoChangeLogsTab({ logs }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter(
      (log) =>
        log.action.toLowerCase().includes(term) ||
        log.entity_type.toLowerCase().includes(term) ||
        (log.entity_id ?? "").toLowerCase().includes(term)
    );
  }, [logs, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-zinc-500">
        Chưa có nhật ký thay đổi SEO. Mọi chỉnh sửa rule hoặc mẫu metadata sẽ được ghi tại đây.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block max-w-md space-y-1">
        <span className="text-xs text-zinc-500">Tìm theo hành động / entity</span>
        <input
          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="update_rule, seo_rule..."
          value={search}
        />
      </label>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[900px] w-full divide-y divide-white/10 text-sm">
          <thead className="bg-zinc-950/80 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">Thời gian</th>
              <th className="px-3 py-3">Hành động</th>
              <th className="px-3 py-3">Entity</th>
              <th className="px-3 py-3">Trước</th>
              <th className="px-3 py-3">Sau</th>
              <th className="px-3 py-3">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-zinc-950/40 text-zinc-200">
            {pageItems.map((log) => (
              <tr key={log.id}>
                <td className="px-3 py-3 text-xs text-zinc-500">
                  {new Date(log.created_at).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-3 text-zinc-300">
                  {SEO_CHANGE_ACTION_LABELS[log.action] ?? log.action}
                </td>
                <td className="px-3 py-3 font-mono text-xs text-cyan-100">
                  {log.entity_type}
                  {log.entity_id ? ` · ${log.entity_id}` : ""}
                </td>
                <td className="max-w-[180px] truncate px-3 py-3 text-xs text-zinc-500">
                  {Object.keys(log.before_json).length > 0
                    ? JSON.stringify(log.before_json).slice(0, 80)
                    : "—"}
                </td>
                <td className="max-w-[180px] truncate px-3 py-3 text-xs text-zinc-400">
                  {Object.keys(log.after_json).length > 0
                    ? JSON.stringify(log.after_json).slice(0, 80)
                    : "—"}
                </td>
                <td className="px-3 py-3 text-xs text-zinc-500">{log.changed_by ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
          disabled={page >= totalPages}
          onClick={() => setPage((value) => value + 1)}
          type="button"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
