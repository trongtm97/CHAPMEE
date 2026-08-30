"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { assignUserRole } from "@/lib/admin/assign-role";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/require-permission";
import { createAdminClient } from "@/lib/data/admin";
import { normalizeUsername, validateUsernameFormat } from "@/lib/username/normalize-username";
import { validateDisplayName } from "@/lib/username/validate-display-name";
import type { RoleCode } from "@/types/permissions";

export type CreateAdminUserInput = {
  email: string;
  password: string;
  displayName: string;
  username?: string | null;
  initialRole?: RoleCode;
};

export async function createAdminUserAction(input: CreateAdminUserInput) {
  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  try {
    await assertPermission("admin.user.update");
  } catch {
    return { ok: false, error: "Không có quyền tạo tài khoản." };
  }

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) {
    return { ok: false, error: "Email không hợp lệ." };
  }

  if (input.password.length < 8) {
    return { ok: false, error: "Mật khẩu tối thiểu 8 ký tự." };
  }

  const displayName = input.displayName.trim();
  if (displayName.length < 2) {
    return { ok: false, error: "Tên hiển thị tối thiểu 2 ký tự." };
  }

  const displayPolicy = await validateDisplayName(displayName);
  if (!displayPolicy.valid) {
    return { ok: false, error: displayPolicy.message ?? "Tên hiển thị không hợp lệ." };
  }

  let username: string | null = null;
  if (input.username?.trim()) {
    const format = validateUsernameFormat(input.username);
    if (format.error || !format.normalized) {
      return { ok: false, error: format.error ?? "Username không hợp lệ." };
    }
    username = format.normalized;
  } else {
    username = normalizeUsername(email.split("@")[0] ?? "user");
    if (username.length < 3) {
      username = `u${Date.now().toString(36).slice(-6)}`;
    }
  }

  const initialRole: RoleCode = input.initialRole ?? "reader";

  if (initialRole !== "reader") {
    try {
      await assertPermission("admin.user.role.assign");
    } catch {
      return {
        ok: false,
        error: "Bạn không có quyền gán vai trò khởi tạo ngoài reader."
      };
    }
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Thiếu cấu hình server (DATABASE_URL / BETTER_AUTH_SECRET)."
    };
  }

  const created = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { display_name: displayName, created_by_admin: true }
  });

  const authUser = created.data?.user;
  if (created.error || !authUser) {
    return {
      ok: false,
      error: created.error?.message ?? "Không thể tạo user trên Auth."
    };
  }

  const userId = authUser.id;

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    display_name: displayName,
    username,
    role: "user",
    status: "active"
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: profileError.message };
  }

  const { data: readerRole } = await admin
    .from("roles")
    .select("id")
    .eq("code", "reader")
    .maybeSingle();

  if (readerRole?.id) {
    await admin.from("user_roles").upsert(
      { user_id: userId, role_id: readerRole.id, assigned_by: ctx.userId },
      { onConflict: "user_id,role_id" }
    );
  }

  if (initialRole !== "reader") {
    const assign = await assignUserRole({ userId, roleCode: initialRole });
    if (!assign.ok) {
      return {
        ok: false,
        error: `Tài khoản đã tạo nhưng gán vai trò thất bại: ${assign.error}`
      };
    }
  }

  await createAdminAuditLog({
    action: "admin_user_create",
    targetType: "user",
    targetId: userId,
    after: {
      email,
      username,
      display_name: displayName,
      initial_role: initialRole
    },
    metadata: { admin_id: ctx.userId }
  });

  revalidatePath("/admin/users");

  return {
    ok: true,
    user: { id: userId, email, username, displayName, initialRole }
  };
}
