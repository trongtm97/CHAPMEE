import type { UsernamePolicyAdminCapabilities } from "@/types/username-policy";

export function buildUsernamePolicyCapabilities(input: {
  permissions: string[];
}): UsernamePolicyAdminCapabilities {
  const perms = input.permissions;
  const canUpdate = perms.includes("admin.user.update");
  const canView = canUpdate || perms.includes("admin.user.view");
  const isSupportOnly =
    perms.includes("admin.user.view") &&
    !canUpdate &&
    !perms.includes("moderation.action.create");

  return {
    canView,
    canManageRules: canUpdate,
    canImport: canUpdate,
    canAssignUsername: canUpdate,
    canManageExceptions: canUpdate,
    canViewSensitiveNotes: !isSupportOnly,
    canViewAudit: canView
  };
}
