"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { SeoAuditTab } from "@/components/admin/seo/control/SeoAuditTab";
import { SeoChangeLogsTab } from "@/components/admin/seo/control/SeoChangeLogsTab";
import { SeoHeadingsTab } from "@/components/admin/seo/control/SeoHeadingsTab";
import { SeoMetadataTab } from "@/components/admin/seo/control/SeoMetadataTab";
import { SeoOverviewTab } from "@/components/admin/seo/control/SeoOverviewTab";
import { SeoRobotsTab } from "@/components/admin/seo/control/SeoRobotsTab";
import { SeoRulesTab } from "@/components/admin/seo/control/SeoRulesTab";
import { SeoSitemapTab } from "@/components/admin/seo/control/SeoSitemapTab";
import { TaxonomySeoGovernanceTab } from "@/components/admin/seo/control/TaxonomySeoGovernanceTab";
import { loadSeoControlCenterData } from "@/lib/admin/seo-control-data";
import { runSeoAuditAction } from "@/lib/admin/seo-audit-actions";
import type { AdminSeoCapabilities, SeoControlCenterData, SeoControlTabId } from "@/types/admin-seo";
import { SEO_CONTROL_TABS } from "@/types/admin-seo";

type Props = {
  initialTab: SeoControlTabId;
  initialData: SeoControlCenterData;
  capabilities: AdminSeoCapabilities;
};

export function AdminSeoControlCenterPage({ initialTab, initialData, capabilities }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<SeoControlTabId>(initialTab);
  const [data, setData] = useState(initialData);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setTabAndUrl = useCallback(
    (next: SeoControlTabId) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "overview") params.delete("tab");
      else params.set("tab", next);
      const query = params.toString();
      router.push(query ? `/admin/seo?${query}` : "/admin/seo");
    },
    [router, searchParams]
  );

  const refresh = useCallback(() => {
    startTransition(async () => {
      const next = await loadSeoControlCenterData();
      setData(next);
    });
  }, []);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  }

  function runAudit() {
    startTransition(async () => {
      const result = await runSeoAuditAction();
      if (result.error) {
        showToast(result.error);
        return;
      }
      showToast(`Đã quét ${result.findings.length} vấn đề SEO.`);
      refresh();
      setTabAndUrl("audit");
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">SEO Control Center</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Kiểm soát index/noindex, metadata templates, heading, sitemap, robots và audit — tránh
            hardcode SEO sai ở nhiều nơi.
          </p>
        </div>
        {capabilities.canRunAudit ? (
          <button
            className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:opacity-50"
            disabled={pending}
            onClick={runAudit}
            type="button"
          >
            {pending ? "Đang quét…" : "Chạy kiểm tra SEO"}
          </button>
        ) : null}
      </header>

      {data.error ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {data.error}
        </div>
      ) : null}

      {toast ? (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
          {toast}
        </div>
      ) : null}

      <nav className="flex flex-wrap gap-2">
        {SEO_CONTROL_TABS.map((item) => (
          <button
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              tab === item.id
                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
            }`}
            key={item.id}
            onClick={() => setTabAndUrl(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <SeoOverviewTab
          alerts={data.quickAlerts}
          capabilities={capabilities}
          onNavigate={setTabAndUrl}
          stats={data.stats}
        />
      ) : null}

      {tab === "taxonomy" ? <TaxonomySeoGovernanceTab /> : null}

      {tab === "rules" ? (
        <SeoRulesTab
          capabilities={capabilities}
          onRefresh={refresh}
          onToast={showToast}
          pending={pending}
          rules={data.rules}
        />
      ) : null}

      {tab === "metadata" ? (
        <SeoMetadataTab
          capabilities={capabilities}
          onRefresh={refresh}
          onToast={showToast}
          pending={pending}
          templates={data.metadataTemplates}
        />
      ) : null}

      {tab === "headings" ? (
        <SeoHeadingsTab capabilities={capabilities} rules={data.headingRules} />
      ) : null}

      {tab === "sitemap" ? (
        <SeoSitemapTab stats={data.sitemapStats} />
      ) : null}

      {tab === "robots" ? <SeoRobotsTab /> : null}

      {tab === "audit" ? (
        <SeoAuditTab
          capabilities={capabilities}
          findings={data.findings}
          onRefresh={refresh}
          onToast={showToast}
          pending={pending}
        />
      ) : null}

      {tab === "logs" ? <SeoChangeLogsTab logs={data.changeLogs} /> : null}

      {tab === "urls" ? (
        <div className="rounded-xl border border-white/10 p-4 text-sm text-zinc-300">
          Quản lý URL canonical, redirects và slug history tại{" "}
          <a className="text-cyan-300 underline" href="/admin/seo/urls">
            /admin/seo/urls
          </a>
          .
        </div>
      ) : null}
    </div>
  );
}
