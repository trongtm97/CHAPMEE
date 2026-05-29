"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { Button, EmptyState } from "@/components/ui";
import { getUsersByRoleAction } from "@/lib/admin/get-role-center-data";
import { formatProfileStatusLabel } from "@/lib/admin/role-labels";
import { formatRoleLabel } from "@/lib/admin/roles";
import type { RoleUserRow } from "@/types/admin-roles";
import type { RoleCode } from "@/types/permissions";

type Props = {
  initialRoleCode?: RoleCode;
  canAssignRoles: boolean;
  onAssignRole: (prefill?: { roleCode?: RoleCode }) => void;
  onRemoveRole: (user: RoleUserRow) => void;
};

export function RoleUsersTable({
  initialRoleCode,
  canAssignRoles,
  onAssignRole,
  onRemoveRole
}: Props) {
  const [roleCode, setRoleCode] = useState<RoleCode | "">(initialRoleCode ?? "");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [creatorOnly, setCreatorOnly] = useState(false);
  const [restrictedOnly, setRestrictedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [users, setUsers] = useState<RoleUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(
    (nextPage = page) => {
      startTransition(async () => {
        const res = await getUsersByRoleAction({
          roleCode: roleCode || undefined,
          query,
          status: status || undefined,
          verifiedOnly,
          creatorOnly,
          restrictedOnly,
          page: nextPage,
          pageSize
        });
        setUsers(res.users);
        setTotal(res.total);
        setPage(res.page);
        setError(res.error);
      });
    },
    [roleCode, query, status, verifiedOnly, creatorOnly, restrictedOnly, page, pageSize]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const selectClass =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          className={selectClass}
          placeholder="Tìm username/tên..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <input
          className={selectClass}
          placeholder="Lọc role key (vd: admin)"
          value={roleCode}
          onChange={(e) => setRoleCode(e.target.value as RoleCode | "")}
        />
        <select
          className={selectClass}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Mọi trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="banned">Bị cấm</option>
          <option value="suspended">Tạm khóa</option>
        </select>
        <select
          className={selectClass}
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          <option value={25}>25/trang</option>
          <option value={50}>50/trang</option>
          <option value={100}>100/trang</option>
        </select>
        <Button disabled={isPending} onClick={() => load(1)} type="button">
          Tìm
        </Button>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            type="checkbox"
          />
          Có tick xanh
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            checked={creatorOnly}
            onChange={(e) => setCreatorOnly(e.target.checked)}
            type="checkbox"
          />
          Là tác giả
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            checked={restrictedOnly}
            onChange={(e) => setRestrictedOnly(e.target.checked)}
            type="checkbox"
          />
          Đang bị hạn chế
        </label>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {!users.length && !isPending ? (
        <EmptyState
          action={
            canAssignRoles ? (
              <Button onClick={() => onAssignRole({ roleCode: roleCode || undefined })} type="button">
                Gán vai trò
              </Button>
            ) : undefined
          }
          description="Bạn có thể gán vai trò cho user nếu có đủ quyền."
          title="Chưa có user nào giữ vai trò này"
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-900/80 text-left text-zinc-400">
                <tr>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Vai trò</th>
                  <th className="px-3 py-2">Trạng thái</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Ngày cấp</th>
                  <th className="px-3 py-2">Người cấp</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map((user) => (
                  <tr key={`${user.user_id}-${user.role_code}`}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-white">
                        {user.display_name ?? user.username ?? user.user_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-zinc-500">@{user.username ?? "—"}</p>
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {formatRoleLabel(user.role_code, user.role_name)}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {formatProfileStatusLabel(user.status)}
                    </td>
                    <td className="px-3 py-2 text-zinc-500">—</td>
                    <td className="px-3 py-2 text-zinc-400">
                      {new Date(user.assigned_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {user.assigned_by_label ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Link
                          className="text-xs text-cyan-300 hover:underline"
                          href={`/admin/users?user=${user.user_id}`}
                        >
                          Xem user
                        </Link>
                        {canAssignRoles ? (
                          <>
                            <button
                              className="text-xs text-cyan-300 hover:underline"
                              onClick={() => onAssignRole({ roleCode: user.role_code })}
                              type="button"
                            >
                              Gán thêm
                            </button>
                            <button
                              className="text-xs text-red-300 hover:underline"
                              onClick={() => onRemoveRole(user)}
                              type="button"
                            >
                              Gỡ role
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>
              {total} kết quả · trang {page}/{totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                disabled={isPending || page <= 1}
                onClick={() => load(page - 1)}
                type="button"
                variant="secondary"
              >
                Trước
              </Button>
              <Button
                disabled={isPending || page >= totalPages}
                onClick={() => load(page + 1)}
                type="button"
                variant="secondary"
              >
                Sau
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
