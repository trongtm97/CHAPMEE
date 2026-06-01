"use client";

import { useEffect, useState } from "react";
import { formatCampaignDate } from "@/components/admin/notification-campaigns/CampaignBadges";
import { getNotificationCampaignAuditLogsAction } from "@/lib/admin/notification-campaign-actions";
import { CAMPAIGN_AUDIT_ACTION_LABELS } from "@/types/admin-notification-campaigns";
import type { NotificationCampaignAuditLog } from "@/types/platform-content";

type Props = {
  campaignId: string;
};

export function CampaignAuditLog({ campaignId }: Props) {
  const [items, setItems] = useState<NotificationCampaignAuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getNotificationCampaignAuditLogsAction(campaignId).then((result) => {
      if (!active) return;
      setItems(result.items);
      setError(result.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [campaignId]);

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
      <h2 className="text-lg font-semibold text-white">Nhật ký thao tác</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Ghi lại tạo, sửa, gửi test, lên lịch, gửi, tạm dừng và các thao tác quan trọng khác.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Đang tải nhật ký…</p>
      ) : error ? (
        <p className="mt-4 text-sm text-red-300">{error}</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Chưa có nhật ký cho campaign này.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li
              className="rounded-xl border border-white/5 bg-zinc-950/80 px-4 py-3 text-sm"
              key={item.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-zinc-200">
                  {CAMPAIGN_AUDIT_ACTION_LABELS[item.action] ?? item.action}
                </p>
                <p className="text-xs text-zinc-500">{formatCampaignDate(item.created_at)}</p>
              </div>
              {Object.keys(item.metadata_json).length > 0 ? (
                <pre className="mt-2 overflow-x-auto text-xs text-zinc-500">
                  {JSON.stringify(item.metadata_json, null, 2)}
                </pre>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
