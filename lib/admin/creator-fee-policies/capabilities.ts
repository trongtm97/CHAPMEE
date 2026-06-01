import type { PermissionCode } from "@/types/permissions";
import type { CreatorFeePolicyAdminCapabilities } from "@/types/admin-creator-fee-policy";

function has(perms: string[], code: PermissionCode | string) {
  return perms.includes(code);
}

function hasFinanceAdmin(perms: string[]) {
  return (
    has(perms, "finance.creator_fee.view") ||
    has(perms, "finance.creator_fee.create") ||
    has(perms, "finance.wallet.adjust") ||
    has(perms, "finance.dashboard.view")
  );
}

export function buildCreatorFeePolicyCapabilities(
  permissions: string[]
): CreatorFeePolicyAdminCapabilities {
  const legacyAdjust = has(permissions, "finance.wallet.adjust");
  const canView =
    has(permissions, "finance.creator_fee.view") ||
    legacyAdjust ||
    has(permissions, "finance.dashboard.view");
  const canCreate =
    has(permissions, "finance.creator_fee.create") || legacyAdjust;
  const canUpdate =
    has(permissions, "finance.creator_fee.update") || legacyAdjust;
  const canPause =
    has(permissions, "finance.creator_fee.pause") || legacyAdjust;
  const canRevoke =
    has(permissions, "finance.creator_fee.revoke") || legacyAdjust;
  const canExport =
    has(permissions, "finance.creator_fee.export") ||
    has(permissions, "finance.report.export") ||
    legacyAdjust;
  const canViewAudit =
    has(permissions, "admin.audit.view") || hasFinanceAdmin(permissions);

  return {
    canView,
    canCreate,
    canUpdate,
    canPause,
    canRevoke,
    canExport,
    canViewAudit
  };
}
