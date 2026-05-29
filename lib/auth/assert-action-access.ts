import { assertNotBanned, BannedUserError } from "@/lib/auth/require-not-banned";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import type { AuthPermissionContext } from "@/types/auth";
import type { PermissionCode } from "@/types/permissions";

export { BannedUserError };

export class ActionAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionAccessError";
  }
}

export async function assertActionAccess(
  permissionCode: PermissionCode,
  options?: { bannedMessage?: string; deniedMessage?: string }
): Promise<AuthPermissionContext> {
  const context = await getCurrentAuthContext();

  if (!context) {
    throw new ActionAccessError("Bạn cần đăng nhập để thực hiện thao tác này.");
  }

  try {
    await assertNotBanned(context.userId, {
      message:
        options?.bannedMessage ??
        "Tài khoản của bạn đang bị hạn chế. Không thể thực hiện thao tác này."
    });
  } catch (error) {
    if (error instanceof BannedUserError) {
      throw new ActionAccessError(error.message);
    }
    throw error;
  }

  if (!context.permissions.includes(permissionCode)) {
    throw new ActionAccessError(
      options?.deniedMessage ?? "Bạn không có quyền thực hiện thao tác này."
    );
  }

  return context;
}
