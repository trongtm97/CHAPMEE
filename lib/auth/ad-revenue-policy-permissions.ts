import type { AuthPermissionContext } from "@/types/auth";

export type AdRevenuePolicyPermissions = {
  canView: boolean;
  canUpdatePolicy: boolean;
  canManageProfiles: boolean;
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

export function resolveAdRevenuePolicyPermissions(
  ctx: AuthPermissionContext | null
): AdRevenuePolicyPermissions {
  const canUpdatePolicy =
    has(ctx, "finance.settings.update") ||
    has(ctx, "admin.settings.update") ||
    isElevated(ctx);

  const canView =
    canUpdatePolicy ||
    has(ctx, "finance.settings.view") ||
    has(ctx, "admin.settings.view");

  return {
    canView,
    canUpdatePolicy,
    canManageProfiles: canUpdatePolicy,
    canViewAudit: canView
  };
}
