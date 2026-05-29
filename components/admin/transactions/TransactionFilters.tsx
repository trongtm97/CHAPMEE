"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import {
  TRANSACTION_PAGE_SIZE_OPTIONS,
  TRANSACTION_SORT_OPTIONS,
  TRANSACTION_SOURCE_FILTER_OPTIONS,
  TRANSACTION_STATUS_FILTER_OPTIONS,
  TRANSACTION_TYPE_FILTER_OPTIONS
} from "@/lib/admin/transactions/transaction-labels";
import type { TransactionDashboardFilters } from "@/types/admin-transaction";

type Props = {
  filters: TransactionDashboardFilters;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onChange: (patch: Partial<TransactionDashboardFilters>) => void;
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
  options: Array<{ value: string; label: string }>;
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
          <option key={opt.value || "all"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TransactionFilters({
  filters,
  searchInput,
  onSearchChange,
  onChange,
  onApply,
  onReset,
  pending
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const formBody = (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-4">
        <label className="block space-y-1 lg:col-span-2">
          <span className="text-xs text-zinc-500">Tìm kiếm</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500"
            onChange={(e) => onSearchChange(e.currentTarget.value)}
            placeholder="Tìm mã giao dịch, user, email, creator, story..."
            value={searchInput}
          />
        </label>
        <FilterSelect
          label="Loại giao dịch"
          onChange={(value) => onChange({ type: value as TransactionDashboardFilters["type"], page: 1 })}
          options={TRANSACTION_TYPE_FILTER_OPTIONS}
          value={filters.type}
        />
        <FilterSelect
          label="Trạng thái"
          onChange={(value) =>
            onChange({ status: value as TransactionDashboardFilters["status"], page: 1 })
          }
          options={TRANSACTION_STATUS_FILTER_OPTIONS}
          value={filters.status}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <FilterSelect
          label="Nguồn"
          onChange={(value) =>
            onChange({ source: value as TransactionDashboardFilters["source"], page: 1 })
          }
          options={TRANSACTION_SOURCE_FILTER_OPTIONS}
          value={filters.source}
        />
        <label className="block space-y-1 text-sm text-zinc-300">
          <span className="text-xs text-zinc-500">Từ ngày</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(e) => onChange({ startDate: e.currentTarget.value, page: 1 })}
            type="date"
            value={filters.startDate}
          />
        </label>
        <label className="block space-y-1 text-sm text-zinc-300">
          <span className="text-xs text-zinc-500">Đến ngày</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(e) => onChange({ endDate: e.currentTarget.value, page: 1 })}
            type="date"
            value={filters.endDate}
          />
        </label>
        <FilterSelect
          label="Sắp xếp"
          onChange={(value) =>
            onChange({ sort: value as TransactionDashboardFilters["sort"], page: 1 })
          }
          options={TRANSACTION_SORT_OPTIONS}
          value={filters.sort}
        />
        <FilterSelect
          label="Mỗi trang"
          onChange={(value) =>
            onChange({
              pageSize: Number(value) as TransactionDashboardFilters["pageSize"],
              page: 1
            })
          }
          options={TRANSACTION_PAGE_SIZE_OPTIONS.map((size) => ({
            value: String(size),
            label: String(size)
          }))}
          value={String(filters.pageSize)}
        />
        <div className="flex items-end gap-2">
          <Button disabled={pending} onClick={onApply} type="button">
            Lọc
          </Button>
          <Button disabled={pending} onClick={onReset} type="button" variant="ghost">
            Xóa lọc
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between lg:hidden">
        <p className="text-sm font-semibold text-white">Bộ lọc</p>
        <button
          className="text-sm text-cyan-300"
          onClick={() => setMobileOpen((open) => !open)}
          type="button"
        >
          {mobileOpen ? "Thu gọn" : "Mở rộng"}
        </button>
      </div>
      <div className="hidden lg:block">{formBody}</div>
      {mobileOpen ? <div className="lg:hidden">{formBody}</div> : null}
    </div>
  );
}
