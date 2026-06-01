"use client";

import type { ContentPostStats } from "@/lib/platform-content/content-posts";

type Props = {
  stats: ContentPostStats;
  onFilterStatus?: (status: string) => void;
  onFilterSeo?: () => void;
  onFilterNoindex?: () => void;
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
  tone?: "default" | "success" | "draft" | "scheduled" | "warn" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-400/25 bg-emerald-500/5"
      : tone === "draft"
        ? "border-violet-400/20 bg-violet-500/5"
        : tone === "scheduled"
          ? "border-sky-400/25 bg-sky-500/5"
          : tone === "warn"
            ? "border-amber-400/30 bg-amber-500/10"
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

export function ContentPostSummaryCards({ stats, onFilterStatus, onFilterSeo, onFilterNoindex }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
      <StatCard label="Tổng bài viết" value={String(stats.total)} />
      <StatCard
        label="Đã đăng"
        onClick={() => onFilterStatus?.("published")}
        tone="success"
        value={String(stats.published)}
      />
      <StatCard
        label="Nháp"
        onClick={() => onFilterStatus?.("draft")}
        tone="draft"
        value={String(stats.draft)}
      />
      <StatCard
        label="Đã lên lịch"
        onClick={() => onFilterStatus?.("scheduled")}
        tone="scheduled"
        value={String(stats.scheduled)}
      />
      <StatCard
        label="Cần kiểm tra SEO"
        onClick={stats.seoIssues > 0 ? onFilterSeo : undefined}
        tone={stats.seoIssues > 0 ? "warn" : "default"}
        value={String(stats.seoIssues)}
      />
      <StatCard
        label="Không index"
        onClick={() => onFilterNoindex?.()}
        tone="muted"
        value={String(stats.noindex)}
      />
      <StatCard label="Lượt xem 30 ngày" tone="default" value={String(stats.views30d)} />
    </div>
  );
}
