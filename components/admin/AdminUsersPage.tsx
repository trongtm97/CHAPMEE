"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { AdminCreateUserForm } from "@/components/admin/AdminCreateUserForm";
import { UserDetailPanel } from "@/components/admin/UserDetailPanel";
import { UserSummaryCards } from "@/components/admin/UserSummaryCards";
import { UserTable } from "@/components/admin/UserTable";
import { Button } from "@/components/ui";
import { listAdminUsers } from "@/lib/admin/get-users";
import { loadAdminUserDetailAction } from "@/lib/admin/load-admin-user-detail";
import { buildUserFilterQuery } from "@/lib/admin/parse-user-dashboard-filters";
import type { AdminUserListRow, UserAdminCapabilities, UserDashboardFilters, UserOperationsSummary } from "@/types/admin-user";
import type { AdminUserDetailFull } from "@/types/admin-user";

type Props = {
  initialFilters: UserDashboardFilters;
  initialUsers: AdminUserListRow[];
  initialTotal: number;
  summary: UserOperationsSummary;
  capabilities: UserAdminCapabilities;
  moderatorId: string;
  loadError?: boolean;
};

const ROLE_OPTIONS: { value: UserDashboardFilters["role"]; label: string }[] = [
  { value: "all", label: "Tất cả vai trò" },
  { value: "reader", label: "Độc giả" },
  { value: "creator", label: "Tác giả" },
  { value: "verified_creator", label: "Tác giả xác thực" },
  { value: "moderator", label: "Moderator" },
  { value: "admin", label: "Admin" },
  { value: "finance_admin", label: "Finance admin" },
  { value: "owner", label: "Owner" }
];

