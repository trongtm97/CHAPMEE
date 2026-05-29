"use client";

import { useMemo, useState } from "react";
import { Card, Input } from "@/components/ui";

type PermissionRow = {
  code: string;
  name: string;
  group_key: string | null;
};

type RoleRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: PermissionRow[];
};

type RolesPermissionsTableProps = {
  roles: RoleRow[];
};

export function RolesPermissionsTable({ roles }: RolesPermissionsTableProps) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("all");

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const role of roles) {
      for (const perm of role.permissions) {
        if (perm.group_key) set.add(perm.group_key);
      }
    }
    return ["all", ...Array.from(set).sort()];
  }, [roles]);

  const filteredRoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roles.map((role) => ({
      ...role,
      permissions: role.permissions.filter((perm) => {
        const matchesGroup = group === "all" || perm.group_key === group;
        const matchesQuery =
          !q ||
          perm.code.toLowerCase().includes(q) ||
          perm.name.toLowerCase().includes(q) ||
          role.code.toLowerCase().includes(q);
        return matchesGroup && matchesQuery;
      })
    }));
  }, [group, query, roles]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Lọc theo mã quyền, tên quyền, role..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
          value={group}
          onChange={(event) => setGroup(event.target.value)}
        >
          {groups.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? "Tất cả nhóm" : item}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {filteredRoles.map((role) => (
          <Card className="space-y-3 p-4" key={role.id}>
            <div>
              <p className="text-lg font-semibold text-white">
                {role.name}{" "}
                <span className="text-sm font-normal text-zinc-400">({role.code})</span>
                {role.is_system ? (
                  <span className="ml-2 rounded bg-amber-900/40 px-2 py-0.5 text-xs text-amber-200">
                    system
                  </span>
                ) : null}
              </p>
              {role.description ? (
                <p className="text-sm text-zinc-400">{role.description}</p>
              ) : null}
              <p className="mt-1 text-xs text-zinc-500">
                {role.permissions.length} quyền (sau lọc)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {role.permissions.length ? (
                role.permissions.map((perm) => (
                  <span
                    className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                    key={`${role.id}-${perm.code}`}
                    title={perm.name}
                  >
                    {perm.code}
                  </span>
                ))
              ) : (
                <span className="text-sm text-zinc-500">Không có quyền khớp bộ lọc.</span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
