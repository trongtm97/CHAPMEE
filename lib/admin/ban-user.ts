"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/data/server";

async function getActorContext() {
  const ctx = await getCurrentAuthContext();
  if (!ctx) {
    throw new Error("Bạn cần đăng nhập.");
  }
  return ctx;
}

export async function banUserAction(input: {
  userId: string;
  reason: string;
  endsAt?: string | null;
}) {
  const actor = await getActorContext();
  const canBan =
    actor.permissions.includes("admin.user.ban") ||
    actor.permissions.includes("moderation.ban_user");
  if (!canBan) {
    return { ok: false, error: "Bạn không có quyền ban người dùng." };
  }

  const reason = input.reason.trim();
  if (!reason) {
    return { ok: false, error: "Vui lòng nhập lý do ban." };
  }

  const db = await createClient();

  const { error: statusError } = await db.rpc("staff_set_profile_status", {
    target_user_id: input.userId,
    new_status: "banned"
  });
  if (statusError) {
    const { isMissingSchemaError } = await import("@/lib/data/schema-errors");
    if (!isMissingSchemaError(statusError)) {
      return { ok: false, error: statusError.message };
    }
  }

  const { error: banError } = await db.from("user_bans").insert({
    user_id: input.userId,
    reason,
    banned_by: actor.userId,
    ends_at: input.endsAt ?? null,
    is_active: true
  });

  if (banError) {
    return { ok: false, error: banError.message };
  }

  const { data: bannedRole } = await db
    .from("roles")
    .select("id")
    .eq("code", "banned_user")
    .maybeSingle();

  if (bannedRole) {
    await db.from("user_roles").upsert(
      {
        user_id: input.userId,
        role_id: bannedRole.id,
        assigned_by: actor.userId
      },
      { onConflict: "user_id,role_id" }
    );
  }

  await logAdminAction({
    actorId: actor.userId,
    action: "ban_user",
    targetType: "user",
    targetId: input.userId,
    metadata: {
      target_user_id: input.userId,
      reason,
      ends_at: input.endsAt ?? null,
      permanent: input.endsAt == null
    }
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  return { ok: true, error: null };
}

export async function unbanUserAction(userId: string) {
  const actor = await getActorContext();
  const canUnban =
    actor.permissions.includes("moderation.unban_user") ||
    actor.permissions.includes("admin.user.ban");
  if (!canUnban) {
    return { ok: false, error: "Bạn không có quyền gỡ ban." };
  }

  const db = await createClient();

  await db.rpc("staff_set_profile_status", {
    target_user_id: userId,
    new_status: "active"
  });

  await db
    .from("user_bans")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  const { data: bannedRole } = await db
    .from("roles")
    .select("id")
    .eq("code", "banned_user")
    .maybeSingle();

  if (bannedRole) {
    await db
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role_id", bannedRole.id);
  }

  await logAdminAction({
    actorId: actor.userId,
    action: "unban_user",
    targetType: "user",
    targetId: userId,
    metadata: { target_user_id: userId }
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  return { ok: true, error: null };
}
