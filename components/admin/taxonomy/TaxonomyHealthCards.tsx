"use client";

import type { TaxonomyAdminDashboardStats } from "@/lib/taxonomy/admin-data";

type TaxonomyHealthCardsProps = {
  stats: TaxonomyAdminDashboardStats;
  qualityAlerts?: number;
  onNavigate?: (target: "requests" | "quality" | "manage") => void;
};

type CardTone = "cyan" | "green" | "amber" | "red" | "purple" | "zinc";

function HealthCard({
  label,
  value,
  hint,
  tone,
  onClick
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone: CardTone;
  onClick?: () => void;
}) {
  const toneClasses: Record<CardTone, string> = {
    cyan: "border-cyan-400/25 bg-cyan-400/8",
    green: "border-emerald-400/25 bg-emerald-400/8",
    amber: "border-amber-400/25 bg-amber-400/8",
    red: "border-red-400/25 bg-red-400/8",
    purple: "border-violet-400/25 bg-violet-400/8",
    zinc: "border-white/10 bg-white/[0.03]"
  };

  const valueClasses: Record<CardTone, string> = {
    cyan: "text-cyan-100",
    green: "text-emerald-100",
    amber: "text-amber-100",
    red: "text-red-100",
    purple: "text-violet-100",
    zinc: "text-white"
  };

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      className={`rounded-xl border px-4 py-3 text-left transition ${toneClasses[tone]} ${onClick ? "hover:brightness-110 cursor-pointer" : ""}`}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`mt-1 truncate text-xl font-bold ${valueClasses[tone]}`}>{value}</p>
      {hint ? <p className="mt-1 truncate text-xs text-zinc-500">{hint}</p> : null}
    </Tag>
  );
}

export function TaxonomyHealthCards({
  stats,
  qualityAlerts = stats.qualityAlerts,
  onNavigate
}: TaxonomyHealthCardsProps) {
  const topUsage = stats.topUsage
    ? `${stats.topUsage.name} (${stats.topUsage.usage_count})`
    : "—";

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <HealthCard label="Tổng taxonomy" tone="cyan" value={stats.totalTerms} />
      <HealthCard hint="Đang bật" label="Đang hoạt động" tone="green" value={stats.activeTerms} />
      <HealthCard label="Đang tắt" tone="zinc" value={stats.inactiveTerms} />
      <HealthCard
        hint={stats.pendingRequests > 0 ? "Cần duyệt" : undefined}
        label="Yêu cầu chờ duyệt"
        onClick={stats.pendingRequests > 0 ? () => onNavigate?.("requests") : undefined}
        tone="amber"
        value={stats.pendingRequests}
      />
      <HealthCard hint="Usage cao nhất" label="Top usage" tone="purple" value={topUsage} />
      <HealthCard
        hint={qualityAlerts > 0 ? "Cần xử lý" : "Ổn định"}
        label="Cảnh báo cần xử lý"
        onClick={qualityAlerts > 0 ? () => onNavigate?.("quality") : undefined}
        tone={qualityAlerts > 0 ? "red" : "green"}
        value={qualityAlerts}
      />
    </div>
  );
}

/** @deprecated Use TaxonomyHealthCards */
export const TaxonomyStatsCards = TaxonomyHealthCards;
