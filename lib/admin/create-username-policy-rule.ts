"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
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

function defaultMatchType(ruleType: UsernamePolicyRuleType): UsernamePolicyMatchType {
  if (
    ruleType === "reserved_username" ||
    ruleType === "banned_username" ||
    ruleType === "system_reserved" ||
    ruleType === "brand_reserved"
  ) {
    return "exact";
  }
  return "contains";
}

function defaultScope(ruleType: UsernamePolicyRuleType): UsernamePolicyScope {
  if (
    ruleType === "banned_display_name_word" ||
    ruleType === "display_name_protected_word"
  ) {
    return "display_name";
  }
  return "both";
}

function defaultEnforcement(ruleType: UsernamePolicyRuleType): UsernamePolicyEnforcementLevel {
  if (ruleType === "official_only") return "require_review";
  if (ruleType === "protected_word") return "require_review";
  return "block";
}

export async function createUsernamePolicyRuleAction(input: {
  ruleType: UsernamePolicyRuleType;
  value: string;
  matchType?: UsernamePolicyMatchType;
  scope?: UsernamePolicyScope;
  enforcementLevel?: UsernamePolicyEnforcementLevel;
  note?: string | null;
  reason?: string | null;
  priority?: number;
  allowedUserIds?: string[];
  isActive?: boolean;
}) {
  try {
    const actor = await assertStaff();
    const value = input.value.trim();

    if (!value) {
      return { ok: false, error: "Vui lòng nhập giá trị rule." };
    }

    const matchType = input.matchType ?? defaultMatchType(input.ruleType);
    const scope = input.scope ?? defaultScope(input.ruleType);
    const enforcementLevel =
      input.enforcementLevel ?? defaultEnforcement(input.ruleType);
    const normalized_value = resolveNormalizedValue(input.ruleType, value, matchType);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("username_policy_rules")
      .insert({
        rule_type: input.ruleType,
        value,
        normalized_value,
        match_type: matchType,
        scope,
        enforcement_level: enforcementLevel,
        note: input.note?.trim() || null,
        reason: input.reason?.trim() || null,
        priority: input.priority ?? 0,
        allowed_user_ids: input.allowedUserIds ?? [],
        created_by: actor.userId,
        is_active: input.isActive ?? true
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await createAdminAuditLog({
      action: "username_policy_create",
      targetType: "username_policy_rule",
      targetId: String(data.id),
      after: data as Record<string, unknown>
    });

    revalidatePath("/admin/username-policy");
    revalidatePath("/admin/audit");
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể tạo rule."
    };
  }
}
