"use client";

import { formatVnd } from "@/lib/admin/withdrawals/withdrawal-labels";
import type { WithdrawalKpiSummary } from "@/types/admin-withdrawal";

type Props = {
  summary: WithdrawalKpiSummary;
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

export function WithdrawalKpiCards({ summary, onFilterStatus }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5 lg:grid-cols-10">
      <KpiCard
        label="Chờ duyệt"
        onClick={() => onFilterStatus?.("pending")}
        value={String(summary.pendingCount)}
      />
      <KpiCard
        label="Đã duyệt"
        onClick={() => onFilterStatus?.("approved")}
        value={String(summary.approvedCount)}
      />
      <KpiCard
        label="Đang xử lý"
        onClick={() => onFilterStatus?.("processing")}
        value={String(summary.processingCount)}
      />
      <KpiCard
        label="Đã thanh toán"
        onClick={() => onFilterStatus?.("paid")}
        value={String(summary.paidCount)}
      />
      <KpiCard
        label="Bị từ chối"
        onClick={() => onFilterStatus?.("rejected")}
        value={String(summary.rejectedCount)}
      />
      <KpiCard
        label="Thất bại"
        onClick={() => onFilterStatus?.("failed")}
        value={String(summary.failedCount)}
      />
      <KpiCard label="Tổng tiền chờ duyệt" value={formatVnd(summary.pendingAmountVnd)} />
      <KpiCard label="Đã thanh toán trong kỳ" value={formatVnd(summary.paidAmountInPeriodVnd)} />
      <KpiCard label="Tác giả đang chờ rút" value={String(summary.creatorsWaitingCount)} />
      <KpiCard
        highlight={summary.riskAlertCount > 0}
        label="Cảnh báo rủi ro"
        onClick={() => onFilterStatus?.("pending")}
        value={String(summary.riskAlertCount)}
      />
    </div>
  );
}
