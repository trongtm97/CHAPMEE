"use client";

import { REPORT_REASON_OPTIONS } from "@/lib/admin/report-labels";
import type { ReportFilterState, ReportTabStatus } from "@/types/reports";

type ReportCaseFiltersProps = {
  filters: ReportFilterState;
  onChange: (next: Partial<ReportFilterState>) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function ReportCaseFilters({
  filters,
  onChange,
  collapsed,
  onToggleCollapse
}: ReportCaseFiltersProps) {
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
          placeholder="Tìm theo tiêu đề, username, ID..."
          type="search"
          value={filters.search}
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <label className="block space-y-1 text-xs text-zinc-500">
            Loại đối tượng
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) =>
                onChange({ targetType: e.target.value as ReportFilterState["targetType"] })
              }
              value={filters.targetType}
            >
              <option value="all">Tất cả</option>
              <option value="story">Truyện</option>
              <option value="chapter">Chương</option>
              <option value="comment">Bình luận</option>
              <option value="community_post">Bài cộng đồng</option>
              <option value="message">Tin nhắn</option>
              <option value="user">Tài khoản</option>
            </select>
          </label>

          <label className="block space-y-1 text-xs text-zinc-500">
            Lý do
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) =>
                onChange({ reasonCode: e.target.value as ReportFilterState["reasonCode"] })
              }
              value={filters.reasonCode}
            >
              <option value="all">Tất cả</option>
              {REPORT_REASON_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-xs text-zinc-500">
            Mức độ
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) =>
                onChange({ severity: e.target.value as ReportFilterState["severity"] })
              }
              value={filters.severity}
            >
              <option value="all">Tất cả</option>
              <option value="low">Thấp</option>
              <option value="medium">Trung bình</option>
              <option value="high">Cao</option>
              <option value="urgent">Khẩn cấp</option>
            </select>
          </label>

          <label className="block space-y-1 text-xs text-zinc-500">
            Trạng thái
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) =>
                onChange({ status: e.target.value as ReportTabStatus })
              }
              value={filters.status}
            >
              <option value="all">Tất cả</option>
              <option value="pending">Mới</option>
              <option value="reviewing">Đang xử lý</option>
              <option value="resolved">Đã xử lý</option>
              <option value="rejected">Từ chối</option>
              <option value="urgent">Khẩn cấp</option>
            </select>
          </label>

          <label className="block space-y-1 text-xs text-zinc-500">
            Ngày tạo
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) =>
                onChange({ dateRange: e.target.value as ReportFilterState["dateRange"] })
              }
              value={filters.dateRange}
            >
              <option value="all">Tất cả</option>
              <option value="today">Hôm nay</option>
              <option value="7d">7 ngày</option>
              <option value="30d">30 ngày</option>
            </select>
          </label>

          <label className="block space-y-1 text-xs text-zinc-500">
            Người xử lý
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) => onChange({ assignee: e.target.value })}
              placeholder="Tên moderator"
              type="text"
              value={filters.assignee}
            />
          </label>

          <label className="block space-y-1 text-xs text-zinc-500">
            Nhiều report
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) =>
                onChange({
                  multiReport: e.target.value as ReportFilterState["multiReport"]
                })
              }
              value={filters.multiReport}
            >
              <option value="all">Tất cả</option>
              <option value="2plus">Từ 2 report</option>
              <option value="10plus">Từ 10 report</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
