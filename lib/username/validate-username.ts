import { loadUsernamePolicyContext } from "@/lib/username/load-policy-context";
import { findPolicyViolation } from "@/lib/username/policy-matcher";
import {
  normalizeUsername,
  validateUsernameFormat
} from "@/lib/username/normalize-username";
import { normalizePolicyText } from "@/lib/username/normalize-policy-text";
import { createClient } from "@/lib/supabase/server";
import type {
  UsernamePolicyRuleRow,
  UsernamePolicyValidationResult
} from "@/types/username-policy";

function fail(
  error_code: UsernamePolicyValidationResult["error_code"],
  message: string
): UsernamePolicyValidationResult {
  return { valid: false, error_code, message, normalized: null };
}

function ok(normalized: string | null): UsernamePolicyValidationResult {
  return { valid: true, error_code: null, message: null, normalized };
}

const RESERVED_TYPES = new Set<UsernamePolicyRuleRow["rule_type"]>([
  "reserved_username",
  "brand_reserved",
  "system_reserved"
]);

const BANNED_TYPES = new Set<UsernamePolicyRuleRow["rule_type"]>([
  "banned_username",
  "impersonation_risk",
  "system_reserved"
]);

function messageForHit(rule: UsernamePolicyRuleRow) {
  if (RESERVED_TYPES.has(rule.rule_type)) {
    return "Username này hiện không khả dụng.";
  }

  if (rule.enforcement_level === "require_review") {
    return "Username này cần ChapMee xét duyệt trước khi sử dụng.";
  }

  if (rule.enforcement_level === "warn_only") {
    return null;
  }

  if (BANNED_TYPES.has(rule.rule_type) || rule.rule_type === "banned_username") {
    return "Username này không thể sử dụng. Vui lòng chọn username khác.";
  }

  return "Username này không thể sử dụng. Vui lòng chọn username khác.";
}

function codeForHit(rule: UsernamePolicyRuleRow): UsernamePolicyValidationResult["error_code"] {
  if (RESERVED_TYPES.has(rule.rule_type)) {
    return "reserved";
  }
  if (rule.enforcement_level === "require_review") {
    return "requires_review";
  }
  if (rule.enforcement_level === "warn_only") {
    return null;
  }
  if (BANNED_TYPES.has(rule.rule_type)) {
    return "banned";
  }
  return "protected_word";
}

export async function validateUsername(
  rawUsername: string,
  userId?: string | null
): Promise<UsernamePolicyValidationResult> {
  const trimmed = rawUsername.trim();

  if (!trimmed) {
    return ok(null);
  }

  const { normalized, error: formatError } = validateUsernameFormat(trimmed);
  if (formatError || !normalized) {
    return fail("format", formatError ?? "Username không hợp lệ.");
  }

  if (userId) {
    const supabase = await createClient();
    const { data: profile, error: lockError } = await supabase
      .from("profiles")
      .select("username_change_locked")
      .eq("id", userId)
      .maybeSingle();

    if (
      !lockError &&
      profile &&
      "username_change_locked" in profile &&
      profile.username_change_locked
    ) {
      return fail(
        "banned",
        "Username của bạn đang bị khóa thay đổi. Vui lòng liên hệ ChapMee."
      );
    }
  }

  const { rules, exceptionsByRuleId } = await loadUsernamePolicyContext();
  const normalizedForPolicy = normalizePolicyText(normalized);

  const hit = findPolicyViolation(rules, {
    normalized: normalizedForPolicy,
    raw: normalized,
    field: "username",
    userId,
    exceptionsByRuleId
  });

  if (hit) {
    const code = codeForHit(hit);
    const message = messageForHit(hit);
    if (code === null || hit.enforcement_level === "warn_only") {
      return ok(normalized);
    }
    return fail(code, message ?? "Username không hợp lệ.");
  }

  const supabase = await createClient();
  let uniquenessQuery = supabase
    .from("profiles")
    .select("id")
    .eq("username", normalized)
    .limit(1);

  if (userId) {
    uniquenessQuery = uniquenessQuery.neq("id", userId);
  }

  const { data: existing } = await uniquenessQuery.maybeSingle();

  if (existing) {
    return fail("taken", "Username này đã được sử dụng.");
  }

  return ok(normalized);
}

export { normalizeUsername };
