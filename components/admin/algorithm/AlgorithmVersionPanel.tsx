"use client";

import { Card } from "@/components/ui";
import type { AlgorithmSettingAuditRow } from "@/types/algorithm-settings";

type AlgorithmVersionPanelProps = {
  version: string;
  auditLogs: AlgorithmSettingAuditRow[];
  canRollback?: boolean;
};

export function AlgorithmVersionPanel({
  version,
  auditLogs,
  canRollback = false
}: AlgorithmVersionPanelProps) {
  const recent = auditLogs.slice(0, 8);

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-white">Phiên bản & thay đổi gần đây</p>
          <p className="text-xs text-zinc-500">
            Version hiện tại: <span className="font-mono text-cyan-200">{version}</span>
          </p>
        </div>
        {canRollback ? (
          <button
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400"
            disabled
            title="Rollback cần API version snapshot"
            type="button"
          >
            Rollback
          </button>
        ) : (
          <span className="text-xs text-zinc-600">Rollback: chờ backend snapshot</span>
        )}
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-zinc-500">Chưa có nhật ký thay đổi.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {recent.map((log) => (
            <li
              className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
              key={log.id}
            >
              <p className="font-mono text-xs text-cyan-200/80">{log.setting_key}</p>
              <p className="text-xs text-zinc-500">
                {new Date(log.created_at).toLocaleString("vi-VN")}
                {log.reason ? ` · ${log.reason}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
