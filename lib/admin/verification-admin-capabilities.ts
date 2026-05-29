import type { VerificationAdminCapabilities } from "@/types/admin-verification";
import type { RoleCode } from "@/types/permissions";

export function buildVerificationAdminCapabilities(input: {
  permissions: string[];
  roles: RoleCode[];
}): VerificationAdminCapabilities {
  const perms = input.permissions;
  const isOwner = input.roles.includes("owner");
  const isAdmin =
    isOwner ||
    perms.includes("admin.user.update") ||
    perms.includes("admin.settings.update");
  const isModerator = perms.includes("moderation.action.create");
  const canGrant =
    isAdmin ||
    perms.includes("verification_grant") ||
    perms.includes("story.approve");
  const isSupportOnly =
    perms.includes("admin.user.view") &&
    !isAdmin &&
    !isModerator &&
    !canGrant;

  return {
    canView: isAdmin || isModerator || perms.includes("admin.user.view") || canGrant,
    canManage: isAdmin || canGrant,
    canGrantManual: isAdmin || perms.includes("verification_grant"),
    canViewInternalNotes: !isSupportOnly,
    isSupportLimited: isSupportOnly
  };
}
