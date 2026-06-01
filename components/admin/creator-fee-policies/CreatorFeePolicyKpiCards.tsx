"use client";

import type { CreatorFeePolicyKpiSummary } from "@/types/admin-creator-fee-policy";

type Props = {
  summary: CreatorFeePolicyKpiSummary;
  onFilterStatus?: (status: string) => void;
};

function KpiCard({
  label,
  value,
  onClick,
  highlight
}: {
  label: string;
  value: string;
  onClick?: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      className={`rounded-xl border px-3 py-3 text-left transition ${
        highlight
          ? "border-amber-400/30 bg-amber-500/10"
          : "border-white/10 bg-white/[0.03] hover:border-cyan-400/30"
      } ${onClick ? "" : "cursor-default"}`}
      disabled={!onClick}
      onClick={onClick}
      type="button"
    >
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="mt-1 text-[11px] leading-tight text-zinc-400">{label}</p>
    </button>
  );
}

export function CreatorFeePolicyKpiCards({ summary, onFilterStatus }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        label="Policy đang hoạt động"
        onClick={() => onFilterStatus?.("active")}
        value={String(summary.activeCount)}
      />
      <KpiCard
        highlight={summary.expiringSoonCount > 0}
        label="Sắp hết hạn (30 ngày)"
        value={String(summary.expiringSoonCount)}
      />
      <KpiCard label="Tác giả có custom rate" value={String(summary.customRateCreatorCount)} />
      <KpiCard label="Originals / đối tác" value={String(summary.originalsCount)} />
      <KpiCard
        label="Policy tạm dừng"
        onClick={() => onFilterStatus?.("paused")}
        value={String(summary.pausedCount)}
      />
      <KpiCard label="Giao dịch custom hôm nay" value={String(summary.customPolicyTxToday)} />
    </div>
  );
}
