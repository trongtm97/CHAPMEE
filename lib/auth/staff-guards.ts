import { getCurrentAuthContext } from "@/lib/auth/permissions";
import type { AuthPermissionContext } from "@/types/auth";
import type { PermissionCode } from "@/types/permissions";

export type StaffAuthResult =
  | { ok: true; userId: string; context: AuthPermissionContext }
  | { ok: false; error: string };

export async function getStaffAuthContext(): Promise<StaffAuthResult> {
  const context = await getCurrentAuthContext();
  if (!context) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }
  return { ok: true, userId: context.userId, context };
}

export async function checkStaffPermission(
  permissionCode: PermissionCode
): Promise<StaffAuthResult> {
  const auth = await getStaffAuthContext();
  if (!auth.ok) return auth;
  if (!auth.context.permissions.includes(permissionCode)) {
    return { ok: false, error: "Bạn không có quyền thực hiện thao tác này." };
  }
  return auth;
}

export async function checkStaffAnyPermission(
  permissionCodes: PermissionCode[]
): Promise<StaffAuthResult> {
  const auth = await getStaffAuthContext();
  if (!auth.ok) return auth;
  const allowed = permissionCodes.some((code) =>
    auth.context.permissions.includes(code)
  );
  if (!allowed) {
    return { ok: false, error: "Bạn không có quyền thực hiện thao tác này." };
  }
  return auth;
}

export async function assertStaffPermission(
  permissionCode: PermissionCode
): Promise<{ userId: string; context: AuthPermissionContext }> {
  const auth = await checkStaffPermission(permissionCode);
  if (!auth.ok) {
    throw new Error(auth.error);
  }
  return { userId: auth.userId, context: auth.context };
}

export async function assertStaffAnyPermission(
  permissionCodes: PermissionCode[]
): Promise<{ userId: string; context: AuthPermissionContext }> {
  const auth = await checkStaffAnyPermission(permissionCodes);
  if (!auth.ok) {
    throw new Error(auth.error);
  }
  return { userId: auth.userId, context: auth.context };
}
