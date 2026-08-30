"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/data/server";
import { updateUsernamePolicyRuleAction } from "@/lib/admin/update-username-policy-rule";
import type {
  UsernamePolicyExceptionRow,
  UsernamePolicyRuleType,
  UsernamePolicyScope
} from "@/types/username-policy";

async function assertStaff() {
  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) throw new Error("Bạn cần đăng nhập.");
  if (!ctx.permissions.includes("admin.user.update")) {
    throw new Error("Bạn không có quyền quản lý ngoại lệ.");
  }
  return ctx;
}

export async function getUsernamePolicyExceptions(limit = 200) {
  await assertStaff();
  const db = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("username_policy_exceptions")
    .select("*")
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message.includes("username_policy_exceptions")) {
      return { items: [] as UsernamePolicyExceptionRow[], error: null };
    }
    return { items: [] as UsernamePolicyExceptionRow[], error: error.message };
  }

  const rows = (data ?? []).filter(
    (row) => !row.expires_at || String(row.expires_at) > now
  );

  const ruleIds = [...new Set(rows.map((r) => String(r.rule_id)))];
  const userIds = [...new Set(rows.map((r) => String(r.user_id)))];

  const ruleMap = new Map<
    string,
    { id: string; value: string; rule_type: UsernamePolicyRuleType }
  >();
  const userMap = new Map<string, { username: string | null; display_name: string | null }>();

  if (ruleIds.length) {
    const { data: rules } = await db
      .from("username_policy_rules")
      .select("id, value, rule_type")
      .in("id", ruleIds);
    for (const r of rules ?? []) {
      ruleMap.set(String(r.id), {
        id: String(r.id),
        value: String(r.value),
        rule_type: r.rule_type as UsernamePolicyRuleType
      });
    }
  }

  if (userIds.length) {
    const { data: users } = await db
      .from("profiles")
      .select("id, username, display_name")
      .in("id", userIds);
    for (const u of users ?? []) {
      userMap.set(String(u.id), {
        username: (u.username as string | null) ?? null,
        display_name: (u.display_name as string | null) ?? null
      });
    }
  }

  const items: UsernamePolicyExceptionRow[] = rows.map((row) => ({
    id: String(row.id),
    rule_id: String(row.rule_id),
    user_id: String(row.user_id),
    exception_scope: row.exception_scope as UsernamePolicyScope,
    expires_at: (row.expires_at as string | null) ?? null,
    reason: (row.reason as string | null) ?? null,
    public_note: (row.public_note as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    revoked_at: (row.revoked_at as string | null) ?? null,
    created_at: String(row.created_at),
    rule: ruleMap.get(String(row.rule_id)) ?? null,
    user: userMap.get(String(row.user_id)) ?? null
  }));

  return { items, error: null };
}

export async function createUsernamePolicyExceptionAction(input: {
  ruleId: string;
  userId: string;
  exceptionScope?: UsernamePolicyScope;
  expiresAt?: string | null;
  reason?: string | null;
  publicNote?: string | null;
}) {
  try {
    const actor = await assertStaff();
    const db = await createClient();

    const expiresAt = input.expiresAt
      ? new Date(`${input.expiresAt}T23:59:59.999Z`).toISOString()
      : null;

    const { data: existing } = await db
      .from("username_policy_exceptions")
      .select("id")
      .eq("rule_id", input.ruleId)
      .eq("user_id", input.userId)
      .maybeSingle();

    const payload = {
      rule_id: input.ruleId,
      user_id: input.userId,
      exception_scope: input.exceptionScope ?? "both",
      expires_at: expiresAt,
      reason: input.reason?.trim() || null,
      public_note: input.publicNote?.trim() || null,
      created_by: actor.userId,
      revoked_at: null
    };

    const { data, error } = existing?.id
      ? await db
          .from("username_policy_exceptions")
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .single()
      : await db.from("username_policy_exceptions").insert(payload).select("*").single();

    if (error) {
      return { ok: false, error: error.message };
    }

    const { data: rule } = await db
      .from("username_policy_rules")
      .select("allowed_user_ids")
      .eq("id", input.ruleId)
      .maybeSingle();

    const current = (rule?.allowed_user_ids as string[] | null) ?? [];
    if (!current.includes(input.userId)) {
      await updateUsernamePolicyRuleAction({
        ruleId: input.ruleId,
        allowedUserIds: [...current, input.userId]
      });
    }

    await createAdminAuditLog({
      action: "username_policy_exception_created",
      targetType: "username_policy_rule",
      targetId: input.ruleId,
      metadata: {
        user_id: input.userId,
        exception_scope: input.exceptionScope ?? "both",
        expires_at: input.expiresAt ?? null
      },
      note: input.reason ?? null
    });

    revalidatePath("/admin/username-policy");
    return { ok: true, error: null, exception: data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể tạo ngoại lệ."
    };
  }
}

export async function revokeUsernamePolicyExceptionAction(input: {
  exceptionId: string;
  reason?: string | null;
}) {
  try {
    await assertStaff();
    const db = await createClient();

    const { data: before } = await db
      .from("username_policy_exceptions")
      .select("*")
      .eq("id", input.exceptionId)
      .maybeSingle();

    if (!before) {
      return { ok: false, error: "Không tìm thấy ngoại lệ." };
    }

    const { error } = await db
      .from("username_policy_exceptions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", input.exceptionId);

    if (error) {
      return { ok: false, error: error.message };
    }

    const { data: rule } = await db
      .from("username_policy_rules")
      .select("allowed_user_ids")
      .eq("id", before.rule_id)
      .maybeSingle();

    const current = (rule?.allowed_user_ids as string[] | null) ?? [];
    await updateUsernamePolicyRuleAction({
      ruleId: String(before.rule_id),
      allowedUserIds: current.filter((id) => id !== before.user_id)
    });

    await createAdminAuditLog({
      action: "username_policy_exception_revoked",
      targetType: "username_policy_rule",
      targetId: String(before.rule_id),
      metadata: { user_id: before.user_id, exception_id: input.exceptionId },
      note: input.reason ?? null
    });

    revalidatePath("/admin/username-policy");
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể thu hồi ngoại lệ."
    };
  }
}

export async function setUsernameChangeLockAction(input: {
  userId: string;
  locked: boolean;
  reason: string;
}) {
  try {
    await assertStaff();
    if (!input.reason.trim()) {
      return { ok: false, error: "Vui lòng nhập lý do." };
    }

    const db = await createClient();
    const { data: before } = await db
      .from("profiles")
      .select("username_change_locked, username")
      .eq("id", input.userId)
      .maybeSingle();

    const { error } = await db
      .from("profiles")
      .update({ username_change_locked: input.locked })
      .eq("id", input.userId);

    if (error) {
      return { ok: false, error: error.message };
    }

    await createAdminAuditLog({
      action: input.locked ? "username_change_requested" : "username_conflict_resolved",
      targetType: "user",
      targetId: input.userId,
      before: { username_change_locked: before?.username_change_locked ?? false },
      after: { username_change_locked: input.locked },
      note: input.reason.trim()
    });

    revalidatePath("/admin/username-policy");
    revalidatePath(`/admin/users/${input.userId}`);
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể cập nhật khóa username."
    };
  }
}
