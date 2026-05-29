import type { ProfileRole } from "@/lib/auth/getCurrentProfile";
import type { RoleCode } from "@/types/permissions";

export const STAFF_ROLE_CODES: RoleCode[] = [
  "moderator",
  "content_admin",
  "finance_admin",
  "support_admin",
  "admin",
  "super_admin",
  "owner"
];

export const PROTECTED_ASSIGN_ROLE_CODES: RoleCode[] = [
  "owner",
  "super_admin"
];

export function legacyRoleToRbacCodes(role: ProfileRole): RoleCode[] {
  switch (role) {
    case "moderator":
      return ["moderator"];
    case "admin":
      return ["admin"];
    case "founder":
      return ["owner"];
    default:
      return [];
  }
}

export function rbacRoleToLegacyProfileRole(roleCode: RoleCode): ProfileRole | null {
  switch (roleCode) {
    case "owner":
    case "super_admin":
      return "founder";
    case "admin":
      return "admin";
    case "moderator":
    case "content_admin":
    case "support_admin":
      return "moderator";
    default:
      return null;
  }
}

export function mergeRoleCodes(
  rbacRoles: RoleCode[],
  legacyRole: ProfileRole | null
): RoleCode[] {
  const merged = new Set<RoleCode>(rbacRoles);
  for (const code of legacyRoleToRbacCodes(legacyRole ?? "user")) {
    merged.add(code);
  }
  if (!merged.size) {
    merged.add("reader");
  }
  return [...merged];
}

export function isStaffRoleCode(code: RoleCode) {
  return STAFF_ROLE_CODES.includes(code);
}
