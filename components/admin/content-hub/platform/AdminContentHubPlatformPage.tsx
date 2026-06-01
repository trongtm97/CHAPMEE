"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminNotificationCampaignsPage } from "@/components/admin/notification-campaigns/AdminNotificationCampaignsPage";
import { SeoGovernancePanel } from "@/components/admin/content-hub/platform/SeoGovernancePanel";
import { CONTENT_HUB_PLATFORM_TABS } from "@/types/admin-content-hub-platform";
import type { ContentHubPlatformTabId } from "@/types/admin-content-hub-platform";
import type { AdminNotificationCampaignCapabilities } from "@/types/admin-notification-campaigns";
import type { NotificationCampaignListFilters } from "@/types/admin-notification-campaigns";
import type { NotificationCampaignStats } from "@/types/admin-notification-campaigns";
import type { AdminSeoCapabilities, SeoDashboardData } from "@/types/admin-seo";
import type { NotificationCampaign, SeoAuditLog } from "@/types/platform-content";

type Props = {
  initialTab?: ContentHubPlatformTabId;
  campaignFilters: NotificationCampaignListFilters;
  campaigns: NotificationCampaign[];
  campaignTotal: number;
  campaignStats: NotificationCampaignStats;
  campaignCapabilities: AdminNotificationCampaignCapabilities;
  seoData: SeoDashboardData;
  seoAuditLogs: SeoAuditLog[];
  seoCapabilities: AdminSeoCapabilities;
  loadError?: string | null;
};

export function AdminContentHubPlatformPage({
  initialTab = "campaigns",
  campaignFilters,
  campaigns,
  campaignTotal,
  campaignStats,
  campaignCapabilities,
  seoData,
  seoAuditLogs,
  seoCapabilities,
  loadError
}: Props) {
  const [tab, setTab] = useState<ContentHubPlatformTabId>(initialTab);

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
        {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Content Hub</p>
            <h1 className="text-2xl font-semibold text-white">Nội dung nền tảng</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">
              Quản trị chiến dịch thông báo in-app và kiểm soát SEO toàn hệ thống — tách biệt bài viết
              blog và thông báo nền tảng.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5"
              href="/admin/content-hub"
            >
              ← Content Hub
            </Link>
            <Link
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5"
              href="/admin/seo"
            >
              SEO Control Panel
            </Link>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-zinc-950/60 p-1.5">
          {CONTENT_HUB_PLATFORM_TABS.map((item) => (
            <button
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                tab === item.id
                  ? "bg-cyan-500 text-zinc-950"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
              key={item.id}
              onClick={() => setTab(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <p className="text-sm text-zinc-500">
          {CONTENT_HUB_PLATFORM_TABS.find((item) => item.id === tab)?.description}
        </p>
      </header>

      {tab === "campaigns" ? (
        <AdminNotificationCampaignsPage
          capabilities={campaignCapabilities}
          embedded
          initialFilters={campaignFilters}
          initialItems={campaigns}
          initialStats={campaignStats}
          initialTotal={campaignTotal}
        />
      ) : null}

      {tab === "seo" ? (
        <SeoGovernancePanel
          auditLogs={seoAuditLogs}
          capabilities={seoCapabilities}
          data={seoData}
        />
      ) : null}
    </div>
  );
}
