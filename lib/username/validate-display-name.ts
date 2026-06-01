import { loadUsernamePolicyContext } from "@/lib/username/load-policy-context";
import { findPolicyViolation } from "@/lib/username/policy-matcher";
import { normalizeDisplayNamePolicyText } from "@/lib/username/normalize-policy-text";
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH
} from "@/lib/username/display-name-limits";
import type { UsernamePolicyValidationResult } from "@/types/username-policy";

export { DISPLAY_NAME_MIN_LENGTH, DISPLAY_NAME_MAX_LENGTH } from "@/lib/username/display-name-limits";

const URL_PATTERN = /(?:https?:\/\/|www\.)/i;
const JUNK_ONLY_PATTERN = /^[\W\d_]+$/u;

function fail(
  error_code: UsernamePolicyValidationResult["error_code"],
  message: string
): UsernamePolicyValidationResult {
  return { valid: false, error_code, message, normalized: null };
}

function ok(normalized: string): UsernamePolicyValidationResult {
  return { valid: true, error_code: null, message: null, normalized };
}

export async function validateDisplayName(
  rawDisplayName: string,
  userId?: string | null
): Promise<UsernamePolicyValidationResult> {
  const trimmed = rawDisplayName.trim();

  if (!trimmed) {
    return fail("required", "Vui lòng nhập tên hiển thị.");
  }

  if (trimmed.length < DISPLAY_NAME_MIN_LENGTH) {
    return fail("format", "Tên hiển thị cần ít nhất 2 ký tự.");
  }

  if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
    return fail("format", "Tên hiển thị quá dài (tối đa 50 ký tự).");
  }

  if (URL_PATTERN.test(trimmed)) {
    return fail("url_not_allowed", "Tên hiển thị không được chứa liên kết URL.");
  }

  if (JUNK_ONLY_PATTERN.test(trimmed)) {
    return fail("junk_name", "Tên hiển thị không hợp lệ.");
  }

  const normalized = normalizeDisplayNamePolicyText(trimmed);
  const { rules, exceptionsByRuleId } = await loadUsernamePolicyContext();

  const hit = findPolicyViolation(rules, {
    normalized,
    raw: trimmed,
    field: "display_name",
    userId,
    exceptionsByRuleId
  });

  if (hit) {
    if (hit.enforcement_level === "warn_only") {
      return ok(trimmed);
    }
    if (hit.enforcement_level === "require_review") {
      return fail(
        "requires_review",
        "Tên hiển thị này cần ChapMee xét duyệt trước khi sử dụng."
      );
    }
    return fail("banned", "Tên hiển thị không được phép sử dụng.");
  }

  return ok(trimmed);
}
