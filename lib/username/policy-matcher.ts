import type {
  UsernamePolicyExceptionRow,
  UsernamePolicyRuleRow,
  UsernamePolicyScope
} from "@/types/username-policy";

export function isUserAllowedForRule(
  rule: UsernamePolicyRuleRow,
  userId?: string | null,
  field?: "username" | "display_name",
  exceptionsByRuleId?: Map<string, UsernamePolicyExceptionRow[]>
) {
  if (!userId) {
    return false;
  }

  const allowed = rule.allowed_user_ids ?? [];
  if (allowed.includes(userId)) {
    return true;
  }

  if (!field || !exceptionsByRuleId) {
    return false;
  }

  const exceptions = exceptionsByRuleId.get(rule.id) ?? [];
  return exceptions.some(
    (ex) =>
      ex.user_id === userId &&
      (ex.exception_scope === "both" || ex.exception_scope === field)
  );
}

function ruleAppliesToScope(ruleScope: UsernamePolicyScope, field: "username" | "display_name") {
  return ruleScope === "both" || ruleScope === field;
}

export function ruleMatchesValue(
  rule: UsernamePolicyRuleRow,
  normalizedInput: string,
  rawInput: string
) {
  const target = rule.normalized_value;

  switch (rule.match_type) {
    case "exact":
      return normalizedInput === target;
    case "contains":
      return normalizedInput.includes(target);
    case "starts_with":
      return normalizedInput.startsWith(target);
    case "ends_with":
      return normalizedInput.endsWith(target);
    case "regex":
      try {
        return new RegExp(rule.value, "i").test(rawInput);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export function findPolicyViolation(
  rules: UsernamePolicyRuleRow[],
  input: {
    normalized: string;
    raw: string;
    field: "username" | "display_name";
    userId?: string | null;
    exceptionsByRuleId?: Map<string, UsernamePolicyExceptionRow[]>;
  }
) {
  for (const rule of rules) {
    if (!rule.is_active || rule.archived_at) {
      continue;
    }

    if (!ruleAppliesToScope(rule.scope, input.field)) {
      continue;
    }

    if (!ruleMatchesValue(rule, input.normalized, input.raw)) {
      continue;
    }

    if (isUserAllowedForRule(rule, input.userId, input.field, input.exceptionsByRuleId)) {
      continue;
    }

    return rule;
  }

  return null;
}
