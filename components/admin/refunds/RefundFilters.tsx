"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import {
  REFUND_COIN_TYPE_FILTER_OPTIONS,
  REFUND_SORT_OPTIONS,
  REFUND_SOURCE_FILTER_OPTIONS,
  REFUND_STATUS_FILTER_OPTIONS,
  REFUND_TYPE_FILTER_OPTIONS
} from "@/lib/admin/refunds/refund-labels";
import type { RefundDashboardFilters } from "@/types/admin-refund";

type Props = {
  filters: RefundDashboardFilters;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onChange: (patch: Partial<RefundDashboardFilters>) => void;
  onApply: () => void;
  onReset: () => void;
  pending?: boolean;
};

function FilterSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1 text-sm text-zinc-300">
      <span className="text-xs text-zinc-500">{label}</span>
      <select
        className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
        onChange={(e) => onChange(e.currentTarget.value)}
        value={value}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function RefundFilters({
  filters,
  searchInput,
  onSearchChange,
  onChange,
  onApply,
  onReset,
  pending
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const form = (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-4">
        <label className="block space-y-1 lg:col-span-2">
          <span className="text-xs text-zinc-500">Tìm kiếm</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500"
            onChange={(e) => onSearchChange(e.currentTarget.value)}
            placeholder="Mã refund, username, email, truyện, transaction id..."
            value={searchInput}
          />
        </label>
        <FilterSelect
          label="Trạng thái"
          onChange={(v) =>
            onChange({ status: v as RefundDashboardFilters["status"], page: 1 })
          }
          options={REFUND_STATUS_FILTER_OPTIONS}
          value={filters.status}
        />
        <FilterSelect
          label="Loại hoàn"
          onChange={(v) =>
            onChange({ refundType: v as RefundDashboardFilters["refundType"], page: 1 })
          }
          options={REFUND_TYPE_FILTER_OPTIONS}
          value={filters.refundType}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        <FilterSelect
          label="Nguồn hoàn"
          onChange={(v) =>
            onChange({ source: v as RefundDashboardFilters["source"], page: 1 })
          }
          options={REFUND_SOURCE_FILTER_OPTIONS}
          value={filters.source}
        />
        <FilterSelect
          label="Loại coin"
          onChange={(v) =>
            onChange({ coinType: v as RefundDashboardFilters["coinType"], page: 1 })
          }
          options={REFUND_COIN_TYPE_FILTER_OPTIONS}
          value={filters.coinType}
        />
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Từ ngày</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(e) => onChange({ startDate: e.currentTarget.value, page: 1 })}
            type="date"
            value={filters.startDate}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Đến ngày</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(e) => onChange({ endDate: e.currentTarget.value, page: 1 })}
            type="date"
            value={filters.endDate}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            checked={filters.highRiskOnly}
            className="rounded border-white/20"
            onChange={(e) => onChange({ highRiskOnly: e.currentTarget.checked, page: 1 })}
            type="checkbox"
          />
          Chỉ hiện yêu cầu rủi ro cao
        </label>
        <FilterSelect
          label="Sắp xếp"
          onChange={(v) => onChange({ sort: v as RefundDashboardFilters["sort"] })}
          options={REFUND_SORT_OPTIONS}
          value={filters.sort}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button loading={pending} onClick={onApply} type="button">
          Áp dụng bộ lọc
        </Button>
        <Button onClick={onReset} type="button" variant="secondary">
          Đặt lại
        </Button>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between md:hidden">
        <p className="text-sm font-semibold text-white">Bộ lọc</p>
        <Button onClick={() => setMobileOpen((v) => !v)} type="button" variant="secondary">
          {mobileOpen ? "Ẩn" : "Hiện"}
        </Button>
      </div>
      <div className={`${mobileOpen ? "mt-3 block" : "hidden"} md:block`}>{form}</div>
    </div>
  );
}
