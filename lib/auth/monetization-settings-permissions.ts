import type { AuthPermissionContext } from "@/types/auth";

export type MonetizationSettingsPermissions = {
  canView: boolean;
  canUpdateAny: boolean;
  canUpdateEcosystem: boolean;
  canUpdateCoin: boolean;
  canUpdateRevenue: boolean;
  canUpdateWithdrawal: boolean;
  canUpdateRisk: boolean;
  canViewAudit: boolean;
};

function has(ctx: AuthPermissionContext | null, code: string) {
  return Boolean(ctx?.permissions.includes(code as never));
}

function isElevated(ctx: AuthPermissionContext | null) {
  return Boolean(
    ctx?.roles.includes("owner") || ctx?.roles.includes("super_admin")
  );
}

export function resolveMonetizationSettingsPermissions(
  ctx: AuthPermissionContext | null
): MonetizationSettingsPermissions {
  const globalUpdate =
    has(ctx, "finance.settings.update") ||
    has(ctx, "admin.settings.update") ||
    isElevated(ctx);

  return {
    canView:
      has(ctx, "finance.settings.view") ||
      has(ctx, "finance.settings.update") ||
      has(ctx, "admin.settings.view") ||
      has(ctx, "admin.settings.update") ||
      isElevated(ctx),
    canUpdateAny:
      globalUpdate ||
      has(ctx, "finance.revenue_share.update") ||
      has(ctx, "finance.withdrawal_settings.update") ||
      has(ctx, "finance.risk_settings.update"),
    canUpdateEcosystem: globalUpdate,
    canUpdateCoin: globalUpdate,
    canUpdateRevenue: globalUpdate || has(ctx, "finance.revenue_share.update"),
    canUpdateWithdrawal:
      globalUpdate || has(ctx, "finance.withdrawal_settings.update"),
    canUpdateRisk: globalUpdate || has(ctx, "finance.risk_settings.update"),
    canViewAudit:
      has(ctx, "finance.audit.view") ||
      has(ctx, "admin.audit.view") ||
      isElevated(ctx)
  };
}
