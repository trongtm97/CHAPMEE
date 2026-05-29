"use client";

import { formatCoin, formatVnd } from "@/lib/admin/refunds/refund-labels";
import type { RefundKpiSummary } from "@/types/admin-refund";

type Props = {
  summary: RefundKpiSummary;
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
          ? "border-rose-400/30 bg-rose-500/10"
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

export function RefundKpiCards({ summary, onFilterStatus }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
      <KpiCard
        label="Yêu cầu đang chờ"
        onClick={() => onFilterStatus?.("pending")}
        value={String(summary.pendingCount)}
      />
      <KpiCard
        label="Đang xử lý"
        onClick={() => onFilterStatus?.("processing")}
        value={String(summary.processingCount)}
      />
      <KpiCard label="Đã hoàn hôm nay" value={String(summary.completedTodayCount)} />
      <KpiCard label="Tổng coin đã hoàn" value={formatCoin(summary.totalCoinRefunded)} />
      <KpiCard label="Tổng VND đã hoàn" value={formatVnd(summary.totalVndRefunded)} />
      <KpiCard
        label="Hoàn do nội dung thấp"
        onClick={() => onFilterStatus?.("quality_low_refund")}
        value={String(summary.qualityLowCount)}
      />
      <KpiCard label="Hoàn do admin thủ công" value={String(summary.adminManualCount)} />
      <KpiCard
        highlight={summary.failedOrReviewCount > 0}
        label="Thất bại / cần kiểm tra"
        onClick={() => onFilterStatus?.("failed")}
        value={String(summary.failedOrReviewCount)}
      />
    </div>
  );
}
