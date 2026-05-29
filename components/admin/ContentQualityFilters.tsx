"use client";

import type { AdminContentQualityTab, ContentQualityRiskLevel } from "@/types/admin";

export type ContentQualityFilterState = {
  search: string;
  targetType: "story" | "chapter" | "all";
  riskLevel: ContentQualityRiskLevel | "all";
  attempt: "all" | "1" | "2" | "3";
  status: AdminContentQualityTab | "all";
  monetization: "all" | "enabled" | "disabled";
  dateRange: "all" | "today" | "7d" | "30d";
};

type ContentQualityFiltersProps = {
  filters: ContentQualityFilterState;
  onChange: (next: Partial<ContentQualityFilterState>) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function ContentQualityFilters({
  filters,
  onChange,
  collapsed,
  onToggleCollapse
}: ContentQualityFiltersProps) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-zinc-900/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-300">Bộ lọc</p>
        {onToggleCollapse ? (
          <button
            className="text-xs text-cyan-300 sm:hidden"
            onClick={onToggleCollapse}
            type="button"
          >
            {collapsed ? "Mở bộ lọc" : "Thu gọn"}
          </button>
        ) : null}
      </div>

      <div className={`space-y-3 ${collapsed ? "hidden sm:block" : ""}`}>
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Tìm theo tên truyện, chương, tác giả, ID..."
          type="search"
          value={filters.search}
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="block space-y-1 text-xs text-zinc-500">
            Loại nội dung
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) =>
                onChange({ targetType: e.target.value as ContentQualityFilterState["targetType"] })
              }
              value={filters.targetType}
            >
              <option value="all">Tất cả</option>
              <option value="story">Truyện</option>
              <option value="chapter">Chương</option>
            </select>
          </label>

          <label className="block space-y-1 text-xs text-zinc-500">
            Mức rủi ro
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) =>
                onChange({ riskLevel: e.target.value as ContentQualityFilterState["riskLevel"] })
              }
              value={filters.riskLevel}
            >
              <option value="all">Tất cả</option>
              <option value="low">Thấp</option>
              <option value="medium">Trung bình</option>
              <option value="high">Cao</option>
              <option value="critical">Rất cao</option>
            </select>
          </label>

          <label className="block space-y-1 text-xs text-zinc-500">
            Số lần xử lý
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) =>
                onChange({ attempt: e.target.value as ContentQualityFilterState["attempt"] })
              }
              value={filters.attempt}
            >
              <option value="all">Tất cả</option>
              <option value="1">Lần 1</option>
              <option value="2">Lần 2</option>
              <option value="3">Lần 3</option>
            </select>
          </label>

          <label className="block space-y-1 text-xs text-zinc-500">
            Kiếm tiền
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) =>
                onChange({
                  monetization: e.target.value as ContentQualityFilterState["monetization"]
                })
              }
              value={filters.monetization}
            >
              <option value="all">Tất cả</option>
              <option value="enabled">Đang bật</option>
              <option value="disabled">Đã tắt</option>
            </select>
          </label>

          <label className="block space-y-1 text-xs text-zinc-500">
            Ngày tạo case
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) =>
                onChange({ dateRange: e.target.value as ContentQualityFilterState["dateRange"] })
              }
              value={filters.dateRange}
            >
              <option value="all">Tất cả</option>
              <option value="today">Hôm nay</option>
              <option value="7d">7 ngày</option>
              <option value="30d">30 ngày</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
