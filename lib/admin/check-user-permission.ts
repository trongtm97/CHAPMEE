"use server";

import { getAuthContextForUser } from "@/lib/auth/permissions";
import { assertAnyPermission } from "@/lib/auth/require-permission";
import { formatRoleLabel } from "@/lib/admin/roles";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/data/server";
import type { PermissionCheckResult } from "@/types/admin-roles";
import type { PermissionCode, RoleCode } from "@/types/permissions";
import type { ProfileRole } from "@/lib/auth/getCurrentProfile";

export async function checkUserPermissionAction(input: {
  userId: string;
  permissionCode: PermissionCode;
}): Promise<{ ok: boolean; result: PermissionCheckResult | null; error: string | null }> {
  await assertAnyPermission([
    "admin.role.view",
    "admin.user.role.view",
    "admin.settings.view",
    "admin.user.role.assign"
  ]);

  const actor = await getCurrentAuthContext();
  if (!actor) {
    return { ok: false, result: null, error: "Bạn cần đăng nhập." };
  }

  const db = await createClient();
  const { data: profile } = await db
    .from("profiles")
    .select("role, status")
    .eq("id", input.userId)
    .maybeSingle();

  if (!profile) {
    return { ok: false, result: null, error: "Không tìm thấy người dùng." };
  }

  const ctx = await getAuthContextForUser(
    input.userId,
    (profile.role as ProfileRole | null) ?? null,
    String(profile.status ?? "active")
  );

  const hasPerm = ctx.permissions.includes(input.permissionCode);

  const sourceRoles: PermissionCheckResult["sourceRoles"] = [];
  for (const roleCode of ctx.roles) {
    const { data: roleRow } = await db
      .from("roles")
      .select("id")
      .eq("code", roleCode)
      .maybeSingle();
    if (!roleRow) continue;

    const { data: mappings } = await db
      .from("role_permissions")
      .select("permissions(code)")
      .eq("role_id", roleRow.id);

    const codes = (mappings ?? [])
      .map((m) => {
        const p = m.permissions as { code: string } | { code: string }[] | null;
        return Array.isArray(p) ? p[0]?.code : p?.code;
      })
      .filter(Boolean);

    if (codes.includes(input.permissionCode)) {
      const { data: ur } = await db
        .from("user_roles")
        .select("expires_at")
        .eq("user_id", input.userId)
        .eq("role_id", roleRow.id)
        .maybeSingle();

      const active =
        !ur?.expires_at || new Date(ur.expires_at).getTime() > Date.now();

      sourceRoles.push({
        code: roleCode as RoleCode,
        label: formatRoleLabel(roleCode as RoleCode),
        active
      });
    }
  }

  const isBannedOverride = ctx.flags.isBanned;
  const isRestrictedOverride = ctx.roles.includes("banned_user");

  let suggestion = "";
  if (hasPerm && sourceRoles.length) {
    const primary = sourceRoles[0];
    suggestion = `User có quyền ${input.permissionCode} do role ${primary.code}.`;
  } else if (isBannedOverride || isRestrictedOverride) {
    suggestion =
      "User bị hạn chế — một số quyền ghi có thể bị override bởi banned_user hoặc trạng thái tài khoản.";
  } else if (!hasPerm) {
    suggestion = "User không có quyền này. Kiểm tra vai trò hiện tại hoặc cân nhắc gán role phù hợp.";
  }

  const result: PermissionCheckResult = {
    hasPermission: hasPerm,
    permissionCode: input.permissionCode,
    sourceRoles,
    isBannedOverride,
    isRestrictedOverride,
    suggestion
  };

  await logAdminAction({
    actorId: actor.userId,
    action: "user_permission_checked",
    targetType: "user",
    targetId: input.userId,
    metadata: {
      permission_key: input.permissionCode,
      target_user_id: input.userId,
      has_permission: hasPerm,
      source_roles: sourceRoles.map((r) => r.code)
    }
  });

  return { ok: true, result, error: null };
}
