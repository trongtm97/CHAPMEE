import { logAdminAction } from "@/lib/audit/log-admin-action";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import {
  assertPermission,
  requirePermission,
  type PermissionGuardResult
} from "@/lib/auth/require-permission";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import type { PermissionCode } from "@/types/permissions";

export async function requireFinancePermission(
  permissionCode: PermissionCode,
  returnTo = "/admin/finance"
): Promise<PermissionGuardResult> {
  return requirePermission(permissionCode, { returnTo });
}

export async function assertFinancePermission(permissionCode: PermissionCode) {
  await assertPermission(permissionCode);
}

export async function requireWalletAdjustAccess() {
  return checkStaffPermission("finance.wallet.adjust");
}

export async function requireRefundCreateAccess() {
  return checkStaffPermission("finance.refund.create");
}

export async function logFinanceAdminAction(input: {
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  const ctx = await getCurrentAuthContext();
  if (!ctx) return;
  await logAdminAction({
    actorId: ctx.userId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata
  });
}

export function assertPositiveAmount(
  amount: number,
  label = "Số tiền"
): { ok: true } | { ok: false; error: string } {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: `${label} phải lớn hơn 0.` };
  }
  return { ok: true };
}

export async function assertNotSelfFinanceAction(
  targetUserId: string,
  actionLabel: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getCurrentAuthContext();
  if (ctx && ctx.userId === targetUserId) {
    return {
      ok: false,
      error: `Bạn không thể ${actionLabel} cho chính payout/tài khoản của mình.`
    };
  }
  return { ok: true };
}
