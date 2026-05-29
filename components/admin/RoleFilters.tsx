"use client";

import { Input } from "@/components/ui";
import { ROLE_GROUP_LABELS_VI } from "@/lib/admin/roles";
import type { RoleGroupKey, RoleSortKey } from "@/types/admin-roles";

const ROLE_GROUPS = Object.entries(ROLE_GROUP_LABELS_VI) as [RoleGroupKey, string][];

type Props = {
  query: string;
  roleGroup: RoleGroupKey | "all";
  roleType: "all" | "system" | "custom";
  sensitiveOnly: boolean;
  hasUsers: "all" | "yes" | "no";
  status: "all" | "active" | "disabled";
  sort: RoleSortKey;
  onQueryChange: (v: string) => void;
  onRoleGroupChange: (v: RoleGroupKey | "all") => void;
  onRoleTypeChange: (v: "all" | "system" | "custom") => void;
  onSensitiveOnlyChange: (v: boolean) => void;
  onHasUsersChange: (v: "all" | "yes" | "no") => void;
  onStatusChange: (v: "all" | "active" | "disabled") => void;
  onSortChange: (v: RoleSortKey) => void;
};

const selectClass =
  "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200";

export function RoleFilters({
  query,
  roleGroup,
  roleType,
  sensitiveOnly,
  hasUsers,
  status,
  sort,
  onQueryChange,
  onRoleGroupChange,
  onRoleTypeChange,
  onSensitiveOnlyChange,
  onHasUsersChange,
  onStatusChange,
  onSortChange
}: Props) {
  return (
    <div className="space-y-3">
      <Input
        placeholder="Tìm vai trò, mã quyền, mô tả..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <select
          className={selectClass}
          value={roleGroup}
          onChange={(e) => onRoleGroupChange(e.target.value as RoleGroupKey | "all")}
        >
          <option value="all">Tất cả nhóm role</option>
          {ROLE_GROUPS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={roleType}
          onChange={(e) => onRoleTypeChange(e.target.value as "all" | "system" | "custom")}
        >
          <option value="all">System + custom</option>
          <option value="system">System</option>
          <option value="custom">Custom</option>
        </select>
        <select
          className={selectClass}
          value={hasUsers}
          onChange={(e) => onHasUsersChange(e.target.value as "all" | "yes" | "no")}
        >
          <option value="all">Mọi user count</option>
          <option value="yes">Có user</option>
          <option value="no">Không có user</option>
        </select>
        <select
          className={selectClass}
          value={status}
          onChange={(e) => onStatusChange(e.target.value as "all" | "active" | "disabled")}
        >
          <option value="all">Mọi trạng thái</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        <select
          className={selectClass}
          value={sort}
          onChange={(e) => onSortChange(e.target.value as RoleSortKey)}
        >
          <option value="users_desc">Nhiều user nhất</option>
          <option value="permissions_desc">Nhiều quyền nhất</option>
          <option value="sensitive_first">Quyền nhạy cảm trước</option>
          <option value="name_asc">Tên A-Z</option>
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
          <input
            checked={sensitiveOnly}
            onChange={(e) => onSensitiveOnlyChange(e.target.checked)}
            type="checkbox"
          />
          Có quyền nhạy cảm
        </label>
      </div>
    </div>
  );
}
