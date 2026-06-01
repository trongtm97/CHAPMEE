"use client";

import { Card } from "@/components/ui";
import type {
  AlgorithmHealthCheck,
  AlgorithmHealthStatus,
  AlgorithmControlTabId
} from "@/types/algorithm-settings";

const STATUS_LABEL: Record<AlgorithmHealthStatus, string> = {
  ok: "Ổn định",
  warning: "Cần xem xét",
  critical: "Nguy hiểm"
};

const STATUS_STYLE: Record<AlgorithmHealthStatus, string> = {
  ok: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  critical: "border-red-400/30 bg-red-400/10 text-red-100"
};

const CHECK_BADGE: Record<AlgorithmHealthStatus, string> = {
  ok: "bg-emerald-400/20 text-emerald-200",
  warning: "bg-amber-400/20 text-amber-200",
  critical: "bg-red-400/20 text-red-200"
};

type AlgorithmHealthPanelProps = {
  status: AlgorithmHealthStatus;
  checks: AlgorithmHealthCheck[];
  onViewDetail?: (tab: AlgorithmControlTabId) => void;
};

export function AlgorithmHealthPanel({
  status,
  checks,
  onViewDetail
}: AlgorithmHealthPanelProps) {
  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">Algorithm Health</p>
          <p className="text-xs text-zinc-500">Kiểm tra nhanh trước khi publish cấu hình.</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      <ul className="space-y-2">
        {checks.length === 0 ? (
          <li className="text-sm text-zinc-500">Chưa có dữ liệu kiểm tra.</li>
        ) : (
          checks.map((check) => (
            <li
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
              key={check.id}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${CHECK_BADGE[check.status]}`}
                  >
                    {check.status}
                  </span>
                  <span className="text-sm font-medium text-zinc-200">{check.label}</span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">{check.message}</p>
              </div>
              {check.tabId && onViewDetail ? (
                <button
                  className="shrink-0 text-xs font-medium text-cyan-300 hover:underline"
                  onClick={() => onViewDetail(check.tabId!)}
                  type="button"
                >
                  Xem chi tiết
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}
