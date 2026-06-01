"use client";

import type { AdminSeoCapabilities, SeoControlTabId, SeoDashboardStats, SeoQuickAlert } from "@/types/admin-seo";

type Props = {
  stats: SeoDashboardStats;
  alerts: SeoQuickAlert[];
  capabilities: AdminSeoCapabilities;
  onNavigate: (tab: SeoControlTabId) => void;
};

function StatCard({
  label,
  value,
  tone,
  onClick
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "critical" | "info" | "neutral";
  onClick?: () => void;
}) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-400/25 bg-emerald-500/5"
      : tone === "warn"
        ? "border-amber-400/30 bg-amber-500/10"
        : tone === "critical"
          ? "border-red-400/25 bg-red-500/10"
          : tone === "info"
            ? "border-violet-400/25 bg-violet-500/10"
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

export function SeoOverviewTab({ stats, alerts, onNavigate }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Tổng quy tắc SEO" value={String(stats.totalRules)} onClick={() => onNavigate("rules")} />
        <StatCard label="Được index" tone="ok" value={String(stats.indexableRules)} onClick={() => onNavigate("rules")} />
        <StatCard label="Không index" tone="warn" value={String(stats.noindexRules)} onClick={() => onNavigate("rules")} />
        <StatCard label="Theo liên kết" tone="ok" value={String(stats.followRules)} />
        <StatCard label="Không theo liên kết" value={String(stats.nofollowRules)} />
        <StatCard label="Trong sitemap" tone="info" value={String(stats.sitemapIncluded)} onClick={() => onNavigate("sitemap")} />
        <StatCard label="Loại khỏi sitemap" value={String(stats.sitemapExcluded)} />
        <StatCard label="Mẫu metadata" tone="info" value={String(stats.metadataTemplates)} onClick={() => onNavigate("metadata")} />
        <StatCard label="Cảnh báo audit" tone={stats.auditFindings > 0 ? "warn" : "ok"} value={String(stats.auditFindings)} onClick={() => onNavigate("audit")} />
        <StatCard label="Lỗi nghiêm trọng" tone={stats.criticalFindings > 0 ? "critical" : "ok"} value={String(stats.criticalFindings)} onClick={() => onNavigate("audit")} />
        <StatCard label="Taxonomy SEO" tone="info" value="→" onClick={() => onNavigate("taxonomy")} />
      </div>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
        <h2 className="text-lg font-semibold text-white">Cảnh báo nhanh</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alert) => (
            <div
              className={`rounded-xl border px-4 py-3 ${
                alert.tone === "critical"
                  ? "border-red-400/30 bg-red-500/10"
                  : alert.tone === "warning"
                    ? "border-amber-400/30 bg-amber-500/10"
                    : alert.tone === "info"
                      ? "border-violet-400/30 bg-violet-500/10"
                      : "border-emerald-400/25 bg-emerald-500/5"
              }`}
              key={alert.id}
            >
              <p className="text-xl font-bold text-white">{alert.count}</p>
              <p className="mt-1 text-xs text-zinc-400">{alert.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <h3 className="font-semibold text-white">Trạng thái sitemap</h3>
          <p className="mt-2 text-sm text-zinc-400">
            {stats.sitemapStatus === "ok" ? "Ổn định — chỉ route indexable được đưa vào sitemap." : "Có vấn đề cần xem trong tab Sitemap."}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <h3 className="font-semibold text-white">Trạng thái robots</h3>
          <p className="mt-2 text-sm text-zinc-400">
            {stats.robotsStatus === "ok" ? "Robots chặn đúng admin/studio/private." : "Có route indexable có thể bị robots chặn."}
          </p>
        </div>
      </section>
    </div>
  );
}
