"use client";

import Link from "next/link";
import { formatAdminRoleLabel, formatProfileStatusLabel } from "@/lib/admin/role-labels";
import type { AdminUserListRow } from "@/types/admin-user";
import type { RoleCode } from "@/types/permissions";

type Props = {
  users: AdminUserListRow[];
  selectedId: string | null;
  onSelect: (user: AdminUserListRow) => void;
};

export function UserTable({ users, selectedId, onSelect }: Props) {
  if (!users.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <p className="font-medium text-white">Không tìm thấy người dùng phù hợp.</p>
        <p className="mt-2 text-sm text-zinc-400">
          Thử đổi bộ lọc hoặc tìm theo email/username khác.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-white/10 lg:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-3">Người dùng</th>
              <th className="px-4 py-3">Vai trò</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Xác minh</th>
              <th className="px-4 py-3">Coin</th>
              <th className="px-4 py-3">Vi phạm</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                className={`border-b border-white/5 transition ${
                  selectedId === user.id ? "bg-cyan-950/20" : "hover:bg-white/[0.02]"
                }`}
                key={user.id}
              >
                <td className="px-4 py-3">
                  <button
                    className="text-left"
                    onClick={() => onSelect(user)}
                    type="button"
                  >
                    <p className="font-medium text-white">
                      {user.displayName ?? user.username ?? user.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      @{user.username ?? "—"} · {user.id.slice(0, 8)}
                    </p>
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">
                  {user.roles.length
                    ? user.roles
                        .map((r) =>
                          formatAdminRoleLabel(r.code as RoleCode, r.name)
                        )
                        .join(", ")
                    : formatAdminRoleLabel(user.profileRole as RoleCode)}
                </td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={
                      user.status === "banned" ? "text-red-400" : "text-emerald-400"
                    }
                  >
                    {formatProfileStatusLabel(user.status)}
                  </span>
                  {user.activeRestrictionLabels.length ? (
                    <p className="text-amber-300/80">Hạn chế</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">
                  {user.isVerified ? "Đã xác minh" : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-300">
                  {user.coinTotal.toLocaleString("vi-VN")}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">
                  {user.reportCount} report · {user.strikeCount} strike
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      className="text-xs text-cyan-300 hover:text-cyan-200"
                      onClick={() => onSelect(user)}
                      type="button"
                    >
                      Xem
                    </button>
                    {user.username ? (
                      <Link
                        className="text-xs text-zinc-400 hover:text-zinc-200"
                        href={`/profile/${user.username}`}
                        target="_blank"
                      >
                        Hồ sơ
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 lg:hidden">
        {users.map((user) => (
          <button
            className={`w-full rounded-xl border p-3 text-left ${
              selectedId === user.id
                ? "border-cyan-500/50 bg-cyan-950/20"
                : "border-white/10 bg-white/[0.02]"
            }`}
            key={user.id}
            onClick={() => onSelect(user)}
            type="button"
          >
            <p className="font-medium text-white">
              {user.displayName ?? user.username}
            </p>
            <p className="text-xs text-zinc-500">
              {formatProfileStatusLabel(user.status)} · {user.coinTotal} coin
            </p>
          </button>
        ))}
      </div>
    </>
  );
}
