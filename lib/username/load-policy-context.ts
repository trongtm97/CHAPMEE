import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveUsernamePolicyRules } from "@/lib/username/get-policy-rules";
import type {
  UsernamePolicyExceptionRow,
  UsernamePolicyRuleRow,
  UsernamePolicyScope
} from "@/types/username-policy";

export type UsernamePolicyContext = {
  rules: UsernamePolicyRuleRow[];
  exceptionsByRuleId: Map<string, UsernamePolicyExceptionRow[]>;
  error: string | null;
};

export async function loadActivePolicyExceptions() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("username_policy_exceptions")
    .select("*")
    .is("revoked_at", null);

  if (error) {
    if (error.message.includes("username_policy_exceptions")) {
      return { exceptions: [] as UsernamePolicyExceptionRow[], error: null };
    }
    return { exceptions: [] as UsernamePolicyExceptionRow[], error: error.message };
  }

  const exceptions = (data ?? [])
    .filter((row) => !row.expires_at || String(row.expires_at) > now)
    .map((row) => ({
      id: String(row.id),
      rule_id: String(row.rule_id),
      user_id: String(row.user_id),
      exception_scope: row.exception_scope as UsernamePolicyScope,
      expires_at: (row.expires_at as string | null) ?? null,
      reason: (row.reason as string | null) ?? null,
      public_note: (row.public_note as string | null) ?? null,
      created_by: (row.created_by as string | null) ?? null,
      revoked_at: (row.revoked_at as string | null) ?? null,
      created_at: String(row.created_at)
    }));

  const exceptionsByRuleId = new Map<string, UsernamePolicyExceptionRow[]>();
  for (const ex of exceptions) {
    const list = exceptionsByRuleId.get(ex.rule_id) ?? [];
    list.push(ex);
    exceptionsByRuleId.set(ex.rule_id, list);
  }

  return { exceptions, exceptionsByRuleId, error: null };
}

export const loadUsernamePolicyContext = cache(async (): Promise<UsernamePolicyContext> => {
  const [{ rules, error: rulesError }, exResult] = await Promise.all([
    getActiveUsernamePolicyRules(),
    loadActivePolicyExceptions()
  ]);

  return {
    rules,
    exceptionsByRuleId: exResult.exceptionsByRuleId ?? new Map(),
    error: rulesError ?? exResult.error
  };
});
