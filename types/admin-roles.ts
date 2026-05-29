import type { PermissionCode, RoleCode } from "@/types/permissions";

export type RoleGroupKey =
  | "platform_admin"
  | "operations"
  | "finance"
  | "support"
  | "creator"
  | "reader"
  | "restricted"
  | "guest";

export type RoleAdminTab =
  | "overview"
  | "roles"
  | "matrix"
  | "users"
  | "sensitive"
  | "audit";

export type RoleDrawerTab =
  | "overview"
  | "permissions"
  | "users"
  | "sensitive"
  | "history"
  | "audit";

export type RoleSortKey =
  | "users_desc"
  | "permissions_desc"
  | "sensitive_first"
  | "name_asc";

export type RolePermissionRow = {
  code: string;
  name: string;
  group_key: string | null;
};

export type AdminRoleRow = {
  id: string;
  code: RoleCode;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  permissions: RolePermissionRow[];
  user_count: number;
  status: "active" | "disabled";
};

export type RoleCenterSummary = {
  totalRoles: number;
  systemRoles: number;
  financeRoles: number;
  moderationRoles: number;
  userAdminRoles: number;
  adminUsers: number;
  changes7d: number;
  emptyPermissionRoles: number;
};

export type RoleCenterCapabilities = {
  canAssignRoles: boolean;
  canViewAudit: boolean;
  actorRoles: RoleCode[];
};

export type RoleUserRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
  status: string;
  is_verified: boolean;
  is_creator: boolean;
  role_code: RoleCode;
  role_name: string;
  assigned_at: string;
  assigned_by: string | null;
  assigned_by_label: string | null;
  expires_at: string | null;
};

export type RoleAuditLogRow = {
  id: string;
  action: string;
  actor_id: string | null;
  actor_label: string | null;
  target_user_id: string | null;
  target_user_label: string | null;
  role_key: string | null;
  permission_key: string | null;
  reason: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

export type PermissionCheckResult = {
  hasPermission: boolean;
  permissionCode: PermissionCode;
  sourceRoles: Array<{
    code: RoleCode;
    label: string;
    active: boolean;
  }>;
  isBannedOverride: boolean;
  isRestrictedOverride: boolean;
  suggestion: string;
};

export type RoleCenterInitialData = {
  roles: AdminRoleRow[];
  summary: RoleCenterSummary;
  capabilities: RoleCenterCapabilities;
  auditLogs: RoleAuditLogRow[];
  error: string | null;
};
