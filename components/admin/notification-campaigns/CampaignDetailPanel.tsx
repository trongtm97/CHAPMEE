"use client";

import {
  CampaignStatusBadge,
  formatCampaignDate
} from "@/components/admin/notification-campaigns/CampaignBadges";
import { formatCampaignChannels, formatCampaignTargetSummary } from "@/lib/platform-content/parse-notification-campaign-filters";
import type { NotificationCampaign } from "@/types/platform-content";

type Props = {
  campaign: NotificationCampaign;
};

export function CampaignDetailPanel({ campaign }: Props) {
  const stats = campaign.delivery_stats;

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
      <h2 className="text-lg font-semibold text-white">Tổng quan gửi</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Người nhận dự kiến" value={String(campaign.estimated_recipient_count)} />
        <Metric label="Đã gửi" value={stats ? String(stats.sent_count) : "—"} />
        <Metric label="Đã mở" value={stats ? `${stats.open_count} (${stats.open_rate}%)` : "—"} />
        <Metric
          label="Click nội bộ"
          value={stats && campaign.href ? `${stats.click_count} (${stats.click_rate}%)` : "—"}
        />
      </div>

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <Item label="Kênh gửi" value={formatCampaignChannels(campaign)} />
        <Item label="Đối tượng" value={formatCampaignTargetSummary(campaign)} />
        <Item label="Tạo lúc" value={formatCampaignDate(campaign.created_at)} />
        <Item label="Cập nhật" value={formatCampaignDate(campaign.updated_at)} />
        <Item label="Lên lịch" value={formatCampaignDate(campaign.scheduled_at)} />
        <Item label="Đã gửi lúc" value={formatCampaignDate(campaign.sent_at)} />
        <Item label="Trạng thái">
          <CampaignStatusBadge status={campaign.status} />
        </Item>
      </dl>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function Item({
  label,
  value,
  children
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-zinc-200">{children ?? value}</dd>
    </div>
  );
}
