"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { SeoAuditLogPanel } from "@/components/admin/content-hub/platform/SeoAuditLogPanel";
import { SeoHeadingRulesPanel } from "@/components/admin/content-hub/platform/SeoHeadingRulesPanel";
import { SeoMetadataTemplatesPanel } from "@/components/admin/content-hub/platform/SeoMetadataTemplatesPanel";
import { SeoRobotsSitemapPanel } from "@/components/admin/content-hub/platform/SeoRobotsSitemapPanel";
import { SeoRouteRulesPanel } from "@/components/admin/content-hub/platform/SeoRouteRulesPanel";
import { TaxonomySeoGovernanceTab } from "@/components/admin/seo/control/TaxonomySeoGovernanceTab";
import { runSeoAuditAction } from "@/lib/admin/seo-audit-actions";
import { SEO_GOVERNANCE_SUB_TABS } from "@/types/admin-content-hub-platform";
import type { SeoGovernanceSubTabId } from "@/types/admin-content-hub-platform";
import type { AdminSeoCapabilities, SeoDashboardData } from "@/types/admin-seo";
import type { SeoAuditLog } from "@/types/platform-content";

type Props = {
  data: SeoDashboardData;
  auditLogs: SeoAuditLog[];
  capabilities: AdminSeoCapabilities;
};

function StatCard({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warn" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-400/25 bg-emerald-500/5"
      : tone === "warn"
        ? "border-amber-400/30 bg-amber-500/10"
        : tone === "danger"
          ? "border-red-400/25 bg-red-500/10"
          : "border-white/10 bg-white/[0.03]";

  return (
    <div className={`rounded-xl border px-3 py-3 ${toneClass}`}>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="mt-1 text-[11px] leading-tight text-zinc-400">{label}</p>
    </div>
  );
}

export function SeoGovernancePanel({ data, auditLogs, capabilities }: Props) {
  const [subTab, setSubTab] = useState<SeoGovernanceSubTabId>("overview");
  const [dashboard, setDashboard] = useState(data);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRunAudit() {
    startTransition(async () => {
      const result = await runSeoAuditAction();
      if (result.error) {
        setToast(result.error);
        return;
      }
      setDashboard((prev) => ({
        ...prev,
        findings: result.findings,
        stats: {
          ...prev.stats,
          auditFindings: result.findings.length,
          criticalFindings: result.findings.filter((item) => item.severity === "critical").length,
          warningFindings: result.findings.filter(
            (item) => item.severity === "warning" || item.severity === "error"
          ).length
        }
      }));
      setToast(`Đã quét ${result.findings.length} vấn đề SEO.`);
      setSubTab("audit");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {capabilities.canRunAudit ? (
            <button
              className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:opacity-50"
              disabled={pending}
              onClick={handleRunAudit}
              type="button"
            >
              {pending ? "Đang quét…" : "Chạy kiểm tra SEO"}
            </button>
          ) : null}
          {capabilities.canUpdateRules ? (
            <Link
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5"
              href="/admin/seo/rules"
            >
              Quản lý rules đầy đủ
            </Link>
          ) : null}
        </div>
      </div>

      {toast ? (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
          {toast}
        </div>
      ) : null}

      {dashboard.error ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {dashboard.error}
        </div>
      ) : null}

      <nav className="flex flex-wrap gap-2">
        {SEO_GOVERNANCE_SUB_TABS.map((item) => (
          <button
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              subTab === item.id
                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 text-zinc-400 hover:border-white/20"
            }`}
            key={item.id}
            onClick={() => setSubTab(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {subTab === "overview" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Tổng rules" value={String(dashboard.stats.totalRules)} />
            <StatCard label="Route index" tone="success" value={String(dashboard.stats.indexableRules)} />
            <StatCard label="Route noindex" tone="warn" value={String(dashboard.stats.noindexRules)} />
            <StatCard
              label="Cần kiểm tra"
              tone={dashboard.stats.auditFindings > 0 ? "warn" : "default"}
              value={String(dashboard.stats.auditFindings)}
            />
            <StatCard
              label="Lỗi heading"
              tone={dashboard.stats.criticalFindings > 0 ? "danger" : "default"}
              value={String(dashboard.stats.criticalFindings)}
            />
            <StatCard label="Cảnh báo meta" tone="warn" value={String(dashboard.stats.warningFindings)} />
          </div>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
            <h2 className="text-lg font-semibold text-white">Nguyên tắc mặc định</h2>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li>Admin, Studio, Me, Wallet, Messages, Notifications, Settings → <strong className="text-red-200">noindex</strong></li>
              <li>Reels, Discover, Truyện, Tác giả, Bài viết công khai → có thể index theo rule</li>
              <li>Mỗi trang public chỉ có một H1 nội dung chính</li>
              <li>Canonical custom chỉ trỏ domain ChapMee hoặc path nội bộ</li>
            </ul>
          </section>
        </div>
      ) : null}

      {subTab === "taxonomy" ? <TaxonomySeoGovernanceTab /> : null}

      {subTab === "routes" ? (
        <SeoRouteRulesPanel capabilities={capabilities} rules={dashboard.rules} />
      ) : null}

      {subTab === "headings" ? <SeoHeadingRulesPanel capabilities={capabilities} /> : null}

      {subTab === "metadata" ? <SeoMetadataTemplatesPanel /> : null}

      {subTab === "robots" ? <SeoRobotsSitemapPanel /> : null}

      {subTab === "audit" ? (
        <SeoAuditLogPanel
          auditLogs={auditLogs}
          capabilities={capabilities}
          findings={dashboard.findings}
        />
      ) : null}
    </div>
  );
}
