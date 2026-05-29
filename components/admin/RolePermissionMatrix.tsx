"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui";
import {
  buildPermissionMatrixDetail,
  buildPermissionMatrixGroups,
  isSensitivePermission
} from "@/lib/admin/role-permissions";
import {
  ADMIN_ROLE_CODES,
  CREATOR_READER_ROLE_CODES,
  formatRoleLabel,
  roleHasFinancePermissions,
  SENSITIVE_PERMISSIONS
} from "@/lib/admin/roles";
import type { AdminRoleRow } from "@/types/admin-roles";
import type { PermissionCode } from "@/types/permissions";

type Props = {
  roles: AdminRoleRow[];
  viewMode: "group" | "detail";
  filterSensitive: boolean;
  filterAdminRoles: boolean;
  filterCreatorReader: boolean;
  filterFinance: boolean;
  onViewModeChange: (mode: "group" | "detail") => void;
  onFilterSensitiveChange: (v: boolean) => void;
  onFilterAdminRolesChange: (v: boolean) => void;
  onFilterCreatorReaderChange: (v: boolean) => void;
  onFilterFinanceChange: (v: boolean) => void;
};

export function RolePermissionMatrix({
  roles,
  viewMode,
  filterSensitive,
  filterAdminRoles,
  filterCreatorReader,
  filterFinance,
  onViewModeChange,
  onFilterSensitiveChange,
  onFilterAdminRolesChange,
  onFilterCreatorReaderChange,
  onFilterFinanceChange
}: Props) {
  const filteredRoles = useMemo(() => {
    let list = roles;
    if (filterAdminRoles) {
      list = list.filter((r) => ADMIN_ROLE_CODES.includes(r.code));
    }
    if (filterCreatorReader) {
      list = list.filter((r) => CREATOR_READER_ROLE_CODES.includes(r.code));
    }
    if (filterFinance) {
      list = list.filter((r) => roleHasFinancePermissions(r.permissions));
    }
    return list;
  }, [roles, filterAdminRoles, filterCreatorReader, filterFinance]);

  const matrixGroups = useMemo(
    () => buildPermissionMatrixGroups(filteredRoles),
    [filteredRoles]
  );

  const matrixDetail = useMemo(() => {
    let perms = [...SENSITIVE_PERMISSIONS] as PermissionCode[];
    if (!filterSensitive) {
      const all = new Set<PermissionCode>();
      for (const role of filteredRoles) {
        for (const p of role.permissions) {
          all.add(p.code as PermissionCode);
        }
      }
      perms = [...all].sort();
    }
    return buildPermissionMatrixDetail(filteredRoles, perms);
  }, [filteredRoles, filterSensitive]);

  const selectClass =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          className={selectClass}
          value={viewMode}
          onChange={(e) => onViewModeChange(e.target.value as "group" | "detail")}
        >
          <option value="group">Theo nhóm quyền</option>
          <option value="detail">Theo quyền chi tiết</option>
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
          <input
            checked={filterSensitive}
            onChange={(e) => onFilterSensitiveChange(e.target.checked)}
            type="checkbox"
          />
          Chỉ quyền nhạy cảm
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
          <input
            checked={filterAdminRoles}
            onChange={(e) => onFilterAdminRolesChange(e.target.checked)}
            type="checkbox"
          />
          Chỉ admin roles
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
          <input
            checked={filterCreatorReader}
            onChange={(e) => onFilterCreatorReaderChange(e.target.checked)}
            type="checkbox"
          />
          Chỉ tác giả/độc giả
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
          <input
            checked={filterFinance}
            onChange={(e) => onFilterFinanceChange(e.target.checked)}
            type="checkbox"
          />
          Chỉ finance permissions
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900/80 text-left text-zinc-400">
            <tr>
              <th className="sticky left-0 z-10 bg-zinc-900/95 px-3 py-2 font-medium">
                {viewMode === "group" ? "Nhóm quyền" : "Quyền"}
              </th>
              {filteredRoles.map((role) => (
                <th className="px-3 py-2 font-medium whitespace-nowrap" key={role.code}>
                  <span className="text-white">{formatRoleLabel(role.code)}</span>
                  <br />
                  <span className="text-[10px] text-zinc-500">({role.code})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {viewMode === "group"
              ? matrixGroups.map((row) => (
                  <tr key={row.group}>
                    <td className="sticky left-0 z-10 bg-zinc-950/95 px-3 py-2 text-zinc-300">
                      {row.group}
                    </td>
                    {filteredRoles.map((role) => (
                      <td className="px-3 py-2 text-center" key={role.code}>
                        {row.roles[role.code] ? (
                          <Badge variant="success">✓</Badge>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              : matrixDetail.map((row) => (
                  <tr key={row.permission}>
                    <td className="sticky left-0 z-10 bg-zinc-950/95 px-3 py-2">
                      <span
                        className={
                          isSensitivePermission(row.permission)
                            ? "text-amber-300"
                            : "text-zinc-300"
                        }
                      >
                        {row.permission}
                      </span>
                    </td>
                    {filteredRoles.map((role) => (
                      <td className="px-3 py-2 text-center" key={role.code}>
                        {row.roles[role.code] ? (
                          <Badge variant="success">✓</Badge>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
