"use client";

import type { AnnouncementStats } from "@/lib/platform-content/announcements";

type Props = {
  stats: AnnouncementStats;
  onFilterStatus?: (status: string) => void;
  onFilterSeo?: () => void;
};

function StatCard({
  label,
  value,
  onClick,
  highlight,
  tone
}: {
  label: string;
  value: string;
  onClick?: () => void;
  highlight?: boolean;
  tone?: "default" | "success" | "warn" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-400/25 bg-emerald-500/5"
      : tone === "warn"
        ? "border-amber-400/30 bg-amber-500/10"
        : tone === "muted"
          ? "border-zinc-600/30 bg-zinc-900/50"
          : highlight
            ? "border-amber-400/30 bg-amber-500/10"
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

export function AnnouncementSummaryCards({ stats, onFilterStatus, onFilterSeo }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
      <StatCard label="Tổng thông báo" value={String(stats.total)} />
      <StatCard
        label="Đang đăng"
        onClick={() => onFilterStatus?.("published")}
        tone="success"
        value={String(stats.published)}
      />
      <StatCard
        label="Đã lên lịch"
        onClick={() => onFilterStatus?.("scheduled")}
        value={String(stats.scheduled)}
      />
      <StatCard
        label="Nháp"
        onClick={() => onFilterStatus?.("draft")}
        tone="muted"
        value={String(stats.draft)}
      />
      <StatCard
        label="Đã ẩn / Archived"
        onClick={() => onFilterStatus?.("hidden")}
        tone="muted"
        value={String(stats.hidden + stats.archived)}
      />
      <StatCard
        highlight={stats.seoIssues > 0}
        label="Cần xem lại SEO"
        onClick={stats.seoIssues > 0 ? onFilterSeo : undefined}
        tone={stats.seoIssues > 0 ? "warn" : "default"}
        value={String(stats.seoIssues)}
      />
    </div>
  );
}
