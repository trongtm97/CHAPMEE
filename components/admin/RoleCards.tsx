"use client";

import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { getRepresentativePermissions } from "@/lib/admin/role-permissions";
import {
  formatRoleLabel,
  getPrimaryPermissionGroups,
  getRoleDescription,
  getRoleGroup,
  isSensitivePermission,
  isSensitiveRole,
  roleHasSensitivePermissions,
  ROLE_GROUP_LABELS_VI
} from "@/lib/admin/roles";
import type { AdminRoleRow } from "@/types/admin-roles";

type Props = {
  roles: AdminRoleRow[];
  canAssignRoles: boolean;
  onViewDetail: (role: AdminRoleRow) => void;
  onViewUsers: (role: AdminRoleRow) => void;
  onAssignRole: (role: AdminRoleRow) => void;
  onViewAudit: (role: AdminRoleRow) => void;
};

export function RoleCards({
  roles,
  canAssignRoles,
  onViewDetail,
  onViewUsers,
  onAssignRole,
  onViewAudit
}: Props) {
  if (!roles.length) {
    return (
      <EmptyState
        description="Thử đổi bộ lọc hoặc từ khóa tìm kiếm."
        title="Không có vai trò khớp bộ lọc"
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {roles.map((role) => {
        const label = formatRoleLabel(role.code, role.name);
        const description = getRoleDescription(role.code, role.description);
        const sensitive = isSensitiveRole(role.code, role.permissions);
        const sensitiveCount = role.permissions.filter((p) =>
          isSensitivePermission(p.code)
        ).length;
        const { shown, remaining } = getRepresentativePermissions(role.permissions);
        const primaryGroups = getPrimaryPermissionGroups(role.permissions);

        return (
          <Card className="flex flex-col p-4" key={role.id}>
            <div className="space-y-2">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white">{label}</h3>
                  <p className="text-xs text-zinc-500">({role.code})</p>
                </div>
                <Badge variant={role.is_system ? "warning" : "default"}>
                  {role.is_system ? "system" : "custom"}
                </Badge>
                {sensitive ? <Badge variant="danger">nhạy cảm</Badge> : null}
                {role.code === "banned_user" ? <Badge variant="danger">hạn chế</Badge> : null}
              </div>
              <p className="text-sm text-zinc-400">{description}</p>
              <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                <span>{role.user_count} user</span>
                <span>{role.permissions.length} quyền</span>
                {sensitiveCount > 0 ? <span>{sensitiveCount} quyền nhạy cảm</span> : null}
                <span>{ROLE_GROUP_LABELS_VI[getRoleGroup(role.code)]}</span>
              </div>
              {primaryGroups.length ? (
                <p className="text-xs text-zinc-500">
                  Nhóm chính: {primaryGroups.join(", ")}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {shown.map((perm) => (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      isSensitivePermission(perm.code)
                        ? "bg-red-900/40 text-red-200"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                    key={perm.code}
                    title={perm.name}
                  >
                    {perm.code}
                  </span>
                ))}
                {remaining > 0 ? (
                  <span className="text-xs text-zinc-500">+{remaining} quyền</span>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
              <Button onClick={() => onViewDetail(role)} type="button" variant="secondary">
                Xem chi tiết
              </Button>
              <Button onClick={() => onViewUsers(role)} type="button" variant="ghost">
                Xem user
              </Button>
              {canAssignRoles ? (
                <Button onClick={() => onAssignRole(role)} type="button" variant="ghost">
                  Gán role
                </Button>
              ) : null}
              <Button onClick={() => onViewAudit(role)} type="button" variant="ghost">
                Audit
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function filterAndSortRoles(
  roles: AdminRoleRow[],
  input: {
    query: string;
    roleGroup: string;
    roleType: string;
    sensitiveOnly: boolean;
    hasUsers: string;
    status: string;
    sort: string;
  }
): AdminRoleRow[] {
  const q = input.query.trim().toLowerCase();
  let result = roles.filter((role) => {
    const matchesQuery =
      !q ||
      role.code.toLowerCase().includes(q) ||
      formatRoleLabel(role.code, role.name).toLowerCase().includes(q) ||
      (role.description ?? "").toLowerCase().includes(q) ||
      role.permissions.some(
        (p) => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
      );

    const matchesGroup =
      input.roleGroup === "all" || getRoleGroup(role.code) === input.roleGroup;

    const matchesType =
      input.roleType === "all" ||
      (input.roleType === "system" && role.is_system) ||
      (input.roleType === "custom" && !role.is_system);

    const matchesSensitive =
      !input.sensitiveOnly || roleHasSensitivePermissions(role.permissions);

    const matchesUsers =
      input.hasUsers === "all" ||
      (input.hasUsers === "yes" && role.user_count > 0) ||
      (input.hasUsers === "no" && role.user_count === 0);

    const matchesStatus =
      input.status === "all" || role.status === input.status;

    return (
      matchesQuery &&
      matchesGroup &&
      matchesType &&
      matchesSensitive &&
      matchesUsers &&
      matchesStatus
    );
  });

  result = [...result].sort((a, b) => {
    switch (input.sort) {
      case "users_desc":
        return b.user_count - a.user_count;
      case "permissions_desc":
        return b.permissions.length - a.permissions.length;
      case "sensitive_first": {
        const aS = roleHasSensitivePermissions(a.permissions) ? 1 : 0;
        const bS = roleHasSensitivePermissions(b.permissions) ? 1 : 0;
        if (bS !== aS) return bS - aS;
        return formatRoleLabel(a.code).localeCompare(formatRoleLabel(b.code), "vi");
      }
      default:
        return formatRoleLabel(a.code).localeCompare(formatRoleLabel(b.code), "vi");
    }
  });

  return result;
}
