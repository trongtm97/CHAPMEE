import type { RoleCode } from "@/types/permissions";

const ELEVATED_ROLES: RoleCode[] = ["owner", "super_admin", "admin"];

export function isElevatedRole(code: RoleCode) {
  return ELEVATED_ROLES.includes(code);
}

export function canActorAssignRole(
  actorRoles: RoleCode[],
  targetRole: RoleCode
): { ok: true } | { ok: false; error: string } {
  if (targetRole === "owner") {
    if (!actorRoles.includes("owner")) {
      return {
        ok: false,
        error: "Chỉ owner mới được cấp vai trò owner."
      };
    }
    return { ok: true };
  }

  if (targetRole === "super_admin") {
    if (!actorRoles.includes("owner") && !actorRoles.includes("super_admin")) {
      return {
        ok: false,
        error: "Chỉ owner hoặc super_admin mới được cấp super_admin."
      };
    }
    return { ok: true };
  }

  if (targetRole === "finance_admin") {
    if (!actorRoles.includes("owner") && !actorRoles.includes("super_admin")) {
      return {
        ok: false,
        error: "Chỉ owner hoặc super_admin mới được cấp finance_admin."
      };
    }
    return { ok: true };
  }

  return { ok: true };
}

export function canActorRemoveRole(
  actorRoles: RoleCode[],
  targetRole: RoleCode
): { ok: true } | { ok: false; error: string } {
  if (targetRole === "owner") {
    if (!actorRoles.includes("owner")) {
      return {
        ok: false,
        error: "Chỉ owner mới được gỡ vai trò owner."
      };
    }
    return { ok: true };
  }

  if (targetRole === "super_admin") {
    if (!actorRoles.includes("owner") && !actorRoles.includes("super_admin")) {
      return {
        ok: false,
        error: "Chỉ owner hoặc super_admin mới được gỡ super_admin."
      };
    }
    return { ok: true };
  }

  return { ok: true };
}

export function filterAssignableRoles(
  actorRoles: RoleCode[],
  allRoles: RoleCode[]
): RoleCode[] {
  return allRoles.filter((code) => canActorAssignRole(actorRoles, code).ok);
}
