import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { assertNotBanned, BannedUserError } from "@/lib/auth/require-not-banned";
import {
  assertAnyPermission,
  assertPermission
} from "@/lib/auth/require-permission";
import type { PermissionCode } from "@/types/permissions";

export { requireAdminPermission } from "@/lib/auth/require-permission";

export { ActionAccessError, BannedUserError };

export async function guardUserMutation(input: {
  permission: PermissionCode;
  checkBanned?: boolean;
  bannedMessage?: string;
  deniedMessage?: string;
}) {
  if (input.checkBanned !== false) {
    await assertNotBanned(undefined, { message: input.bannedMessage });
  }

  return assertActionAccess(input.permission, {
    bannedMessage: input.bannedMessage,
    deniedMessage: input.deniedMessage
  });
}

export async function guardStaffMutation(permission: PermissionCode) {
  await assertPermission(permission);
}

export async function guardStaffAnyMutation(permissions: PermissionCode[]) {
  await assertAnyPermission(permissions);
}
