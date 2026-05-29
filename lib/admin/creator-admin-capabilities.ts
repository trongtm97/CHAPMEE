import type { CreatorAdminCapabilities } from "@/types/admin-creator";
import type { RoleCode } from "@/types/permissions";

export function buildCreatorAdminCapabilities(input: {
  permissions: string[];
  roles: RoleCode[];
}): CreatorAdminCapabilities {
  const perms = input.permissions;
  const isOwner = input.roles.includes("owner");
  const isFinance =
    perms.includes("finance.dashboard.view") ||
    perms.includes("finance.payout.view") ||
    perms.includes("finance.wallet.adjust");
  const isAdmin =
    isOwner ||
    perms.includes("admin.settings.update") ||
    perms.includes("admin.user.update");
  const isModerator = perms.includes("moderation.action.create");
  const isSupportOnly =
    perms.includes("admin.settings.view") &&
    !isAdmin &&
    !isFinance &&
    !isModerator;

  return {
    canViewPayoutDetail: isFinance || isAdmin,
    canManageMonetization: isAdmin,
    canManageRevenueShare: isFinance || isAdmin,
    canManagePayout: isFinance || isAdmin,
    canManageVerification: isAdmin || perms.includes("verification_grant"),
    canModerateContent: isModerator || isAdmin,
    canManageStudio: isAdmin || isModerator,
    isSupportLimited: isSupportOnly
  };
}
