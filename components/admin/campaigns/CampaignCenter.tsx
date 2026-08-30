"use client";

import Link from "next/link";
import { useState } from "react";
import { CampaignFormPanel } from "@/components/admin/campaigns/CampaignFormPanel";
import { CampaignListTab } from "@/components/admin/campaigns/CampaignListTab";
import { CampaignSummaryCards } from "@/components/admin/campaigns/CampaignSummaryCards";
import { PerformanceTab } from "@/components/admin/campaigns/PerformanceTab";
import { PlacementsTab } from "@/components/admin/campaigns/PlacementsTab";
import { SettingsTab } from "@/components/admin/campaigns/SettingsTab";
import { SponsorFormPanel } from "@/components/admin/campaigns/SponsorFormPanel";
import { SponsorListTab } from "@/components/admin/campaigns/SponsorListTab";
import { Button, Card } from "@/components/ui";
import { CAMPAIGN_TABS, type CampaignTabId } from "@/lib/campaigns/constants";
import type {
  CampaignCenterSettings,
  CampaignMetricsSummary,
  CampaignStaffPermissions,
  CampaignStatus,
  CampaignWithSponsor,
  SponsorWithStats
} from "@/types/campaign";
import type { ChallengeListItem } from "@/lib/data/challenges";

type CampaignCenterProps = {
  sponsors: SponsorWithStats[];
  campaigns: CampaignWithSponsor[];
  challenges: ChallengeListItem[];
  settings: CampaignCenterSettings;
  metrics: CampaignMetricsSummary;
  permissions: CampaignStaffPermissions;
  sponsorshipEnabled: boolean;
};

export function CampaignCenter({
  sponsors,
  campaigns,
  challenges,
  settings,
  metrics,
  permissions,
  sponsorshipEnabled
}: CampaignCenterProps) {
  const [tab, setTab] = useState<CampaignTabId>("campaigns");
  const [campaignPanelOpen, setCampaignPanelOpen] = useState(false);
  const [sponsorPanelOpen, setSponsorPanelOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignWithSponsor | null>(null);
  const [editingSponsor, setEditingSponsor] = useState<SponsorWithStats | null>(null);
  const [campaignFilter, setCampaignFilter] = useState<CampaignStatus | "all">("all");

  function openCreateCampaign() {
    setEditingCampaign(null);
    setCampaignPanelOpen(true);
  }

  function openEditCampaign(campaign: CampaignWithSponsor) {
    setEditingCampaign(campaign);
    setCampaignPanelOpen(true);
  }

  function openCreateSponsor() {
    setEditingSponsor(null);
    setSponsorPanelOpen(true);
  }

  function openEditSponsor(sponsor: SponsorWithStats) {
    setEditingSponsor(sponsor);
    setSponsorPanelOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6">
      <header className="space-y-3 border-b border-white/10 pb-6">
        <nav className="text-sm text-zinc-500">
          <Link className="text-cyan-300 hover:text-cyan-200" href="/admin">
            Admin
          </Link>
          <span className="mx-2">›</span>
          <span className="text-zinc-400">Chiến dịch</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-white">Campaign Center</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Quản lý sponsor, chiến dịch tài trợ, challenge, banner/native card và vị trí hiển thị
              trong ChapMee.
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Monetization: {sponsorshipEnabled ? "đang bật" : "đang tắt"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {permissions.canCreate ? (
              <Button onClick={openCreateCampaign} type="button">
                Tạo campaign
              </Button>
            ) : null}
            {permissions.canManageSponsors ? (
              <Button onClick={openCreateSponsor} type="button" variant="secondary">
                Tạo sponsor
              </Button>
            ) : null}
            <Button
              onClick={() => {
                setCampaignFilter("active");
                setTab("campaigns");
              }}
              type="button"
              variant="ghost"
            >
              Campaign đang chạy
            </Button>
            <Button onClick={() => setTab("placements")} type="button" variant="ghost">
              Vị trí hiển thị
            </Button>
            <Link href="/admin/audit">
              <Button type="button" variant="ghost">
                Nhật ký audit
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <CampaignSummaryCards campaigns={campaigns} canViewFinance={permissions.canViewFinance} />

      <Card className="overflow-hidden p-0">
        <div className="flex overflow-x-auto border-b border-white/10">
          {CAMPAIGN_TABS.map((item) => (
            <button
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === item.id
                  ? "border-cyan-300 text-cyan-200"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
              key={item.id}
              onClick={() => setTab(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "campaigns" ? (
            <CampaignListTab
              campaigns={campaigns}
              initialFilter={campaignFilter}
              onCreate={openCreateCampaign}
              onEdit={openEditCampaign}
              permissions={permissions}
            />
          ) : null}
          {tab === "sponsors" ? (
            <SponsorListTab
              onCreate={openCreateSponsor}
              onEdit={openEditSponsor}
              permissions={permissions}
              sponsors={sponsors}
            />
          ) : null}
          {tab === "placements" ? <PlacementsTab /> : null}
          {tab === "performance" ? (
            <PerformanceTab campaigns={campaigns} metrics={metrics} permissions={permissions} />
          ) : null}
          {tab === "settings" ? <SettingsTab permissions={permissions} settings={settings} /> : null}
        </div>
      </Card>

      <CampaignFormPanel
        campaign={editingCampaign}
        challenges={challenges}
        onClose={() => {
          setCampaignPanelOpen(false);
          setEditingCampaign(null);
        }}
        open={campaignPanelOpen}
        permissions={permissions}
        sponsors={sponsors}
      />

      <SponsorFormPanel
        onClose={() => {
          setSponsorPanelOpen(false);
          setEditingSponsor(null);
        }}
        open={sponsorPanelOpen}
        permissions={permissions}
        sponsor={editingSponsor}
      />
    </div>
  );
}
