"use client";

import { useState } from "react";
import {
  CAMPAIGN_CHANNEL_FILTER_OPTIONS,
  CAMPAIGN_SEGMENT_FILTER_OPTIONS,
  CAMPAIGN_SORT_OPTIONS,
  CAMPAIGN_STATUS_FILTER_OPTIONS,
  CAMPAIGN_TYPE_FILTER_OPTIONS
} from "@/types/admin-notification-campaigns";
import type { NotificationCampaignListFilters } from "@/types/admin-notification-campaigns";

type Props = {
  filters: NotificationCampaignListFilters;
  searchInput: string;
  pending?: boolean;
  onSearchInputChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onChange: (patch: Partial<NotificationCampaignListFilters>) => void;
};

function FilterChip({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
          : "border-white/10 bg-zinc-950/80 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export function CampaignFilters({
  filters,
  searchInput,
  pending,
  onSearchInputChange,
  onApply,
  onReset,
  onChange
}: Props) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-300">Bộ lọc campaign</p>
        <button
          className="text-xs text-cyan-300 lg:hidden"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "Thu gọn" : "Mở rộng"}
        </button>
      </div>

      <div className={`space-y-4 ${expanded ? "" : "hidden lg:block"}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="min-w-0 flex-1 space-y-1">
            <span className="text-xs text-zinc-500">Tìm kiếm</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
              onChange={(event) => onSearchInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onApply();
              }}
              placeholder="Tên, tiêu đề, nội dung, ID campaign..."
              value={searchInput}
            />
          </label>

          <label className="w-full space-y-1 lg:w-48">
            <span className="text-xs text-zinc-500">Sắp xếp</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(event) =>
                onChange({
                  sort: event.target.value as NotificationCampaignListFilters["sort"],
                  page: 1
                })
              }
              value={filters.sort}
            >
              {CAMPAIGN_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <button
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:opacity-60"
              disabled={pending}
              onClick={onApply}
              type="button"
            >
              Áp dụng
            </button>
            <button
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
              disabled={pending}
              onClick={onReset}
              type="button"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Loại thông báo</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(event) =>
                onChange({
                  notificationType: event.target
                    .value as NotificationCampaignListFilters["notificationType"],
                  page: 1
                })
              }
              value={filters.notificationType}
            >
              {CAMPAIGN_TYPE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Kênh gửi</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(event) =>
                onChange({
                  channel: event.target.value as NotificationCampaignListFilters["channel"],
                  page: 1
                })
              }
              value={filters.channel}
            >
              {CAMPAIGN_CHANNEL_FILTER_OPTIONS.map((option) => (
                <option disabled={option.value === "push" || option.value === "email"} key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Nhóm đối tượng</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(event) =>
                onChange({
                  segment: event.target.value as NotificationCampaignListFilters["segment"],
                  page: 1
                })
              }
              value={filters.segment}
            >
              {CAMPAIGN_SEGMENT_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Tạo từ ngày</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(event) => onChange({ createdFrom: event.target.value, page: 1 })}
              type="date"
              value={filters.createdFrom}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Tạo đến ngày</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(event) => onChange({ createdTo: event.target.value, page: 1 })}
              type="date"
              value={filters.createdTo}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Gửi từ ngày</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(event) => onChange({ sentFrom: event.target.value, page: 1 })}
              type="date"
              value={filters.sentFrom}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Gửi đến ngày</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(event) => onChange({ sentTo: event.target.value, page: 1 })}
              type="date"
              value={filters.sentTo}
            />
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Trạng thái</p>
          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_STATUS_FILTER_OPTIONS.map((option) => (
              <FilterChip
                active={filters.status === option.value}
                key={option.value}
                label={option.label}
                onClick={() =>
                  onChange({
                    status: option.value as NotificationCampaignListFilters["status"],
                    page: 1
                  })
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
