export {
  assertAnyPermission,
  assertPermission,
  requireAdmin,
  requireAdminOrModeratorAccess,
  requireAdminSettingsAccess,
  requireFinanceAccess,
  requirePermission
} from "@/lib/auth/require-permission";

export {
  assertStaffAnyPermission,
  assertStaffPermission,
  checkStaffAnyPermission,
  checkStaffPermission
} from "@/lib/auth/staff-guards";
