"use client";

import { NOTIFICATION_CAMPAIGN_PAGE_SIZE_OPTIONS } from "@/types/admin-notification-campaigns";
import type { NotificationCampaignListFilters } from "@/types/admin-notification-campaigns";

type Props = {
  filters: NotificationCampaignListFilters;
  total: number;
  totalPages: number;
  pending?: boolean;
  onChange: (patch: Partial<NotificationCampaignListFilters>) => void;
};

export function CampaignPagination({
  filters,
  total,
  totalPages,
  pending,
  onChange
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
      <div className="flex flex-wrap items-center gap-3">
        <p>
          {total} campaign · trang {filters.page}/{totalPages}
        </p>
        <label className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Dòng/trang</span>
          <select
            className="rounded-lg border border-white/10 bg-zinc-950 px-2 py-1 text-sm text-white"
            disabled={pending}
            onChange={(event) =>
              onChange({ pageSize: Number(event.target.value), page: 1 })
            }
            value={filters.pageSize}
          >
            {NOTIFICATION_CAMPAIGN_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 transition hover:bg-white/5 disabled:opacity-50"
          disabled={pending || filters.page <= 1}
          onClick={() => onChange({ page: filters.page - 1 })}
          type="button"
        >
          Trước
        </button>
        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 transition hover:bg-white/5 disabled:opacity-50"
          disabled={pending || filters.page >= totalPages}
          onClick={() => onChange({ page: filters.page + 1 })}
          type="button"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
