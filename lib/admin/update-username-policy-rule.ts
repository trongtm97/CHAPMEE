"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { createUsernamePolicyExceptionAction } from "@/lib/admin/username-policy-exceptions";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/data/server";
import { revalidatePublicProfilePaths } from "@/lib/profile/revalidate-public-profile";
import { normalizePolicyText } from "@/lib/username/normalize-policy-text";
import { normalizeUsername } from "@/lib/username/normalize-username";
import type {
  UsernamePolicyEnforcementLevel,
  UsernamePolicyMatchType,
  UsernamePolicyRuleType,
  UsernamePolicyScope
} from "@/types/username-policy";

async function assertStaff() {
  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) {
    throw new Error("Bạn cần đăng nhập.");
  }
  if (!ctx.permissions.includes("admin.user.update")) {
    throw new Error("Bạn không có quyền quản lý chính sách username.");
  }
  return ctx;
}

function resolveNormalizedValue(
  ruleType: UsernamePolicyRuleType,
  value: string,
  matchType: UsernamePolicyMatchType
) {
  if (
    ruleType === "reserved_username" ||
    ruleType === "banned_username" ||
    ruleType === "system_reserved" ||
    ruleType === "brand_reserved" ||
    (ruleType === "protected_word" && matchType === "exact")
  ) {
    const asUsername = normalizeUsername(value);
    return normalizePolicyText(asUsername || value);
  }
  return normalizePolicyText(value);
}

export async function editUsernamePolicyRuleAction(input: {
  ruleId: string;
  ruleType: UsernamePolicyRuleType;
  value: string;
  matchType: UsernamePolicyMatchType;
  scope: UsernamePolicyScope;
  enforcementLevel: UsernamePolicyEnforcementLevel;
  priority: number;
  note?: string | null;
  reason?: string | null;
  isActive: boolean;
}) {
  try {
    await assertStaff();
    const value = input.value.trim();
    if (!value) {
      return { ok: false, error: "Vui lòng nhập giá trị rule." };
    }

    const db = await createClient();
    const { data: before } = await db
      .from("username_policy_rules")
      .select("*")
      .eq("id", input.ruleId)
      .maybeSingle();

    if (!before) {
      return { ok: false, error: "Không tìm thấy rule." };
    }

    const normalized_value = resolveNormalizedValue(
      input.ruleType,
      value,
      input.matchType
    );

    const { data: after, error } = await db
      .from("username_policy_rules")
      .update({
        rule_type: input.ruleType,
        value,
        normalized_value,
        match_type: input.matchType,
        scope: input.scope,
        enforcement_level: input.enforcementLevel,
        priority: input.priority,
        note: input.note?.trim() || null,
        reason: input.reason?.trim() || null,
        is_active: input.isActive
      })
      .eq("id", input.ruleId)
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await createAdminAuditLog({
      action: "username_policy_update",
      targetType: "username_policy_rule",
      targetId: input.ruleId,
      before: before as Record<string, unknown>,
      after: after as Record<string, unknown>
    });

    revalidatePath("/admin/username-policy");
    revalidatePath("/admin/audit");
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể sửa rule."
    };
  }
}

export async function updateUsernamePolicyRuleAction(input: {
  ruleId: string;
  isActive?: boolean;
  note?: string | null;
  reason?: string | null;
  allowedUserIds?: string[];
  scope?: UsernamePolicyScope;
  matchType?: UsernamePolicyMatchType;
  enforcementLevel?: UsernamePolicyEnforcementLevel;
  priority?: number;
}) {
  try {
    await assertStaff();
    const db = await createClient();

    const { data: before } = await db
      .from("username_policy_rules")
      .select("*")
      .eq("id", input.ruleId)
      .maybeSingle();

    if (!before) {
      return { ok: false, error: "Không tìm thấy rule." };
    }

    const patch: Record<string, unknown> = {};
    if (typeof input.isActive === "boolean") patch.is_active = input.isActive;
    if (input.note !== undefined) patch.note = input.note?.trim() || null;
    if (input.reason !== undefined) patch.reason = input.reason?.trim() || null;
    if (input.allowedUserIds !== undefined) patch.allowed_user_ids = input.allowedUserIds;
    if (input.scope) patch.scope = input.scope;
    if (input.matchType) patch.match_type = input.matchType;
    if (input.enforcementLevel) patch.enforcement_level = input.enforcementLevel;
    if (typeof input.priority === "number") patch.priority = input.priority;

    const { data: after, error } = await db
      .from("username_policy_rules")
      .update(patch)
      .eq("id", input.ruleId)
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    const auditAction =
      typeof input.isActive === "boolean"
        ? input.isActive
          ? "username_policy_rule_enabled"
          : "username_policy_rule_disabled"
        : "username_policy_update";

    await createAdminAuditLog({
      action: auditAction,
      targetType: "username_policy_rule",
      targetId: input.ruleId,
      before: before as Record<string, unknown>,
      after: after as Record<string, unknown>
    });

    revalidatePath("/admin/username-policy");
    revalidatePath("/admin/audit");
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể cập nhật rule."
    };
  }
}

