import type { ProfileRole } from "@/lib/auth/getCurrentProfile";
import type { ClientPermissionFlags, PermissionCode, RoleCode } from "@/types/permissions";

export type AuthRoleRow = {
  code: RoleCode;
  name: string;
  expires_at: string | null;
};

export type AuthPermissionContext = {
  userId: string;
  roles: RoleCode[];
  permissions: PermissionCode[];
  profileRole: ProfileRole | null;
  profileStatus: string | null;
  flags: ClientPermissionFlags;
};
