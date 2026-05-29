import { redirect } from "next/navigation";
import {
  getCurrentAuthContext,
  isStaffFromContext
} from "@/lib/auth/permissions";
import type { AuthPermissionContext } from "@/types/auth";
import type { PermissionCode, RoleCode } from "@/types/permissions";

export type PermissionGuardResult =
  | { ok: true; context: AuthPermissionContext; error: null }
  | { ok: false; context: AuthPermissionContext | null; error: string };

export async function requirePermission(
  permissionCode: PermissionCode,
  options?: { returnTo?: string; redirectToLogin?: boolean }
): Promise<PermissionGuardResult> {
  const context = await getCurrentAuthContext();
  const returnTo = options?.returnTo ?? "/";

  if (!context) {
    if (options?.redirectToLogin !== false) {
      redirect(`/login?next=${encodeURIComponent(returnTo)}`);
    }
    return { ok: false, context: null, error: "Bạn cần đăng nhập." };
  }

  const allowed = context.permissions.includes(permissionCode);
  if (!allowed) {
    return {
      ok: false,
      context,
      error: "Bạn không có quyền thực hiện thao tác này."
    };
  }

  return { ok: true, context, error: null };
}

export async function requireAnyPermission(
  permissionCodes: PermissionCode[],
  options?: { returnTo?: string }
): Promise<PermissionGuardResult> {
  const context = await getCurrentAuthContext();
  const returnTo = options?.returnTo ?? "/";

  if (!context) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const allowed = permissionCodes.some((code) =>
    context.permissions.includes(code)
  );
  if (!allowed) {
    return {
      ok: false,
      context,
      error: "Bạn không có quyền truy cập khu vực này."
    };
  }

  return { ok: true, context, error: null };
}

export async function requireRole(
  roleCode: RoleCode,
  options?: { returnTo?: string }
): Promise<PermissionGuardResult> {
  const context = await getCurrentAuthContext();
  const returnTo = options?.returnTo ?? "/";

  if (!context) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  if (!context.roles.includes(roleCode)) {
    return {
      ok: false,
      context,
      error: "Bạn không có vai trò phù hợp."
    };
  }

  return { ok: true, context, error: null };
}

export async function requireAdmin(returnTo = "/admin") {
  return requirePermission("admin.dashboard.view", { returnTo });
}

export async function requireAdminOrModeratorAccess(returnTo = "/admin") {
  const context = await getCurrentAuthContext();
  const returnPath = returnTo;

  if (!context) {
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  }

  if (
    isStaffFromContext(context) ||
    context.permissions.includes("admin.dashboard.view") ||
    context.permissions.includes("report.review")
  ) {
    return { ok: true as const, context, error: null };
  }

  return {
    ok: false as const,
    context,
    error: "Bạn không có quyền truy cập khu vực admin."
  };
}

export async function requireFinanceAccess(returnTo = "/admin/finance") {
  return requirePermission("finance.dashboard.view", { returnTo });
}

export async function requirePayoutViewAccess(returnTo = "/admin/payouts") {
  return requirePermission("finance.payout.view", { returnTo });
}

export async function requireRefundAdminAccess(returnTo = "/admin/refunds") {
  return requireAnyPermission(
    ["finance.refund.view", "finance.refund.create"],
    { returnTo }
  );
}

export async function requireAdminSettingsAccess(
  returnTo = "/admin/monetization"
) {
  return requireAnyPermission(
    ["admin.settings.view", "admin.settings.update"],
    { returnTo }
  );
}

/** Monetization settings dashboard — finance_admin + legacy admin.settings */
export async function requireFinanceSettingsView(
  returnTo = "/admin/monetization-settings"
) {
  return requireAnyPermission(
    [
      "finance.settings.view",
      "finance.settings.update",
      "admin.settings.view",
      "admin.settings.update"
    ],
    { returnTo }
  );
}

export async function requireFinanceSettingsUpdate() {
  return requireAnyPermission([
    "finance.settings.update",
    "admin.settings.update"
  ]);
}

/** Staff/admin route guard — alias for explicit admin permission checks. */
export async function requireAdminPermission(
  permissionCode: PermissionCode,
  returnTo = "/admin"
) {
  return requirePermission(permissionCode, { returnTo });
}

export async function assertPermission(
  permissionCode: PermissionCode
): Promise<void> {
  const guard = await requirePermission(permissionCode, {
    redirectToLogin: false
  });
  if (!guard.ok) {
    throw new Error(guard.error);
  }
}

export async function assertAnyPermission(
  permissionCodes: PermissionCode[]
): Promise<void> {
  const context = await getCurrentAuthContext();
  if (!context) {
    throw new Error("Bạn cần đăng nhập.");
  }
  const allowed = permissionCodes.some((code) =>
    context.permissions.includes(code)
  );
  if (!allowed) {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  }
}
