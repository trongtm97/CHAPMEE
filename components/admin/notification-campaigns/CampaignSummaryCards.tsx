"use client";

import type { NotificationCampaignStats } from "@/types/admin-notification-campaigns";

type Props = {
  stats: NotificationCampaignStats;
  onFilterStatus?: (status: string) => void;
};

function StatCard({
  label,
  value,
  onClick,
  tone
}: {
  label: string;
  value: string;
  onClick?: () => void;
  tone?: "default" | "success" | "warn" | "danger" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-400/25 bg-emerald-500/5"
      : tone === "warn"
        ? "border-amber-400/30 bg-amber-500/10"
        : tone === "danger"
          ? "border-red-400/25 bg-red-500/10"
          : tone === "muted"
            ? "border-zinc-600/30 bg-zinc-900/50"
            : "border-white/10 bg-white/[0.03]";

  return (
    <button
      className={`rounded-xl border px-3 py-3 text-left transition hover:border-cyan-400/30 ${toneClass} ${onClick ? "" : "cursor-default"}`}
      disabled={!onClick}
      onClick={onClick}
      type="button"
    >
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="mt-1 text-[11px] leading-tight text-zinc-400">{label}</p>
    </button>
  );
}

export function CampaignSummaryCards({ stats, onFilterStatus }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-10">
      <StatCard label="Tổng campaign" value={String(stats.total)} />
      <StatCard
        label="Nháp"
        onClick={() => onFilterStatus?.("draft")}
        tone="muted"
        value={String(stats.draft)}
      />
      <StatCard
        label="Đã lên lịch"
        onClick={() => onFilterStatus?.("scheduled")}
        tone="warn"
        value={String(stats.scheduled)}
      />
      <StatCard
        label="Đang gửi"
        onClick={() => onFilterStatus?.("sending")}
        tone="warn"
        value={String(stats.sending)}
      />
      <StatCard
        label="Đã gửi"
        onClick={() => onFilterStatus?.("sent")}
        tone="success"
        value={String(stats.sent)}
      />
      <StatCard
        label="Tạm dừng"
        onClick={() => onFilterStatus?.("paused")}
        value={String(stats.paused)}
      />
      <StatCard
        label="Lỗi"
        onClick={() => onFilterStatus?.("failed")}
        tone="danger"
        value={String(stats.failed)}
      />
      <StatCard
        label="Tỷ lệ mở TB"
        value={stats.avgOpenRate > 0 ? `${stats.avgOpenRate}%` : "—"}
      />
      <StatCard
        label="Người nhận gần nhất"
        value={stats.latestEstimatedRecipients > 0 ? String(stats.latestEstimatedRecipients) : "—"}
      />
      <StatCard
        label="Lưu trữ"
        onClick={() => onFilterStatus?.("archived")}
        tone="muted"
        value={String(stats.archived)}
      />
    </div>
  );
}
