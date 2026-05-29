"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import {
  WITHDRAWAL_METHOD_FILTER_OPTIONS,
  WITHDRAWAL_RISK_FILTER_OPTIONS,
  WITHDRAWAL_SORT_OPTIONS,
  WITHDRAWAL_STATUS_FILTER_OPTIONS
} from "@/lib/admin/withdrawals/withdrawal-labels";
import type { WithdrawalDashboardFilters } from "@/types/admin-withdrawal";

type Props = {
  filters: WithdrawalDashboardFilters;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onChange: (patch: Partial<WithdrawalDashboardFilters>) => void;
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

export function WithdrawalFilters({
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
            placeholder="Username, email, Studio, mã WD-..."
            value={searchInput}
          />
        </label>
        <FilterSelect
          label="Trạng thái"
          onChange={(v) =>
            onChange({ status: v as WithdrawalDashboardFilters["status"], page: 1 })
          }
          options={WITHDRAWAL_STATUS_FILTER_OPTIONS}
          value={filters.status}
        />
        <FilterSelect
          label="Phương thức nhận tiền"
          onChange={(v) =>
            onChange({ method: v as WithdrawalDashboardFilters["method"], page: 1 })
          }
          options={WITHDRAWAL_METHOD_FILTER_OPTIONS}
          value={filters.method}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
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
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Số tiền từ</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            inputMode="numeric"
            onChange={(e) => onChange({ minAmount: e.currentTarget.value, page: 1 })}
            placeholder="0"
            value={filters.minAmount}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Số tiền đến</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            inputMode="numeric"
            onChange={(e) => onChange({ maxAmount: e.currentTarget.value, page: 1 })}
            value={filters.maxAmount}
          />
        </label>
        <FilterSelect
          label="Mức rủi ro"
          onChange={(v) => onChange({ risk: v as WithdrawalDashboardFilters["risk"], page: 1 })}
          options={WITHDRAWAL_RISK_FILTER_OPTIONS}
          value={filters.risk}
        />
        <FilterSelect
          label="Sắp xếp"
          onChange={(v) => onChange({ sort: v as WithdrawalDashboardFilters["sort"], page: 1 })}
          options={WITHDRAWAL_SORT_OPTIONS}
          value={filters.sort}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={onApply} type="button">
          Lọc
        </Button>
        <Button disabled={pending} onClick={onReset} type="button" variant="secondary">
          Xóa lọc
        </Button>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between gap-2 md:hidden">
        <p className="text-sm font-semibold text-white">Bộ lọc</p>
        <Button onClick={() => setMobileOpen((v) => !v)} type="button" variant="ghost">
          {mobileOpen ? "Thu gọn" : "Mở lọc"}
        </Button>
      </div>
      <div className={mobileOpen ? "mt-3 block" : "hidden md:block"}>{form}</div>
    </div>
  );
}
