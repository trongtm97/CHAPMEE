"use client";

import type { TaxonomyAuditLogRow } from "@/lib/taxonomy/admin-data";

type TaxonomyAuditPanelProps = {
  logs: TaxonomyAuditLogRow[];
  total: number;
  error: string | null;
  onViewAll?: () => void;
};

function formatAction(action: string) {
  return action.replace(/^taxonomy_/, "").replaceAll("_", " ");
}

export function TaxonomyAuditPanel({
  logs,
  total,
  error,
  onViewAll
}: TaxonomyAuditPanelProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Nhật ký gần đây</h3>
        {onViewAll ? (
          <button
            className="text-xs text-cyan-300 hover:underline"
            onClick={onViewAll}
            type="button"
          >
            Xem tất cả ({total}) →
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="mt-2 text-xs text-amber-200">{error}</p>
      ) : null}
      {logs.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Chưa có thao tác taxonomy được ghi.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {logs.slice(0, 6).map((log) => (
            <li
              className="rounded-lg border border-white/5 bg-zinc-950/40 px-3 py-2 text-xs"
              key={log.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-zinc-200">
                  {formatAction(log.action)}
                </span>
                <span className="text-zinc-500">
                  {new Date(log.created_at).toLocaleString("vi-VN")}
                </span>
              </div>
              <p className="mt-1 text-zinc-500">
                {log.actor_display_name ? `${log.actor_display_name} · ` : ""}
                {log.target_type ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