export async function archiveUsernamePolicyRuleAction(input: {
  ruleId: string;
  reason?: string | null;
}) {
  try {
    await assertStaff();
    const db = await createClient();

    const { data: before } = await db
      .from("username_policy_rules")
      .select("*")
      .eq("id", input.ruleId)
      .maybeSingle();

    if (!before) {
      return { ok: false, error: "Không tìm thấy rule." };
    }

    const { data: after, error } = await db
      .from("username_policy_rules")
      .update({
        is_active: false,
        archived_at: new Date().toISOString(),
        reason: input.reason?.trim() || before.reason
      })
      .eq("id", input.ruleId)
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await createAdminAuditLog({
      action: "username_policy_rule_archived",
      targetType: "username_policy_rule",
      targetId: input.ruleId,
      before: before as Record<string, unknown>,
      after: after as Record<string, unknown>,
      note: input.reason ?? null
    });

    revalidatePath("/admin/username-policy");
    revalidatePath("/admin/audit");
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể lưu trữ rule."
    };
  }
}

export async function addAllowedUserToRuleAction(input: {
  ruleId: string;
  userId: string;
  reason?: string | null;
  exceptionScope?: UsernamePolicyScope;
  expiresAt?: string | null;
  publicNote?: string | null;
}) {
  return createUsernamePolicyExceptionAction({
    ruleId: input.ruleId,
    userId: input.userId,
    reason: input.reason,
    exceptionScope: input.exceptionScope,
    expiresAt: input.expiresAt,
    publicNote: input.publicNote
  });
}

export async function revokeAllowedUserFromRuleAction(input: {
  ruleId: string;
  userId: string;
  reason?: string | null;
}) {
  const db = await createClient();
  const { data: ex } = await db
    .from("username_policy_exceptions")
    .select("id")
    .eq("rule_id", input.ruleId)
    .eq("user_id", input.userId)
    .is("revoked_at", null)
    .maybeSingle();

  if (ex?.id) {
    const { revokeUsernamePolicyExceptionAction } = await import(
      "@/lib/admin/username-policy-exceptions"
    );
    return revokeUsernamePolicyExceptionAction({
      exceptionId: String(ex.id),
      reason: input.reason
    });
  }

  const { data: rule } = await db
    .from("username_policy_rules")
    .select("allowed_user_ids")
    .eq("id", input.ruleId)
    .maybeSingle();

  if (!rule) {
    return { ok: false, error: "Không tìm thấy rule." };
  }

  const current = (rule.allowed_user_ids as string[] | null) ?? [];
  return updateUsernamePolicyRuleAction({
    ruleId: input.ruleId,
    allowedUserIds: current.filter((id) => id !== input.userId)
  });
}

export async function adminSetUserUsernameAction(input: {
  userId: string;
  newUsername: string;
  changeReason: string;
  createExceptionForRuleId?: string | null;
  forceWithExistingException?: boolean;
}) {
  try {
    const actor = await assertStaff();

    if (!input.changeReason.trim()) {
      return { ok: false, error: "Vui lòng nhập lý do nội bộ." };
    }

    const { validateUsername } = await import("@/lib/username/validate-username");
    const { recordUsernameChange } = await import("@/lib/username/record-username-change");

    if (input.createExceptionForRuleId) {
      await addAllowedUserToRuleAction({
        ruleId: input.createExceptionForRuleId,
        userId: input.userId,
        reason: input.changeReason
      });
    }

    const result = await validateUsername(input.newUsername, input.userId);
    if (!result.valid || !result.normalized) {
      return { ok: false, error: result.message ?? "Username không hợp lệ." };
    }

    const normalized = result.normalized;

    const db = await createClient();
    const { data: profile } = await db
      .from("profiles")
      .select("username")
      .eq("id", input.userId)
      .maybeSingle();

    const { error } = await db
      .from("profiles")
      .update({ username: normalized })
      .eq("id", input.userId);

    if (error) {
      return { ok: false, error: error.message };
    }

    await recordUsernameChange({
      userId: input.userId,
      oldUsername: profile?.username ?? null,
      newUsername: normalized,
      changedBy: actor.userId,
      changeReason: input.changeReason.trim()
    });

    await createAdminAuditLog({
      action: "username_manual_assigned",
      targetType: "user",
      targetId: input.userId,
      before: { username: profile?.username ?? null },
      after: { username: normalized },
      note: input.changeReason.trim()
    });

    revalidatePath("/admin/username-policy");
    revalidatePublicProfilePaths(normalized);
    const previous = profile?.username?.trim().toLowerCase();
    if (previous && previous !== normalized) {
      revalidatePublicProfilePaths(previous);
    }
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể đổi username."
    };
  }
}

export async function searchUsernamePolicyRulesAction(input: { query?: string }) {
  await assertStaff();
  const { getAllUsernamePolicyRules } = await import("@/lib/username/get-policy-rules");
  const { rules } = await getAllUsernamePolicyRules(true);
  const q = (input.query ?? "").trim().toLowerCase();
  if (!q) return { rules: rules.slice(0, 50), error: null };
  return {
    rules: rules
      .filter(
        (r) =>
          r.value.toLowerCase().includes(q) ||
          r.normalized_value.toLowerCase().includes(q) ||
          r.id === q
      )
      .slice(0, 50),
    error: null
  };
}
