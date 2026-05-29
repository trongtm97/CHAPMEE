import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  UsernamePolicyEnforcementLevel,
  UsernamePolicyRuleRow
} from "@/types/username-policy";

function mapRule(row: Record<string, unknown>): UsernamePolicyRuleRow {
  return {
    id: String(row.id),
    rule_type: row.rule_type as UsernamePolicyRuleRow["rule_type"],
    value: String(row.value),
    normalized_value: String(row.normalized_value),
    match_type: row.match_type as UsernamePolicyRuleRow["match_type"],
    scope: row.scope as UsernamePolicyRuleRow["scope"],
    enforcement_level:
      (row.enforcement_level as UsernamePolicyEnforcementLevel | undefined) ?? "block",
    is_active: Boolean(row.is_active),
    allowed_user_ids: (row.allowed_user_ids as string[] | null) ?? [],
    note: (row.note as string | null) ?? null,
    reason: (row.reason as string | null) ?? null,
    priority: Number(row.priority ?? 0),
    archived_at: (row.archived_at as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function sortRules(rules: UsernamePolicyRuleRow[]) {
  return [...rules].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export const getActiveUsernamePolicyRules = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("username_policy_rules")
    .select("*")
    .eq("is_active", true);

  if (error) {
    return { rules: [] as UsernamePolicyRuleRow[], error: error.message };
  }

  const rules = sortRules(
    (data ?? [])
      .map((row) => mapRule(row as Record<string, unknown>))
      .filter((rule) => !rule.archived_at)
  );

  return { rules, error: null as string | null };
});

export async function getAllUsernamePolicyRules(includeInactive = true) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("username_policy_rules").select("*");

  if (error) {
    return { rules: [] as UsernamePolicyRuleRow[], error: error.message };
  }

  let rules = (data ?? [])
    .map((row) => mapRule(row as Record<string, unknown>))
    .filter((rule) => !rule.archived_at);

  if (!includeInactive) {
    rules = rules.filter((rule) => rule.is_active);
  }

  return { rules: sortRules(rules), error: null };
}
