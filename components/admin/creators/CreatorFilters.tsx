"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import type { CreatorDashboardFilters } from "@/types/admin-creator";

const DEFAULTS: Omit<CreatorDashboardFilters, "page" | "selectedUserId" | "summaryCard"> = {
  query: "",
  studio: "all",
  monetization: "all",
  verification: "all",
  quality: "all",
  finance: "all",
  sort: "newest",
  pageSize: 25
};

type Chip = { key: keyof CreatorDashboardFilters; label: string; value: string };

const FILTER_LABELS: Record<string, Record<string, string>> = {
  studio: {
    all: "Tất cả Studio",
    active: "Studio đang hoạt động",
    suspended: "Tạm khóa Studio",
    no_studio: "Chưa có Studio"
  },
  monetization: {
    all: "Tất cả kiếm tiền",
    not_eligible: "Chưa đủ điều kiện",
    pending_review: "Chờ duyệt",
    approved: "Đã bật",
    rejected: "Bị từ chối",
    suspended: "Tạm dừng",
    permanently_disabled: "Khóa kiếm tiền"
  },
  verification: {
    all: "Tất cả xác minh",
    unverified: "Chưa xác minh",
    pending: "Chờ xác minh",
    verified: "Đã xác minh",
    blue_tick: "Tick xanh",
    rejected: "Bị từ chối"
  },
  quality: {
    all: "Tất cả chất lượng",
    normal: "Không cảnh báo",
    warned: "Có cảnh báo",
    low_quality: "Chất lượng thấp",
    hidden: "Truyện bị ẩn",
    violations: "Có vi phạm"
  },
  finance: {
    all: "Tất cả tài chính",
    has_revenue: "Có doanh thu",
    has_balance: "Có số dư rút",
    pending_payout: "Có yêu cầu rút",
    payout_disabled: "Payout tắt"
  }
};

type Props = {
  filters: CreatorDashboardFilters;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onApply: (patch: Partial<CreatorDashboardFilters>) => void;
  onReset: () => void;
};

export function CreatorFilters({
  filters,
  searchInput,
  onSearchChange,
  onApply,
  onReset
}: Props) {
  const [panelOpen, setPanelOpen] = useState(false);

  const chips: Chip[] = [];
  if (filters.studio !== "all") {
    chips.push({
      key: "studio",
      label: "Studio",
      value: FILTER_LABELS.studio[filters.studio] ?? filters.studio
    });
  }
  if (filters.monetization !== "all") {
    chips.push({
      key: "monetization",
      label: "Kiếm tiền",
      value: FILTER_LABELS.monetization[filters.monetization] ?? filters.monetization
    });
  }
  if (filters.verification !== "all") {
    chips.push({
      key: "verification",
      label: "Xác minh",
      value: FILTER_LABELS.verification[filters.verification] ?? filters.verification
    });
  }
  if (filters.quality !== "all") {
    chips.push({
      key: "quality",
      label: "Chất lượng",
      value: FILTER_LABELS.quality[filters.quality] ?? filters.quality
    });
  }
  if (filters.finance !== "all") {
    chips.push({
      key: "finance",
      label: "Tài chính",
      value: FILTER_LABELS.finance[filters.finance] ?? filters.finance
    });
  }

  const hasActiveFilters =
    chips.length > 0 || filters.query.trim().length > 0 || filters.sort !== "newest";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-[#0b1016] px-4 py-2.5 text-sm text-zinc-200"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm tác giả, username, email, tên Studio, user ID..."
          value={searchInput}
        />
        <Button onClick={() => setPanelOpen((o) => !o)} type="button" variant="secondary">
          Bộ lọc{chips.length > 0 ? ` (${chips.length})` : ""}
        </Button>
        <Button
          disabled={!hasActiveFilters}
          onClick={onReset}
          type="button"
          variant="secondary"
        >
          Reset
        </Button>
        <label className="text-xs text-zinc-500">
          Sắp xếp
          <select
            className="ml-1 rounded-lg border border-white/10 bg-[#0b1016] px-2 py-1.5 text-sm text-zinc-200"
            onChange={(e) =>
              onApply({ sort: e.target.value as CreatorDashboardFilters["sort"], page: 1 })
            }
            value={filters.sort}
          >
            <option value="newest">Mới nhất</option>
            <option value="pending_first">Chờ xử lý trước</option>
            <option value="revenue">Doanh thu cao nhất</option>
            <option value="reads">Lượt đọc cao nhất</option>
            <option value="stories">Nhiều truyện nhất</option>
            <option value="reports">Nhiều report nhất</option>
          </select>
        </label>
        <label className="text-xs text-zinc-500">
          / trang
          <select
            className="ml-1 rounded-lg border border-white/10 bg-[#0b1016] px-2 py-1.5 text-sm text-zinc-200"
            onChange={(e) =>
              onApply({
                pageSize: Number(e.target.value) as 25 | 50 | 100,
                page: 1
              })
            }
            value={String(filters.pageSize)}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
      </div>

      {panelOpen ? (
        <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:grid-cols-2 lg:grid-cols-5">
          <FilterField
            label="Studio"
            onChange={(v) => onApply({ studio: v as CreatorDashboardFilters["studio"], page: 1 })}
            options={FILTER_LABELS.studio}
            value={filters.studio}
          />
          <FilterField
            label="Kiếm tiền"
            onChange={(v) =>
              onApply({ monetization: v as CreatorDashboardFilters["monetization"], page: 1 })
            }
            options={FILTER_LABELS.monetization}
            value={filters.monetization}
          />
          <FilterField
            label="Xác minh"
            onChange={(v) =>
              onApply({ verification: v as CreatorDashboardFilters["verification"], page: 1 })
            }
            options={FILTER_LABELS.verification}
            value={filters.verification}
          />
          <FilterField
            label="Chất lượng"
            onChange={(v) => onApply({ quality: v as CreatorDashboardFilters["quality"], page: 1 })}
            options={FILTER_LABELS.quality}
            value={filters.quality}
          />
          <FilterField
            label="Tài chính"
            onChange={(v) => onApply({ finance: v as CreatorDashboardFilters["finance"], page: 1 })}
            options={FILTER_LABELS.finance}
            value={filters.finance}
          />
        </div>
      ) : null}

      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-0.5 text-xs text-cyan-200"
              key={chip.key}
            >
              {chip.label}: {chip.value}
              <button
                className="text-cyan-300/80 hover:text-white"
                onClick={() => onApply({ [chip.key]: "all", page: 1 } as Partial<CreatorDashboardFilters>)}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function getDefaultCreatorFilters(
  pageSize: CreatorDashboardFilters["pageSize"] = 25
): CreatorDashboardFilters {
  return { ...DEFAULTS, page: 1, pageSize };
}

function FilterField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs text-zinc-500">
      {label}
      <select
        className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1016] px-2 py-1.5 text-sm text-zinc-200"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        {Object.entries(options).map(([k, lbl]) => (
          <option key={k} value={k}>
            {lbl}
          </option>
        ))}
      </select>
    </label>
  );
}
