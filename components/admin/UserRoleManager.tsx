"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { BanUserDialog } from "@/components/admin/BanUserDialog";
import { UserSearch } from "@/components/admin/UserSearch";
import { Button, Card } from "@/components/ui";
import { assignUserRole } from "@/lib/admin/assign-role";
import { banUserAction, unbanUserAction } from "@/lib/admin/ban-user";
import {
  getAdminUserDetail,
  searchAdminUsers,
  type AdminUserSearchResult
} from "@/lib/admin/get-users";
import { filterAssignableRoles, isElevatedRole } from "@/lib/admin/rbac-policy";
import { removeUserRole } from "@/lib/admin/remove-role";
import { AdminCreateUserForm } from "@/components/admin/AdminCreateUserForm";
import { formatAdminRoleLabel, formatProfileStatusLabel } from "@/lib/admin/role-labels";
import type { RoleCode } from "@/types/permissions";

const ALL_ROLES: RoleCode[] = [
  "reader",
  "creator",
  "verified_creator",
  "vip_user",
  "moderator",
  "content_admin",
  "finance_admin",
  "support_admin",
  "admin",
  "super_admin",
  "owner"
];

type UserRoleManagerProps = {
  canAssignRoles: boolean;
  canBanUsers: boolean;
  canCreateUsers?: boolean;
  actorRoles: RoleCode[];
};

type ToastState = { type: "success" | "error"; message: string } | null;

