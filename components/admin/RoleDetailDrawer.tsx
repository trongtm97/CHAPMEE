"use client";

import { useEffect, useState, useTransition } from "react";
import { CreatorDetailDrawer } from "@/components/admin/creators/CreatorDetailDrawer";
import { RoleAuditLogTable } from "@/components/admin/RoleAuditLogTable";
import { Badge, Button, EmptyState } from "@/components/ui";
import { logRoleCenterViewAction } from "@/lib/admin/get-role-center-data";
import { groupPermissionsByCategory, isSensitivePermission } from "@/lib/admin/role-permissions";
import {
  formatRoleLabel,
  getRoleDescription,
  getRoleGroup,
  isSensitiveRole,
  ROLE_GROUP_LABELS_VI
} from "@/lib/admin/roles";
import type { AdminRoleRow, RoleAuditLogRow, RoleDrawerTab } from "@/types/admin-roles";

const DRAWER_TABS: RoleDrawerTab[] = [
  "overview",
  "permissions",
  "users",
  "sensitive",
  "history",
  "audit"
];

const TAB_LABELS: Record<RoleDrawerTab, string> = {
  overview: "Tổng quan",
  permissions: "Quyền",
  users: "Người dùng",
  sensitive: "Quyền nhạy cảm",
  history: "Lịch sử thay đổi",
  audit: "Audit log"
};

type Props = {
  open: boolean;
  role: AdminRoleRow | null;
  auditLogs: RoleAuditLogRow[];
  onClose: () => void;
  onViewUsers: (role: AdminRoleRow) => void;
  onAssignRole: (role: AdminRoleRow) => void;
};

export function RoleDetailDrawer({
  open,
  role,
  auditLogs,
  onClose,
  onViewUsers,
  onAssignRole
}: Props) {
  const [tab, setTab] = useState<RoleDrawerTab>("overview");
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (open && role) {
      startTransition(async () => {
        await logRoleCenterViewAction({
          action: "role_permission_viewed",
          roleCode: role.code
        });
      });
    }
  }, [open, role]);

  if (!role) return null;

  const label = formatRoleLabel(role.code, role.name);
  const description = getRoleDescription(role.code, role.description);
  const sensitive = isSensitiveRole(role.code, role.permissions);
  const sensitivePerms = role.permissions.filter((p) => isSensitivePermission(p.code));
  const grouped = groupPermissionsByCategory(role.permissions);
  const roleAudits = auditLogs.filter(
    (a) => a.role_key === role.code || a.metadata?.role_code === role.code
  );

  return (
    <CreatorDetailDrawer onClose={onClose} open={open}>
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 p-4">
          <button className="text-sm text-zinc-400 hover:text-white" onClick={onClose} type="button">
            Đóng
          </button>
          <h2 className="mt-2 text-xl font-bold text-white">{label}</h2>
          <p className="text-sm text-zinc-500">({role.code})</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={role.is_system ? "warning" : "default"}>
              {role.is_system ? "system" : "custom"}
            </Badge>
            {sensitive ? <Badge variant="danger">quyền nhạy cảm</Badge> : null}
            <span className="text-xs text-zinc-400">
              {role.user_count} user · {role.permissions.length} quyền
            </span>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-4 py-2">
          {DRAWER_TABS.map((t) => (
            <button
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                tab === t ? "bg-cyan-300 text-zinc-950" : "text-zinc-400"
              }`}
              key={t}
              onClick={() => setTab(t)}
              type="button"
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 text-sm text-zinc-300">
          {tab === "overview" ? (
            <dl className="space-y-3">
              <div>
                <dt className="text-zinc-500">Tên hiển thị</dt>
                <dd>{label}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Role key</dt>
                <dd className="font-mono text-xs">{role.code}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Mô tả</dt>
                <dd>{description}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Loại role</dt>
                <dd>{role.is_system ? "System" : "Custom"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Nhóm role</dt>
                <dd>{ROLE_GROUP_LABELS_VI[getRoleGroup(role.code)]}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Số user / quyền / nhạy cảm</dt>
                <dd>
                  {role.user_count} · {role.permissions.length} · {sensitivePerms.length}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Ngày tạo</dt>
                <dd>{new Date(role.created_at).toLocaleString("vi-VN")}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Trạng thái</dt>
                <dd>{role.status === "active" ? "Active" : "Disabled"}</dd>
              </div>
              {role.is_system ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-amber-200">
                  Đây là vai trò hệ thống. Không chỉnh sửa trực tiếp permission tại production nếu
                  chưa có migration và kiểm tra bảo mật.
                </div>
              ) : null}
              <div className="flex gap-2 pt-2">
                <Button onClick={() => onViewUsers(role)} type="button" variant="secondary">
                  Xem user
                </Button>
                <Button onClick={() => onAssignRole(role)} type="button" variant="ghost">
                  Gán role
                </Button>
              </div>
            </dl>
          ) : null}

          {tab === "permissions" ? (
            <div className="space-y-4">
              {grouped.map((group) => (
                <div key={group.category}>
                  <p className="font-medium text-white">
                    {group.category}{" "}
                    <span className="text-zinc-500">({group.permissions.length})</span>
                  </p>
                  <ul className="mt-2 space-y-1">
                    {group.permissions.map((perm) => (
                      <li
                        className={`rounded px-2 py-1 font-mono text-xs ${
                          isSensitivePermission(perm.code)
                            ? "bg-red-900/30 text-red-200"
                            : "bg-zinc-800/60 text-zinc-400"
                        }`}
                        key={perm.code}
                      >
                        {perm.code}
                        {isSensitivePermission(perm.code) ? " ⚠" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}

          {tab === "users" ? (
            role.user_count === 0 ? (
              <EmptyState
                action={
                  <Button onClick={() => onAssignRole(role)} type="button">
                    Gán vai trò
                  </Button>
                }
                description="Bạn có thể gán vai trò cho user nếu có đủ quyền."
                title="Chưa có user nào giữ vai trò này"
              />
            ) : (
              <p className="text-zinc-400">
                {role.user_count} user đang giữ vai trò này.{" "}
                <button
                  className="text-cyan-300 hover:underline"
                  onClick={() => onViewUsers(role)}
                  type="button"
                >
                  Xem danh sách
                </button>
              </p>
            )
          ) : null}

          {tab === "sensitive" ? (
            <div className="space-y-3">
              <p className="text-amber-200">
                Quyền nhạy cảm — chỉ cấp cho người vận hành đáng tin cậy.
              </p>
              {sensitivePerms.length ? (
                <ul className="space-y-1">
                  {sensitivePerms.map((p) => (
                    <li className="rounded bg-red-900/30 px-2 py-1 font-mono text-xs" key={p.code}>
                      {p.code}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-500">Vai trò này không có quyền nhạy cảm.</p>
              )}
            </div>
          ) : null}

          {tab === "history" || tab === "audit" ? (
            <RoleAuditLogTable initialLogs={roleAudits} roleCode={role.code} />
          ) : null}
        </div>
      </div>
    </CreatorDetailDrawer>
  );
}
