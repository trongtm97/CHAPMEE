"use client";

import type { FeedbackKpiSummary } from "@/types/admin-feedback";

type Props = {
  summary: FeedbackKpiSummary;
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

export function FeedbackKpiCards({ summary, onFilterStatus }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        label="Feedback mới"
        onClick={() => onFilterStatus?.("new")}
        value={String(summary.newCount)}
      />
      <KpiCard
        label="Đang xử lý"
        onClick={() => onFilterStatus?.("reviewing")}
        value={String(summary.reviewingCount)}
      />
      <KpiCard label="Cần phản hồi" value={String(summary.needReplyCount)} />
      <KpiCard label="Đã xử lý hôm nay" value={String(summary.resolvedTodayCount)} />
      <KpiCard
        highlight={summary.urgentCount > 0}
        label="Khẩn cấp"
        onClick={() => onFilterStatus?.("urgent-filter")}
        value={String(summary.urgentCount)}
      />
      <KpiCard label="Có ảnh đính kèm" value={String(summary.withAttachmentCount)} />
    </div>
  );
}
