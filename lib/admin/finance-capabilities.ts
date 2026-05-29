import type { AuthPermissionContext } from "@/types/auth";
import type { FinanceCapabilities } from "@/types/finance";
import type { PermissionCode } from "@/types/permissions";

function has(perms: PermissionCode[], code: PermissionCode) {
  return perms.includes(code);
}

export function getFinanceCapabilities(
  context: AuthPermissionContext | null
): FinanceCapabilities {
  if (!context) {
    return {
      canViewDashboard: false,
      canViewTransactions: false,
      canViewPayouts: false,
      canApprovePayouts: false,
      canViewRefunds: false,
      canCreateRefunds: false,
      canExportReports: false,
      canViewRisk: false
    };
  }

  const perms = context.permissions;
  const canViewDashboard = has(perms, "finance.dashboard.view");
  const canViewTransactions =
    canViewDashboard &&
    (has(perms, "wallet.transaction.view.all") || has(perms, "finance.dashboard.view"));
  const canViewPayouts = has(perms, "finance.payout.view");
  const canApprovePayouts =
    has(perms, "finance.payout.approve") || has(perms, "finance.payout.reject");
  const canViewRefunds =
    has(perms, "finance.refund.view") ||
    has(perms, "finance.refund.create") ||
    canViewDashboard;
  const canCreateRefunds = has(perms, "finance.refund.create");
  const canExportReports =
    has(perms, "finance.report.export") ||
    (canViewDashboard && has(perms, "wallet.transaction.view.all"));
  const canViewRisk =
    has(perms, "finance.risk.view") || canViewDashboard;

  return {
    canViewDashboard,
    canViewTransactions,
    canViewPayouts,
    canApprovePayouts,
    canViewRefunds,
    canCreateRefunds,
    canExportReports,
    canViewRisk
  };
}
