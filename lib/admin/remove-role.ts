"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { countUsersWithRole } from "@/lib/admin/get-users";
import { canActorRemoveRole } from "@/lib/admin/rbac-policy";
import { isSensitiveRole } from "@/lib/admin/roles";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/data/server";
import type { RoleCode } from "@/types/permissions";

async function getActorContext() {
  const ctx = await getCurrentAuthContext();
  if (!ctx) {
    throw new Error("Bạn cần đăng nhập.");
  }
  return ctx;
}

export async function removeUserRole(input: {
  userId: string;
  roleCode: RoleCode;
  reason?: string;
}) {
  const actor = await getActorContext();
  await assertPermission("admin.user.role.assign");

  const reason = input.reason?.trim() || "Thao tác quản trị hệ thống";

  const policy = canActorRemoveRole(actor.roles, input.roleCode);
  if (!policy.ok) {
    return { ok: false, error: policy.error };
  }

  const db = await createClient();

  if (input.roleCode === "owner") {
    const { data: ownerRole } = await db
      .from("roles")
      .select("id")
      .eq("code", "owner")
      .maybeSingle();

    if (ownerRole) {
      const { data: hasOwner } = await db
        .from("user_roles")
        .select("user_id")
        .eq("user_id", input.userId)
        .eq("role_id", ownerRole.id)
        .maybeSingle();

      const otherOwners = await countUsersWithRole("owner", input.userId);
      if (hasOwner && otherOwners === 0) {
        return {
          ok: false,
          error: "Không thể gỡ owner cuối cùng trong hệ thống."
        };
      }
    }
  }

  const { data: roleRow } = await db
    .from("roles")
    .select("id")
    .eq("code", input.roleCode)
    .maybeSingle();

  if (!roleRow) {
    return { ok: false, error: "Không tìm thấy vai trò." };
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

  const { error } = await db
    .from("user_roles")
    .delete()
    .eq("user_id", input.userId)
    .eq("role_id", roleRow.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  const auditResult = await logAdminAction({
    actorId: actor.userId,
    action: sensitive ? "sensitive_role_removed" : "role_removed",
    targetType: "user",
    targetId: input.userId,
    metadata: {
      role_code: input.roleCode,
      target_user_id: input.userId,
      reason,
      old_value: input.roleCode
    }
  });

  if (!auditResult.ok && auditResult.error) {
    await db.from("user_roles").upsert({
      user_id: input.userId,
      role_id: roleRow.id,
      assigned_by: actor.userId
    });
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
