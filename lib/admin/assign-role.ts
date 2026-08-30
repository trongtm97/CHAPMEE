"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { canActorAssignRole } from "@/lib/admin/rbac-policy";
import { isSensitiveRole } from "@/lib/admin/roles";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/require-permission";
import { rbacRoleToLegacyProfileRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/data/server";
import type { RoleCode } from "@/types/permissions";

async function getActorContext() {
  const ctx = await getCurrentAuthContext();
  if (!ctx) {
    throw new Error("Bạn cần đăng nhập.");
  }
  return ctx;
}

export async function assignUserRole(input: {
  userId: string;
  roleCode: RoleCode;
  reason?: string;
  expiresAt?: string | null;
}) {
  const actor = await getActorContext();
  await assertPermission("admin.user.role.assign");

  const reason = input.reason?.trim() || "Thao tác quản trị hệ thống";

  const policy = canActorAssignRole(actor.roles, input.roleCode);
  if (!policy.ok) {
    return { ok: false, error: policy.error };
  }

  const db = await createClient();
  const { data: roleRow, error: roleError } = await db
    .from("roles")
    .select("id, code")
    .eq("code", input.roleCode)
    .maybeSingle();

  if (roleError || !roleRow) {
    return { ok: false, error: roleError?.message ?? "Không tìm thấy vai trò." };
  }

  const { data: permMappings } = await db
    .from("role_permissions")
    .select("permissions(code)")
    .eq("role_id", roleRow.id);

  const permissions = (permMappings ?? [])
    .map((row) => {
      const nested = row.permissions as { code: string } | { code: string }[] | null;
      return Array.isArray(nested) ? nested[0] : nested;
    })
    .filter(Boolean) as Array<{ code: string }>;

  const sensitive = isSensitiveRole(input.roleCode, permissions);

  const upsertPayload: {
    user_id: string;
    role_id: string;
    assigned_by: string;
    expires_at?: string | null;
  } = {
    user_id: input.userId,
    role_id: roleRow.id,
    assigned_by: actor.userId
  };

  if (input.expiresAt) {
    upsertPayload.expires_at = input.expiresAt;
  }

  const { error } = await db.from("user_roles").upsert(upsertPayload, {
    onConflict: "user_id,role_id"
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const legacyRole = rbacRoleToLegacyProfileRole(input.roleCode);
  if (legacyRole) {
    await db.from("profiles").update({ role: legacyRole }).eq("id", input.userId);
  }

  if (input.roleCode === "creator") {
    const { data: existingCreator } = await db
      .from("creator_profiles")
      .select("id")
      .eq("user_id", input.userId)
      .maybeSingle();

    if (!existingCreator) {
      const { data: profile } = await db
        .from("profiles")
        .select("display_name, username")
        .eq("id", input.userId)
        .maybeSingle();

      const penName =
        profile?.display_name?.trim() ||
        profile?.username?.trim() ||
        "Tác giả mới";

      await db.from("creator_profiles").insert({
        user_id: input.userId,
        pen_name: penName.slice(0, 80),
        status: "active"
      });
    }
  }

  const auditResult = await logAdminAction({
    actorId: actor.userId,
    action: sensitive ? "sensitive_role_assigned" : "role_assigned",
    targetType: "user",
    targetId: input.userId,
    metadata: {
      role_code: input.roleCode,
      target_user_id: input.userId,
      reason,
      new_value: input.roleCode,
      expires_at: input.expiresAt ?? null
    }
  });

  if (!auditResult.ok && auditResult.error) {
    await db
      .from("user_roles")
      .delete()
      .eq("user_id", input.userId)
      .eq("role_id", roleRow.id);
    return {
      ok: false,
      error: "Không ghi được audit log. Thao tác đã hủy."
    };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/roles");
  revalidatePath("/admin/audit");
  return { ok: true, error: null };
}
