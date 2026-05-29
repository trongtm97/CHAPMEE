import {
  BANNED_RULE_TYPES,
  PROTECTED_RULE_TYPES,
  RESERVED_RULE_TYPES
} from "@/lib/admin/username-policy-labels";
import type {
  UsernameChangeHistoryRow,
  UsernamePolicyAdminTab,
  UsernamePolicyConflictItem,
  UsernamePolicyOperationsSummary,
  UsernamePolicyRuleRow,
  UsernamePolicySummaryCardKey
} from "@/types/username-policy";

export function isRuleArchived(rule: UsernamePolicyRuleRow) {
  return Boolean(rule.archived_at);
}

export function filterRulesByTab(rules: UsernamePolicyRuleRow[], tab: UsernamePolicyAdminTab) {
  const active = rules.filter((r) => !isRuleArchived(r));

  switch (tab) {
    case "banned":
      return active.filter((rule) => BANNED_RULE_TYPES.includes(rule.rule_type));
    case "reserved":
      return active.filter((rule) => RESERVED_RULE_TYPES.includes(rule.rule_type));
    case "protected":
      return active.filter((rule) => PROTECTED_RULE_TYPES.includes(rule.rule_type));
    case "exceptions":
      return active.filter((rule) => (rule.allowed_user_ids?.length ?? 0) > 0);
    case "rules":
      return active;
    default:
      return active;
  }
}

export function computeUsernamePolicySummary(input: {
  rules: UsernamePolicyRuleRow[];
  history: UsernameChangeHistoryRow[];
  conflicts: UsernamePolicyConflictItem[];
}): UsernamePolicyOperationsSummary {
  const active = input.rules.filter((r) => r.is_active && !isRuleArchived(r));
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return {
    banned: active.filter((r) => BANNED_RULE_TYPES.includes(r.rule_type)).length,
    reserved: active.filter((r) => RESERVED_RULE_TYPES.includes(r.rule_type)).length,
    protected: active.filter((r) => PROTECTED_RULE_TYPES.includes(r.rule_type)).length,
    exceptions: active.filter((r) => (r.allowed_user_ids?.length ?? 0) > 0).length,
    conflicts: input.conflicts.length,
    changes7d: input.history.filter(
      (row) => new Date(row.created_at).getTime() >= sevenDaysAgo
    ).length,
    inactive: input.rules.filter((r) => !r.is_active && !isRuleArchived(r)).length
  };
}

export function summaryCardToTab(key: UsernamePolicySummaryCardKey): UsernamePolicyAdminTab {
  switch (key) {
    case "banned":
      return "banned";
    case "reserved":
      return "reserved";
    case "protected":
      return "protected";
    case "exceptions":
      return "exceptions";
    case "conflicts":
      return "conflicts";
    case "changes7d":
      return "history";
    case "inactive":
      return "rules";
    default:
      return "overview";
  }
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages
  };
}
