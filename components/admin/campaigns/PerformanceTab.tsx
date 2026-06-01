"use client";

import { Card, EmptyState } from "@/components/ui";
import { computePerformanceSummary } from "@/components/admin/campaigns/CampaignSummaryCards";
import type {
  BrandCampaignRecord,
  CampaignMetricsSummary,
  CampaignStaffPermissions
} from "@/types/campaign";

type PerformanceTabProps = {
  campaigns: BrandCampaignRecord[];
  metrics: CampaignMetricsSummary;
  permissions: CampaignStaffPermissions;
};

function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </Card>
  );
}

export function PerformanceTab({ campaigns, metrics, permissions }: PerformanceTabProps) {
  const summary = computePerformanceSummary({ campaigns, metrics, canViewFinance: permissions.canViewFinance });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Campaign active" value={summary.active} />
        <MetricCard
          hint={permissions.canViewFinance ? undefined : "Cần quyền tài chính"}
          label="Tổng budget"
          value={
            summary.totalBudget !== null
              ? `${summary.totalBudget.toLocaleString("vi-VN")} ₫`
              : "—"
          }
        />
        <MetricCard
          hint={permissions.canViewFinance ? undefined : "Cần quyền tài chính"}
          label="Tổng revenue"
          value={
            summary.totalRevenue !== null
              ? `${summary.totalRevenue.toLocaleString("vi-VN")} ₫`
              : "—"
          }
        />
        <MetricCard
          hint={metrics.hasTrackingData ? undefined : "Chưa có dữ liệu tracking"}
          label="Impressions"
          value={metrics.hasTrackingData ? metrics.totalImpressions.toLocaleString("vi-VN") : "—"}
        />
        <MetricCard label="Clicks" value={metrics.hasTrackingData ? metrics.totalClicks.toLocaleString("vi-VN") : "—"} />
        <MetricCard label="CTR" value={summary.ctr !== null ? `${summary.ctr}%` : "—"} />
        <MetricCard label="Joins (challenge)" value={metrics.hasTrackingData ? metrics.totalJoins.toLocaleString("vi-VN") : "—"} />
      </div>

      {!metrics.hasTrackingData ? (
        <EmptyState
          description="Chưa có dữ liệu tracking. Số liệu impressions/clicks/joins sẽ hiển thị khi pipeline tracking được kết nối."
          title="Chưa có dữ liệu tracking"
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h4 className="font-semibold text-white">Top campaign (revenue)</h4>
          {summary.topCampaign ? (
            <p className="mt-2 text-sm text-zinc-300">
              {summary.topCampaign.name} —{" "}
              {permissions.canViewFinance
                ? `${(summary.topCampaign.revenueVnd ?? 0).toLocaleString("vi-VN")} ₫`
                : "—"}
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Chưa có campaign có revenue.</p>
          )}
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold text-white">Top sponsor (revenue)</h4>
          {summary.topSponsor && permissions.canViewFinance ? (
            <p className="mt-2 text-sm text-zinc-300">
              {summary.topSponsor.name} — {summary.topSponsor.revenue.toLocaleString("vi-VN")} ₫
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Chưa có dữ liệu sponsor revenue.</p>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="font-semibold text-white">Campaign gần hết hạn</h4>
        {summary.expiringSoon.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Không có campaign active sắp hết hạn.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {summary.expiringSoon.map((c) => (
              <li className="flex justify-between text-sm text-zinc-300" key={c.id}>
                <span>{c.name}</span>
                <span className="text-zinc-500">
                  {c.endsAt ? new Date(c.endsAt).toLocaleDateString("vi-VN") : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
