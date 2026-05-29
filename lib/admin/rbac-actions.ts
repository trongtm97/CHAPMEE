/** @deprecated Import from specific modules; re-exports for compatibility. */
export {
  searchAdminUsers,
  getAdminUserDetail,
  type AdminUserSearchResult,
  type AdminUserRoleRow
} from "@/lib/admin/get-users";

export { assignUserRole } from "@/lib/admin/assign-role";
export { removeUserRole } from "@/lib/admin/remove-role";
export { banUserAction, unbanUserAction } from "@/lib/admin/ban-user";
export {
  getAdminAuditLogs,
  getRolesWithPermissions,
  type AdminAuditLogRow
} from "@/lib/admin/get-audit-logs";
