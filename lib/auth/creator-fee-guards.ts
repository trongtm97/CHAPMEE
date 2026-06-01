import { checkStaffAnyPermission, checkStaffPermission } from "@/lib/auth/staff-guards";
import type { PermissionCode } from "@/types/permissions";

export async function requireCreatorFeeViewAccess() {
  return checkStaffAnyPermission([
    "finance.creator_fee.view",
    "finance.wallet.adjust",
    "finance.dashboard.view"
  ]);
}

export async function requireCreatorFeeCreateAccess() {
  return checkStaffAnyPermission([
    "finance.creator_fee.create",
    "finance.wallet.adjust"
  ]);
}

export async function requireCreatorFeeUpdateAccess() {
  return checkStaffAnyPermission([
    "finance.creator_fee.update",
    "finance.wallet.adjust"
  ]);
}

export async function requireCreatorFeePauseAccess() {
  return checkStaffAnyPermission([
    "finance.creator_fee.pause",
    "finance.wallet.adjust"
  ]);
}

export async function requireCreatorFeeRevokeAccess() {
  return checkStaffAnyPermission([
    "finance.creator_fee.revoke",
    "finance.wallet.adjust"
  ]);
}

export async function requireCreatorFeeExportAccess() {
  return checkStaffAnyPermission([
    "finance.creator_fee.export",
    "finance.report.export",
    "finance.wallet.adjust"
  ]);
}

export async function requireCreatorFeePermission(code: PermissionCode) {
  return checkStaffPermission(code);
}
