"use client";

import { Button } from "@/components/ui";
import {
  CREATOR_FEE_CREATOR_TYPE_LABELS,
  CREATOR_FEE_REVENUE_SOURCES,
  CREATOR_FEE_STATUS_LABELS
} from "@/lib/admin/creator-fee-policies/constants";
import type { CreatorFeePolicyDashboardFilters } from "@/types/admin-creator-fee-policy";

type Props = {
  filters: CreatorFeePolicyDashboardFilters;
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  onApply: (patch?: Partial<CreatorFeePolicyDashboardFilters>) => void;
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
    <label className="block min-w-0 space-y-1">
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

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  ...Object.entries(CREATOR_FEE_STATUS_LABELS).map(([value, label]) => ({ value, label }))
];

const CREATOR_TYPE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  ...Object.entries(CREATOR_FEE_CREATOR_TYPE_LABELS).map(([value, label]) => ({ value, label }))
];

const REVENUE_SOURCE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  ...CREATOR_FEE_REVENUE_SOURCES.map((s) => ({ value: s.id, label: s.label }))
];

const EFFECTIVE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "currently_effective", label: "Đang hiệu lực" },
  { value: "upcoming", label: "Sắp hiệu lực" },
  { value: "past", label: "Đã hết hạn" }
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "expiring_soon", label: "Sắp hết hạn" },
  { value: "creator_revenue_desc", label: "Doanh thu cao" },
  { value: "custom_rate_desc", label: "Custom rate cao" },
  { value: "custom_rate_asc", label: "Custom rate thấp" }
];

export function CreatorFeePolicyFilters({
  filters,
  searchInput,
  onSearchInputChange,
  onApply,
  onReset,
  pending
}: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="block min-w-0 space-y-1 md:col-span-2 xl:col-span-2">
            <span className="text-xs text-zinc-500">Tìm kiếm</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500"
              onChange={(e) => onSearchInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onApply({ search: searchInput, page: 1 })}
              placeholder="Username, email, tên, Studio, user_id..."
              value={searchInput}
            />
          </label>
          <FilterSelect
            label="Trạng thái"
            onChange={(v) =>
              onApply({ status: v as CreatorFeePolicyDashboardFilters["status"], page: 1 })
            }
            options={STATUS_OPTIONS}
            value={filters.status}
          />
          <FilterSelect
            label="Loại tác giả"
            onChange={(v) =>
              onApply({ creatorType: v as CreatorFeePolicyDashboardFilters["creatorType"], page: 1 })
            }
            options={CREATOR_TYPE_OPTIONS}
            value={filters.creatorType}
          />
          <FilterSelect
            label="Nguồn doanh thu"
            onChange={(v) =>
              onApply({
                revenueSource: v as CreatorFeePolicyDashboardFilters["revenueSource"],
                page: 1
              })
            }
            options={REVENUE_SOURCE_OPTIONS}
            value={filters.revenueSource}
          />
          <FilterSelect
            label="Hiệu lực"
            onChange={(v) =>
              onApply({ effective: v as CreatorFeePolicyDashboardFilters["effective"], page: 1 })
            }
            options={EFFECTIVE_OPTIONS}
            value={filters.effective}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <FilterSelect
              label="Sắp xếp"
              onChange={(v) =>
                onApply({ sort: v as CreatorFeePolicyDashboardFilters["sort"], page: 1 })
              }
              options={SORT_OPTIONS}
              value={filters.sort}
            />
          </div>
          <div className="flex shrink-0 flex-nowrap gap-2">
            <Button
              disabled={pending}
              loading={pending}
              onClick={() => onApply({ search: searchInput, page: 1 })}
              type="button"
            >
              Áp dụng
            </Button>
            <Button disabled={pending} onClick={onReset} type="button" variant="secondary">
              Đặt lại
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
