import type { UserAdminCapabilities } from "@/types/admin-user";
import type { RoleCode } from "@/types/permissions";

export function buildUserAdminCapabilities(input: {
  permissions: string[];
  roles: RoleCode[];
}): UserAdminCapabilities {
  const perms = input.permissions;
  const isFinance =
    perms.includes("finance.wallet.adjust") ||
    perms.includes("finance.dashboard.view");
  const isSupportOnly =
    perms.includes("admin.user.view") &&
    !perms.includes("moderation.action.create") &&
    !perms.includes("admin.user.ban") &&
    !isFinance;

  return {
    canViewWallet:
      isFinance ||
      perms.includes("wallet.transaction.view.all") ||
      perms.includes("admin.user.view"),
    canAdjustCoin: perms.includes("finance.wallet.adjust"),
    canAssignRoles: perms.includes("admin.user.role.assign"),
    canBanUsers:
      perms.includes("admin.user.ban") ||
      perms.includes("moderation.ban_user"),
    canCreateUsers: perms.includes("admin.user.update"),
    canRestrictMessaging: perms.includes("moderation.action.create"),
    canRestrictCommunity: perms.includes("moderation.action.create"),
    canManageVerification:
      perms.includes("verification_grant") ||
      perms.includes("story.approve") ||
      perms.includes("admin.user.update"),
    canViewSensitiveContent: !isSupportOnly,
    actorRoles: input.roles
  };
}
