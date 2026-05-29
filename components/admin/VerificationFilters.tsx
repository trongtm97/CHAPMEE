"use client";

import type { VerificationDashboardFilters } from "@/types/admin-verification";

type Props = {
  filters: VerificationDashboardFilters;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onChange: (patch: Partial<VerificationDashboardFilters>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
};

export function VerificationFilters({
  filters,
  searchInput,
  onSearchChange,
  onChange,
  onReset,
  hasActiveFilters
}: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <input
        className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Tìm username, email, tên hiển thị, user ID, mã yêu cầu..."
        value={searchInput}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block space-y-1 text-xs">
          <span className="text-zinc-400">Trạng thái</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-2 text-sm text-white"
            onChange={(e) =>
              onChange({
                status: e.target.value as VerificationDashboardFilters["status"],
                page: 1,
                summaryCard: null
              })
            }
            value={filters.status}
          >
            <option value="all">Tất cả</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã xác thực</option>
            <option value="rejected">Bị từ chối</option>
            <option value="revoked">Đã thu hồi</option>
            <option value="needs_more_info">Cần bổ sung</option>
          </select>
        </label>

        <label className="block space-y-1 text-xs">
          <span className="text-zinc-400">Loại xác thực</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-2 text-sm text-white"
            onChange={(e) =>
              onChange({
                verificationType: e.target.value as VerificationDashboardFilters["verificationType"],
                page: 1,
                summaryCard: null
              })
            }
            value={filters.verificationType}
          >
            <option value="all">Tất cả</option>
            <option value="author_verified">Tác giả xác thực</option>
            <option value="official_account">Tài khoản chính thức</option>
            <option value="blue_tick">Tick xanh</option>
            <option value="organization">Tổ chức</option>
            <option value="partner">Đối tác</option>
            <option value="admin_manual">Admin cấp thủ công</option>
          </select>
        </label>

        <label className="block space-y-1 text-xs">
          <span className="text-zinc-400">Nguồn yêu cầu</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-2 text-sm text-white"
            onChange={(e) =>
              onChange({
                source: e.target.value as VerificationDashboardFilters["source"],
                page: 1,
                summaryCard: null
              })
            }
            value={filters.source}
          >
            <option value="all">Tất cả</option>
            <option value="user_request">Người dùng gửi</option>
            <option value="admin_direct">Admin cấp trực tiếp</option>
            <option value="studio">Từ trang Tác giả</option>
            <option value="moderation">Từ kiểm duyệt</option>
          </select>
        </label>

        <label className="block space-y-1 text-xs">
          <span className="text-zinc-400">Thời gian</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-2 text-sm text-white"
            onChange={(e) =>
              onChange({
                timeRange: e.target.value as VerificationDashboardFilters["timeRange"],
                page: 1,
                summaryCard: null
              })
            }
            value={filters.timeRange}
          >
            <option value="all">Tất cả</option>
            <option value="today">Hôm nay</option>
            <option value="7d">7 ngày</option>
            <option value="30d">30 ngày</option>
          </select>
        </label>

        <label className="block space-y-1 text-xs">
          <span className="text-zinc-400">Sắp xếp</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-2 text-sm text-white"
            onChange={(e) =>
              onChange({
                sort: e.target.value as VerificationDashboardFilters["sort"],
                page: 1
              })
            }
            value={filters.sort}
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="pending_longest">Chờ duyệt lâu nhất</option>
            <option value="revenue_priority">Ưu tiên tác giả có doanh thu</option>
            <option value="follower_priority">Ưu tiên tài khoản có nhiều follower</option>
          </select>
        </label>
      </div>

      {hasActiveFilters ? (
        <button
          className="text-xs text-cyan-300 hover:text-cyan-200"
          onClick={onReset}
          type="button"
        >
          Xóa bộ lọc
        </button>
      ) : null}
    </div>
  );
}
