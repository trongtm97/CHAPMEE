"use client";

import type { BrandCampaignRecord, CampaignMetricsSummary } from "@/types/campaign";
import {
  countActiveSponsoredChallenges,
  countCampaignsByStatus,
  sumCampaignBudget,
  sumCampaignRevenue
} from "@/lib/campaigns/visibility";

type CampaignSummaryCardsProps = {
  campaigns: BrandCampaignRecord[];
  canViewFinance: boolean;
};

function SummaryCard({
  label,
  value,
  sublabel
}: {
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {sublabel ? <p className="mt-1 text-xs text-zinc-500">{sublabel}</p> : null}
    </div>
  );
}

export function CampaignSummaryCards({ campaigns, canViewFinance }: CampaignSummaryCardsProps) {
  const counts = countCampaignsByStatus(campaigns);
  const totalBudget = sumCampaignBudget(campaigns);
  const totalRevenue = sumCampaignRevenue(campaigns);
  const activeChallenges = countActiveSponsoredChallenges(campaigns);

  const formatVnd = (n: number) =>
    canViewFinance ? `${n.toLocaleString("vi-VN")} ₫` : "—";

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <SummaryCard label="Đang chạy" value={counts.active} />
      <SummaryCard label="Nháp" value={counts.draft} />
      <SummaryCard label="Đã lên lịch" value={counts.scheduled} />
      <SummaryCard label="Tạm dừng" value={counts.paused} />
      <SummaryCard label="Đã kết thúc" value={counts.ended} />
      <SummaryCard label="Tổng budget" sublabel={canViewFinance ? undefined : "Cần quyền tài chính"} value={formatVnd(totalBudget)} />
      <SummaryCard label="Revenue booked" sublabel={canViewFinance ? undefined : "Cần quyền tài chính"} value={formatVnd(totalRevenue)} />
      <SummaryCard label="Challenge tài trợ" value={activeChallenges} sublabel="đang active" />
    </div>
  );
}

export type PerformanceSummaryProps = {
  campaigns: BrandCampaignRecord[];
  metrics: CampaignMetricsSummary;
  canViewFinance: boolean;
};

export function computePerformanceSummary({
  campaigns,
  metrics,
  canViewFinance
}: PerformanceSummaryProps) {
  const active = campaigns.filter((c) => c.status === "active").length;
  const totalBudget = sumCampaignBudget(campaigns);
  const totalRevenue = sumCampaignRevenue(campaigns);
  const ctr =
    metrics.hasTrackingData && metrics.totalImpressions > 0
      ? ((metrics.totalClicks / metrics.totalImpressions) * 100).toFixed(2)
      : null;

  const topCampaign = [...campaigns]
    .filter((c) => (c.revenueVnd ?? 0) > 0)
    .sort((a, b) => (b.revenueVnd ?? 0) - (a.revenueVnd ?? 0))[0];

  const sponsorRevenue = new Map<string, { name: string; revenue: number }>();
  for (const c of campaigns) {
    if (!c.sponsorId) continue;
    const prev = sponsorRevenue.get(c.sponsorId) ?? { name: c.sponsorId, revenue: 0 };
    prev.revenue += c.revenueVnd ?? 0;
    sponsorRevenue.set(c.sponsorId, prev);
  }
  const topSponsor = [...sponsorRevenue.values()].sort((a, b) => b.revenue - a.revenue)[0];

  const expiringSoon = campaigns
    .filter((c) => c.status === "active" && c.endsAt)
    .sort((a, b) => new Date(a.endsAt!).getTime() - new Date(b.endsAt!).getTime())
    .slice(0, 5);

  return {
    active,
    totalBudget: canViewFinance ? totalBudget : null,
    totalRevenue: canViewFinance ? totalRevenue : null,
    metrics,
    ctr,
    topCampaign,
    topSponsor,
    expiringSoon
  };
}
