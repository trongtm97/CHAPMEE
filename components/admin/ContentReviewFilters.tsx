"use client";

import type {
  ContentReviewStatusFilter,
  ContentReviewTab
} from "@/types/admin-content-review";

export type ContentReviewFilterState = {
  search: string;
  status: ContentReviewStatusFilter;
  type: ContentReviewTab;
  genre: string;
  author: string;
  dateRange: "today" | "7d" | "30d" | "all";
  monetization: "all" | "yes" | "no";
};

type ContentReviewFiltersProps = {
  filters: ContentReviewFilterState;
  genres: string[];
  onChange: (next: Partial<ContentReviewFilterState>) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function ContentReviewFilters({
  filters,
  genres,
  onChange,
  collapsed,
  onToggleCollapse
}: ContentReviewFiltersProps) {
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
          placeholder="Tìm theo tiêu đề, tác giả, ID..."
          type="search"
          value={filters.search}
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="block space-y-1 text-xs text-zinc-500">
            Trạng thái
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) =>
                onChange({ status: e.target.value as ContentReviewStatusFilter })
              }
              value={filters.status}
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
              <option value="changes_requested">Yêu cầu sửa</option>
              <option value="hidden">Đã ẩn</option>
            </select>
          </label>

          <label className="block space-y-1 text-xs text-zinc-500">
            Loại nội dung
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) => onChange({ type: e.target.value as ContentReviewTab })}
              value={filters.type}
            >
              <option value="all">Tất cả</option>
              <option value="story">Truyện</option>
              <option value="episode">Chương</option>
              <option value="community">Bài cộng đồng</option>
              <option value="comment">Bình luận</option>
            </select>
          </label>

          <label className="block space-y-1 text-xs text-zinc-500">
            Thể loại
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) => onChange({ genre: e.target.value })}
              value={filters.genre}
            >
              <option value="">Tất cả</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-xs text-zinc-500">
            Tác giả
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) => onChange({ author: e.target.value })}
              placeholder="Tên hoặc @username"
              type="text"
              value={filters.author}
            />
          </label>

          <label className="block space-y-1 text-xs text-zinc-500">
            Ngày gửi
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) =>
                onChange({
                  dateRange: e.target.value as ContentReviewFilterState["dateRange"]
                })
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
            Kiếm tiền
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
              onChange={(e) =>
                onChange({
                  monetization: e.target.value as ContentReviewFilterState["monetization"]
                })
              }
              value={filters.monetization}
            >
              <option value="all">Tất cả</option>
              <option value="yes">Có</option>
              <option value="no">Không</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
