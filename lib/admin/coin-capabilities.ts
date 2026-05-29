import type { PermissionCode } from "@/types/permissions";

export type CoinAdminCapabilities = {
  canView: boolean;
  canAdjust: boolean;
  canBulkAdjust: boolean;
  canAudit: boolean;
  canExport: boolean;
  canViewEmail: boolean;
};

function has(perms: string[], code: PermissionCode | string) {
  return perms.includes(code);
}

/** Granular finance.wallet.* with fallback to permissions đang có trong DB. */
export function buildCoinAdminCapabilities(permissions: string[]): CoinAdminCapabilities {
  const canAdjust = has(permissions, "finance.wallet.adjust");
  const canView =
    has(permissions, "finance.wallet.view") ||
    canAdjust ||
    has(permissions, "wallet.transaction.view.all");
  const canBulkAdjust =
    has(permissions, "finance.wallet.bulk_adjust") || canAdjust;
  const canAudit =
    has(permissions, "finance.wallet.audit") ||
    has(permissions, "admin.audit.view") ||
    canAdjust;
  const canExport =
    has(permissions, "finance.wallet.export") ||
    has(permissions, "wallet.transaction.view.all") ||
    canAdjust;
  const canViewEmail =
    canAdjust ||
    has(permissions, "admin.user.view") ||
    has(permissions, "finance.wallet.view");

  return {
    canView,
    canAdjust,
    canBulkAdjust,
    canAudit,
    canExport,
    canViewEmail
  };
}
