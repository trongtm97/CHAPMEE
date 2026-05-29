import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_BANNED_MESSAGE =
  "Tài khoản của bạn đang bị hạn chế. Không thể thực hiện thao tác này.";

export class BannedUserError extends Error {
  constructor(message = DEFAULT_BANNED_MESSAGE) {
    super(message);
    this.name = "BannedUserError";
  }
}

export async function isUserWriteBlocked(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.status === "banned" || profile?.status === "suspended") {
    return true;
  }

  const { data: activeBan } = await supabase
    .from("user_bans")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return Boolean(activeBan);
}

export async function requireNotBanned(
  userId?: string,
  options?: { message?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const context = await getCurrentAuthContext();
  const targetUserId = userId ?? context?.userId;

  if (!targetUserId) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  if (context?.flags.isBanned && (!userId || userId === context.userId)) {
    return {
      ok: false,
      error: options?.message ?? DEFAULT_BANNED_MESSAGE
    };
  }

  const blocked = await isUserWriteBlocked(targetUserId);
  if (blocked) {
    return {
      ok: false,
      error: options?.message ?? DEFAULT_BANNED_MESSAGE
    };
  }

  return { ok: true };
}

export async function assertNotBanned(
  userId?: string,
  options?: { message?: string }
): Promise<void> {
  const result = await requireNotBanned(userId, options);
  if (!result.ok) {
    throw new BannedUserError(result.error);
  }
}
