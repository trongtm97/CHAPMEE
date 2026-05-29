import {
  getPermissionCategoryLabel,
  groupPermissionsByCategory,
  isSensitivePermission,
  SENSITIVE_PERMISSIONS
} from "@/lib/admin/roles";
import type { PermissionCode } from "@/types/permissions";

export {
  getPermissionCategoryLabel,
  groupPermissionsByCategory,
  isSensitivePermission,
  SENSITIVE_PERMISSIONS
};

export function filterPermissionsByGroup<T extends { code: string }>(
  permissions: T[],
  groupLabel: string
): T[] {
  return permissions.filter((p) => getPermissionCategoryLabel(p.code) === groupLabel);
}

export function getRepresentativePermissions<T extends { code: string; name: string }>(
  permissions: T[],
  limit = 5
): { shown: T[]; remaining: number } {
  const sorted = [...permissions].sort((a, b) => {
    const aSensitive = isSensitivePermission(a.code) ? 0 : 1;
    const bSensitive = isSensitivePermission(b.code) ? 0 : 1;
    if (aSensitive !== bSensitive) return aSensitive - bSensitive;
    return a.code.localeCompare(b.code);
  });
  return {
    shown: sorted.slice(0, limit),
    remaining: Math.max(0, sorted.length - limit)
  };
}

export function buildPermissionMatrixGroups(
  roles: Array<{ code: string; permissions: Array<{ code: string }> }>
): Array<{ group: string; roles: Record<string, boolean> }> {
  const groups = new Set<string>();
  for (const role of roles) {
    for (const perm of role.permissions) {
      groups.add(getPermissionCategoryLabel(perm.code));
    }
  }

  return [...groups]
    .sort((a, b) => a.localeCompare(b, "vi"))
    .map((group) => {
      const roleMap: Record<string, boolean> = {};
      for (const role of roles) {
        roleMap[role.code] = role.permissions.some(
          (p) => getPermissionCategoryLabel(p.code) === group
        );
      }
      return { group, roles: roleMap };
    });
}

export function buildPermissionMatrixDetail(
  roles: Array<{ code: string; permissions: Array<{ code: string }> }>,
  permissionCodes: PermissionCode[]
): Array<{ permission: PermissionCode; roles: Record<string, boolean> }> {
  return permissionCodes.map((permission) => {
    const roleMap: Record<string, boolean> = {};
    for (const role of roles) {
      roleMap[role.code] = role.permissions.some((p) => p.code === permission);
    }
    return { permission, roles: roleMap };
  });
}
