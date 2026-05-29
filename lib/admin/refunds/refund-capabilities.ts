import type { PermissionCode } from "@/types/permissions";
import type { RefundAdminCapabilities } from "@/types/admin-refund";

function has(perms: string[], code: PermissionCode | string) {
  return perms.includes(code);
}

export function buildRefundAdminCapabilities(permissions: string[]): RefundAdminCapabilities {
  const canCreate = has(permissions, "finance.refund.create");
  const canView =
    has(permissions, "finance.refund.view") ||
    canCreate ||
    has(permissions, "finance.dashboard.view");
  const canApprove =
    has(permissions, "finance.refund.approve") || canCreate;
  const canReject =
    has(permissions, "finance.refund.reject") || canCreate;
  const canComplete =
    has(permissions, "finance.refund.complete") || canCreate;
  const canOverride =
    has(permissions, "finance.refund.override") ||
    has(permissions, "admin.settings.update");
  const canExport =
    has(permissions, "finance.refund.export") ||
    has(permissions, "finance.report.export") ||
    canCreate;
  const canViewAudit =
    has(permissions, "finance.refund.audit.view") ||
    has(permissions, "admin.audit.view") ||
    canCreate;

  return {
    canView,
    canCreate,
    canApprove,
    canReject,
    canComplete,
    canOverride,
    canExport,
    canViewAudit
  };
}

/** support_admin: create only, no complete */
export function canSupportCreateOnly(permissions: string[]): boolean {
  return (
    has(permissions, "finance.refund.create") &&
    !has(permissions, "finance.refund.complete") &&
    !has(permissions, "finance.refund.approve")
  );
}