export function AdminUsersPage({
  initialFilters,
  initialUsers,
  initialTotal,
  summary,
  capabilities,
  moderatorId,
  loadError
}: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [users, setUsers] = useState(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialFilters.selectedUserId ?? null
  );
  const [detail, setDetail] = useState<AdminUserDetailFull | null>(null);
  const [searchInput, setSearchInput] = useState(initialFilters.query);
  const [pending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const rangeStart = total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1;
  const rangeEnd = Math.min(filters.page * filters.pageSize, total);

  const applyFilters = useCallback(
    (patch: Partial<UserDashboardFilters>) => {
      const next = { ...filters, ...patch };
      setFilters(next);
      router.push(`/admin/users${buildUserFilterQuery(next)}`);
      startTransition(async () => {
        const result = await listAdminUsers(next);
        if (!result.error) {
          setUsers(result.users);
          setTotal(result.total);
        }
      });
    },
    [filters, router]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput !== filters.query) {
        applyFilters({ query: searchInput, page: 1 });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, filters.query, applyFilters]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    startTransition(async () => {
      const result = await loadAdminUserDetailAction(selectedId);
      setDetail(result.detail);
    });
  }, [selectedId]);

  function selectUser(user: AdminUserListRow) {
    setSelectedId(user.id);
    const next = { ...filters, selectedUserId: user.id };
    setFilters(next);
    router.push(`/admin/users${buildUserFilterQuery(next)}`, { scroll: false });
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
    const next = { ...filters };
    delete next.selectedUserId;
    setFilters(next);
    router.push(`/admin/users${buildUserFilterQuery(next)}`, { scroll: false });
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-8 text-center">
        <p className="text-white">Không tải được danh sách người dùng.</p>
        <Button className="mt-4" onClick={() => router.refresh()} type="button">
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/admin">
            ← Quản trị
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-white">Quản lý người dùng</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Tìm kiếm, kiểm tra hồ sơ, phân quyền, hạn chế tài khoản và theo dõi lịch
            sử hoạt động người dùng.
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Mọi thao tác nhạy cảm như khóa tài khoản, đổi vai trò, điều chỉnh coin đều
            được ghi audit log.
          </p>
        </div>
        {capabilities.canCreateUsers ? (
          <AdminCreateUserForm
            actorRoles={capabilities.actorRoles}
            canAssignRoles={capabilities.canAssignRoles}
            onCreated={(userId) => {
              applyFilters({ page: 1 });
              setSelectedId(userId);
            }}
          />
        ) : null}
      </div>

      <UserSummaryCards onNavigate={(patch) => applyFilters({ ...patch, page: 1 })} summary={summary} />

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
        <label className="min-w-[200px] flex-1 text-xs text-zinc-500">
          Tìm kiếm
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1016] px-3 py-2 text-sm text-zinc-200"
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm username, email, tên hiển thị, user ID..."
            value={searchInput}
          />
        </label>
        <FilterSelect
          label="Vai trò"
          onChange={(v) => applyFilters({ role: v as UserDashboardFilters["role"], page: 1 })}
          options={ROLE_OPTIONS}
          value={filters.role}
        />
        <FilterSelect
          label="Trạng thái"
          onChange={(v) =>
            applyFilters({ status: v as UserDashboardFilters["status"], page: 1 })
          }
          options={[
            { value: "all", label: "Tất cả" },
            { value: "active", label: "Hoạt động" },
            { value: "restricted", label: "Bị hạn chế" },
            { value: "banned", label: "Bị khóa" },
            { value: "verified", label: "Đã xác minh" },
            { value: "pending_verification", label: "Chờ xác minh" },
            { value: "has_strike", label: "Có strike" }
          ]}
          value={filters.status}
        />
        <FilterSelect
          label="Loại tài khoản"
          onChange={(v) =>
            applyFilters({ accountType: v as UserDashboardFilters["accountType"], page: 1 })
          }
          options={[
            { value: "all", label: "Tất cả" },
            { value: "new_account", label: "Tài khoản mới" },
            { value: "has_studio", label: "Có Studio" },
            { value: "has_reports", label: "Có báo cáo" }
          ]}
          value={filters.accountType}
        />
        <FilterSelect
          label="Thời gian"
          onChange={(v) =>
            applyFilters({ timeRange: v as UserDashboardFilters["timeRange"], page: 1 })
          }
          options={[
            { value: "all", label: "Tất cả" },
            { value: "today", label: "Tạo hôm nay" },
            { value: "7d", label: "7 ngày" },
            { value: "30d", label: "30 ngày" }
          ]}
          value={filters.timeRange}
        />
        <FilterSelect
          label="Sắp xếp"
          onChange={(v) => applyFilters({ sort: v as UserDashboardFilters["sort"], page: 1 })}
          options={[
            { value: "newest", label: "Mới nhất" },
            { value: "recent_activity", label: "Hoạt động gần đây" },
            { value: "most_coins", label: "Nhiều coin nhất" },
            { value: "most_reports", label: "Nhiều report nhất" },
            { value: "most_strikes", label: "Nhiều strike nhất" }
          ]}
          value={filters.sort}
        />
        <FilterSelect
          label="/ trang"
          onChange={(v) =>
            applyFilters({
              pageSize: Number(v) as 25 | 50 | 100,
              page: 1
            })
          }
          options={[
            { value: "25", label: "25" },
            { value: "50", label: "50" },
            { value: "100", label: "100" }
          ]}
          value={String(filters.pageSize)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-400">
        <p>
          {rangeStart}–{rangeEnd} trong {total.toLocaleString("vi-VN")} người dùng
          {pending ? " · Đang tải…" : ""}
        </p>
        <div className="flex gap-2">
          <Button
            disabled={pending || filters.page <= 1}
            onClick={() => applyFilters({ page: filters.page - 1 })}
            type="button"
            variant="secondary"
          >
            Trước
          </Button>
          <span className="flex items-center px-2 text-xs">
            Trang {filters.page}/{totalPages}
          </span>
          <Button
            disabled={pending || filters.page >= totalPages}
            onClick={() => applyFilters({ page: filters.page + 1 })}
            type="button"
            variant="secondary"
          >
            Sau
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,28rem)]">
        <UserTable onSelect={selectUser} selectedId={selectedId} users={users} />
        {selectedId && detail ? (
          <UserDetailPanel
            capabilities={capabilities}
            detail={detail}
            moderatorId={moderatorId}
            onClose={closeDetail}
            onRefresh={() => {
              applyFilters({});
              void loadAdminUserDetailAction(selectedId).then((r) =>
                setDetail(r.detail)
              );
            }}
          />
        ) : (
          <div className="hidden rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-zinc-500 lg:flex lg:items-center lg:justify-center">
            Chọn một người dùng từ danh sách để xem chi tiết và thao tác.
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-zinc-500">
      {label}
      <select
        className="mt-1 block rounded-lg border border-white/10 bg-[#0b1016] px-2 py-1.5 text-sm text-zinc-200"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