export function UserRoleManager({
  canAssignRoles,
  canBanUsers,
  canCreateUsers = false,
  actorRoles
}: UserRoleManagerProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [users, setUsers] = useState<AdminUserSearchResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserSearchResult | null>(null);
  const [assignRole, setAssignRole] = useState<RoleCode>("reader");
  const [toast, setToast] = useState<ToastState>(null);
  const [banOpen, setBanOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{
    userId: string;
    roleCode: RoleCode;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const assignableRoles = filterAssignableRoles(actorRoles, ALL_ROLES);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const loadUsers = useCallback(
    (nextPage = page, searchQuery = query) => {
      startTransition(async () => {
        const result = await searchAdminUsers({
          query: searchQuery,
          page: nextPage,
          pageSize
        });
        setUsers(result.users);
        setTotal(result.total);
        setPage(result.page);
        if (result.error) {
          showToast("error", result.error);
        }
      });
    },
    [page, query, showToast]
  );

  useEffect(() => {
    startTransition(async () => {
      const result = await searchAdminUsers({ query: "", page: 1, pageSize });
      setUsers(result.users);
      setTotal(result.total);
      setPage(result.page);
      if (result.error) {
        showToast("error", result.error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  function selectUser(user: AdminUserSearchResult) {
    setSelectedId(user.id);
    setSelectedUser(user);
    startTransition(async () => {
      const detail = await getAdminUserDetail(user.id);
      if (detail.user) {
        setSelectedUser({
          id: detail.user.id,
          username: detail.user.username,
          display_name: detail.user.display_name,
          role: detail.user.role as AdminUserSearchResult["role"],
          status: detail.user.status,
          created_at: detail.user.created_at,
          roles: detail.user.roles
        });
      }
    });
  }

  function handleAssign() {
    if (!selectedUser) return;
    startTransition(async () => {
      const result = await assignUserRole({
        userId: selectedUser.id,
        roleCode: assignRole
      });
      if (result.ok) {
        showToast("success", `Đã gán vai trò ${formatAdminRoleLabel(assignRole)}.`);
        loadUsers(page, query);
        selectUser(selectedUser);
      } else {
        showToast("error", result.error ?? "Không thể gán vai trò.");
      }
    });
  }

  function handleRemove() {
    if (!confirmRemove) return;
    startTransition(async () => {
      const result = await removeUserRole(confirmRemove);
      setConfirmRemove(null);
      if (result.ok) {
        showToast("success", `Đã gỡ vai trò ${confirmRemove.roleCode}.`);
        loadUsers(page, query);
        if (selectedUser) selectUser(selectedUser);
      } else {
        showToast("error", result.error ?? "Không thể gỡ vai trò.");
      }
    });
  }

  function handleBan(input: { reason: string; endsAt: string | null }) {
    if (!selectedUser) return;
    startTransition(async () => {
      const result = await banUserAction({
        userId: selectedUser.id,
        reason: input.reason,
        endsAt: input.endsAt
      });
      setBanOpen(false);
      if (result.ok) {
        showToast("success", "Đã ban người dùng.");
        loadUsers(page, query);
        selectUser(selectedUser);
      } else {
        showToast("error", result.error ?? "Không thể ban.");
      }
    });
  }

  function handleUnban() {
    if (!selectedUser) return;
    if (!window.confirm("Gỡ ban người dùng này?")) return;
    startTransition(async () => {
      const result = await unbanUserAction(selectedUser.id);
      if (result.ok) {
        showToast("success", "Đã gỡ ban.");
        loadUsers(page, query);
        selectUser(selectedUser);
      } else {
        showToast("error", result.error ?? "Không thể gỡ ban.");
      }
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4">
      {canCreateUsers ? (
        <AdminCreateUserForm
          actorRoles={actorRoles}
          canAssignRoles={canAssignRoles}
          onCreated={(userId) => {
            loadUsers(1, query);
            const found = users.find((u) => u.id === userId);
            if (found) {
              selectUser(found);
            }
          }}
        />
      ) : null}

      <UserSearch
        disabled={isPending}
        query={query}
        onChange={setQuery}
        onSearch={() => loadUsers(1, query)}
      />

      {toast ? (
        <p
          className={`text-sm ${toast.type === "error" ? "text-red-400" : "text-emerald-400"}`}
        >
          {toast.message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">
              {total} người dùng · trang {page}/{totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                disabled={isPending || page <= 1}
                onClick={() => loadUsers(page - 1, query)}
                type="button"
                variant="secondary"
              >
                Trước
              </Button>
              <Button
                disabled={isPending || page >= totalPages}
                onClick={() => loadUsers(page + 1, query)}
                type="button"
                variant="secondary"
              >
                Sau
              </Button>
            </div>
          </div>

          <div className="max-h-[32rem] space-y-2 overflow-y-auto">
            {users.map((user) => (
              <button
                className={`w-full rounded-lg border p-3 text-left transition ${
                  selectedId === user.id
                    ? "border-cyan-500/60 bg-cyan-950/30"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
                }`}
                key={user.id}
                onClick={() => selectUser(user)}
                type="button"
              >
                <p className="font-medium text-white">
                  {user.display_name ?? user.username ?? user.id}
                </p>
                <p className="text-xs text-zinc-400">
                  @{user.username ?? "—"} · {formatProfileStatusLabel(user.status)} · hồ sơ{" "}
                  {user.role}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {user.roles.map((r) => formatAdminRoleLabel(r.code as RoleCode, r.name)).join(", ") ||
                    "Độc giả (mặc định)"}
                </p>
              </button>
            ))}
            {!users.length && !isPending ? (
              <p className="text-sm text-zinc-500">Không có kết quả. Thử tìm kiếm.</p>
            ) : null}
          </div>
        </div>

        <Card className="space-y-4 p-4">
          {selectedUser ? (
            <>
              <div>
                <h2 className="text-lg font-semibold text-white">Chi tiết user</h2>
                <p className="text-sm text-zinc-400">
                  {selectedUser.display_name ?? selectedUser.username}
                </p>
                <p className="text-xs text-zinc-500">ID: {selectedUser.id}</p>
                <p className="text-xs text-zinc-500">
                  Email: không lưu trên profile (tra cứu qua db Auth nếu cần)
                </p>
                <p className="text-xs text-zinc-500">
                  Tạo:{" "}
                  {new Date(selectedUser.created_at).toLocaleString("vi-VN")} · Trạng thái:{" "}
                  <span
                    className={
                      selectedUser.status === "banned" ? "text-red-400" : "text-emerald-400"
                    }
                  >
                    {formatProfileStatusLabel(selectedUser.status)}
                  </span>
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-zinc-300">Vai trò RBAC</p>
                <ul className="space-y-2 text-sm text-zinc-400">
                  {selectedUser.roles.length ? (
                    selectedUser.roles.map((role) => (
                      <li
                        className="flex flex-wrap items-center justify-between gap-2 rounded bg-zinc-800/60 px-2 py-1"
                        key={role.code}
                      >
                        <span>
                          <strong className="text-zinc-200">
                            {formatAdminRoleLabel(role.code as RoleCode, role.name)}
                          </strong>
                          <span className="text-zinc-500"> ({role.code})</span>
                          {isElevatedRole(role.code as RoleCode) ? (
                            <span className="ml-1 text-amber-400">?</span>
                          ) : null}
                        </span>
                        <span className="text-xs">
                          {new Date(role.assigned_at).toLocaleDateString("vi-VN")}
                          {role.assigned_by_label
                            ? ` · bởi ${role.assigned_by_label}`
                            : ""}
                        </span>
                        {canAssignRoles ? (
                          <Button
                            disabled={isPending}
                            onClick={() =>
                              setConfirmRemove({
                                userId: selectedUser.id,
                                roleCode: role.code as RoleCode
                              })
                            }
                            type="button"
                            variant="ghost"
                          >
                            G?
                          </Button>
                        ) : null}
                      </li>
                    ))
                  ) : (
                    <li>Độc giả (mặc định)</li>
                  )}
                </ul>
              </div>

              {canAssignRoles ? (
                <div className="space-y-2 border-t border-zinc-800 pt-4">
                  <p className="text-sm font-medium text-zinc-300">Gán vai trò</p>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
                    value={assignRole}
                    onChange={(event) => setAssignRole(event.target.value as RoleCode)}
                  >
                    {assignableRoles.map((code) => (
                      <option key={code} value={code}>
                        {formatAdminRoleLabel(code)} ({code})
                        {isElevatedRole(code) ? " ?" : ""}
                      </option>
                    ))}
                  </select>
                  {isElevatedRole(assignRole) ? (
                    <p className="text-xs text-amber-400">
                      Vai trò nhạy cảm — chỉ cấp khi thật sự cần thiết.
                    </p>
                  ) : null}
                  <Button disabled={isPending} onClick={handleAssign} type="button">
                    Gán vai trò
                  </Button>
                </div>
              ) : null}

              {canBanUsers ? (
                <div className="flex gap-2 border-t border-zinc-800 pt-4">
                  <Button
                    disabled={isPending}
                    onClick={() => setBanOpen(true)}
                    type="button"
                    variant="danger"
                  >
                    Cấm tài khoản
                  </Button>
                  <Button
                    disabled={isPending}
                    onClick={handleUnban}
                    type="button"
                    variant="secondary"
                  >
                    Gỡ cấm
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-zinc-500">
              Chọn một người dùng từ danh sách để xem chi tiết và thao tác.
            </p>
          )}
        </Card>
      </div>

      <BanUserDialog
        disabled={isPending}
        open={banOpen}
        userLabel={selectedUser?.display_name ?? selectedUser?.username ?? ""}
        onClose={() => setBanOpen(false)}
        onConfirm={handleBan}
      />

      {confirmRemove ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
            <p className="text-white">
              Gỡ vai trò <strong>{confirmRemove.roleCode}</strong> khỏi user này?
            </p>
            {confirmRemove.roleCode === "owner" ? (
              <p className="text-sm text-amber-400">
                Không thể gỡ owner cuối cùng trong hệ thống.
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                disabled={isPending}
                onClick={() => setConfirmRemove(null)}
                type="button"
                variant="ghost"
              >
                Hủy
              </Button>
              <Button disabled={isPending} onClick={handleRemove} type="button" variant="danger">
                Xác nhận gỡ
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
