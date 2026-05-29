"use client";

export type CommunityFilterState = {
  search: string;
  contentType: string;
  status: string;
  attachment: string;
  risk: string;
  dateRange: string;
  posterType: string;
};

type CommunityFiltersProps = {
  filters: CommunityFilterState;
  onChange: (next: CommunityFilterState) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export const defaultCommunityFilters: CommunityFilterState = {
  search: "",
  contentType: "all",
  status: "all",
  attachment: "all",
  risk: "all",
  dateRange: "all",
  posterType: "all"
};

export function CommunityFilters({
  filters,
  onChange,
  collapsed,
  onToggleCollapse
}: CommunityFiltersProps) {
  if (collapsed) {
    return (
      <button
        className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
        onClick={onToggleCollapse}
        type="button"
      >
        Mở bộ lọc
      </button>
    );
  }

  const set = (patch: Partial<CommunityFilterState>) =>
    onChange({ ...filters, ...patch });

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">Bộ lọc</p>
        {onToggleCollapse ? (
          <button
            className="text-xs text-zinc-500 hover:text-zinc-300"
            onClick={onToggleCollapse}
            type="button"
          >
            Thu gọn
          </button>
        ) : null}
      </div>

      <input
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
        onChange={(e) => set({ search: e.target.value })}
        placeholder="Tìm bài viết, truyện, tác giả, người đăng, ID..."
        value={filters.search}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1 text-xs text-zinc-400">
          Loại nội dung
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
            onChange={(e) => set({ contentType: e.target.value })}
            value={filters.contentType}
          >
            <option value="all">Tất cả</option>
            <option value="discussion">Thảo luận</option>
            <option value="review">Review</option>
            <option value="poll_placeholder">Poll</option>
            <option value="challenge">Challenge</option>
            <option value="comment">Bình luận</option>
          </select>
        </label>

        <label className="space-y-1 text-xs text-zinc-400">
          Trạng thái
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
            onChange={(e) => set({ status: e.target.value })}
            value={filters.status}
          >
            <option value="all">Tất cả</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Đã từ chối</option>
            <option value="hidden">Đã ẩn</option>
            <option value="reported">Bị report</option>
          </select>
        </label>

        <label className="space-y-1 text-xs text-zinc-400">
          Gắn với
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
            onChange={(e) => set({ attachment: e.target.value })}
            value={filters.attachment}
          >
            <option value="all">Tất cả</option>
            <option value="story">Truyện</option>
            <option value="episode">Chương</option>
            <option value="author">Tác giả</option>
            <option value="story_group">Nhóm truyện</option>
            <option value="none">Không gắn</option>
          </select>
        </label>

        <label className="space-y-1 text-xs text-zinc-400">
          Mức rủi ro
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
            onChange={(e) => set({ risk: e.target.value })}
            value={filters.risk}
          >
            <option value="all">Tất cả</option>
            <option value="low">Thấp</option>
            <option value="medium">Trung bình</option>
            <option value="high">Cao</option>
          </select>
        </label>

        <label className="space-y-1 text-xs text-zinc-400">
          Ngày tạo
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
            onChange={(e) => set({ dateRange: e.target.value })}
            value={filters.dateRange}
          >
            <option value="all">Tất cả</option>
            <option value="today">Hôm nay</option>
            <option value="7d">7 ngày</option>
            <option value="30d">30 ngày</option>
          </select>
        </label>

        <label className="space-y-1 text-xs text-zinc-400">
          Người đăng
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
            onChange={(e) => set({ posterType: e.target.value })}
            value={filters.posterType}
          >
            <option value="all">Tất cả</option>
            <option value="new">Tài khoản mới</option>
            <option value="warned">Tài khoản bị cảnh báo</option>
            <option value="studio">Tác giả</option>
            <option value="reader">Độc giả</option>
          </select>
        </label>
      </div>
    </div>
  );
}
