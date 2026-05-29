"use server";

import { assertPermission } from "@/lib/auth/require-permission";
import { computeUsernamePolicySummary } from "@/lib/admin/username-policy-helpers";
import { buildUsernamePolicyCapabilities } from "@/lib/admin/username-policy-capabilities";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { getUsernamePolicyExceptions } from "@/lib/admin/username-policy-exceptions";
import { getAllUsernamePolicyRules } from "@/lib/username/get-policy-rules";
import { loadActivePolicyExceptions } from "@/lib/username/load-policy-context";
import { findPolicyViolation } from "@/lib/username/policy-matcher";
import { normalizeDisplayNamePolicyText } from "@/lib/username/normalize-policy-text";
import { normalizePolicyText } from "@/lib/username/normalize-policy-text";
import type {
  UsernameChangeHistoryRow,
  UsernamePolicyAuditLogRow,
  UsernamePolicyConflictItem,
  UsernamePolicyExceptionRow,
  UsernamePolicyOperationsSummary
} from "@/types/username-policy";

const AUDIT_ACTION_PREFIXES = [
  "username_policy",
  "username_manual",
  "username_conflict",
  "username_change"
];

export async function getUsernamePolicyAdminData() {
  const ctx = await getCurrentAuthContext();
  if (!ctx) {
    return {
      rules: [],
      rulesError: "Chưa đăng nhập.",
      history: [],
      historyError: null,
      conflicts: [],
      summary: null as UsernamePolicyOperationsSummary | null,
      auditLogs: [] as UsernamePolicyAuditLogRow[],
      auditError: null,
      exceptions: [] as UsernamePolicyExceptionRow[],
      exceptionsError: null,
      capabilities: buildUsernamePolicyCapabilities({ permissions: [] })
    };
  }

  await assertPermission("admin.user.update");

  const [rulesResult, historyResult, conflicts, auditResult, exceptionsResult] =
    await Promise.all([
      getAllUsernamePolicyRules(true),
      getUsernameChangeHistory(100),
      scanExistingUsernameConflicts(),
      getUsernamePolicyAuditLogs(60),
      getUsernamePolicyExceptions(200)
    ]);

  const summary = computeUsernamePolicySummary({
    rules: rulesResult.rules,
    history: historyResult.items,
    conflicts
  });

  return {
    rules: rulesResult.rules,
    rulesError: rulesResult.error,
    history: historyResult.items,
    historyError: historyResult.error,
    conflicts,
    summary,
    auditLogs: auditResult.items,
    auditError: auditResult.error,
    exceptions: exceptionsResult.items,
    exceptionsError: exceptionsResult.error,
    capabilities: buildUsernamePolicyCapabilities({ permissions: ctx.permissions })
  };
}

export async function getUsernameChangeHistory(limit = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("username_change_history")
    .select("id, user_id, old_username, new_username, changed_by, change_reason, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { items: [] as UsernameChangeHistoryRow[], error: error.message };
  }

  const rows = (data ?? []) as UsernameChangeHistoryRow[];
  const profileIds = [
    ...new Set(
      rows.flatMap((r) => [r.user_id, r.changed_by].filter(Boolean) as string[])
    )
  ];

  const profileMap = new Map<string, { username: string | null; display_name: string | null }>();
  if (profileIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", profileIds);
    for (const p of profiles ?? []) {
      profileMap.set(String(p.id), {
        username: (p.username as string | null) ?? null,
        display_name: (p.display_name as string | null) ?? null
      });
    }
  }

  return {
    items: rows.map((row) => ({
      ...row,
      profiles: profileMap.get(row.user_id) ?? null,
      changer: row.changed_by ? (profileMap.get(row.changed_by) ?? null) : null
    })),
    error: null
  };
}

export async function getUsernamePolicyAuditLogs(limit = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("id, action, target_type, target_id, metadata, created_at, actor_id")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return { items: [] as UsernamePolicyAuditLogRow[], error: error.message };
  }

  const filtered = (data ?? []).filter((row) =>
    AUDIT_ACTION_PREFIXES.some((prefix) => String(row.action).startsWith(prefix))
  );

  const actorIds = [...new Set(filtered.map((r) => r.actor_id).filter(Boolean))] as string[];
  const actorMap = new Map<string, { username: string | null; display_name: string | null }>();
  if (actorIds.length) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", actorIds);
    for (const a of actors ?? []) {
      actorMap.set(String(a.id), {
        username: (a.username as string | null) ?? null,
        display_name: (a.display_name as string | null) ?? null
      });
    }
  }

  return {
    items: filtered.slice(0, limit).map((row) => ({
      id: String(row.id),
      action: String(row.action),
      target_type: (row.target_type as string | null) ?? null,
      target_id: (row.target_id as string | null) ?? null,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      created_at: String(row.created_at),
      actor: row.actor_id ? (actorMap.get(String(row.actor_id)) ?? null) : null
    })),
    error: null
  };
}

export async function scanExistingUsernameConflicts(): Promise<UsernamePolicyConflictItem[]> {
  const [{ rules }, exResult] = await Promise.all([
    getAllUsernamePolicyRules(false),
    loadActivePolicyExceptions()
  ]);
  const exceptionsByRuleId = exResult.exceptionsByRuleId ?? new Map();
  if (rules.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .limit(2000);

  const conflicts: UsernamePolicyConflictItem[] = [];

  for (const profile of profiles ?? []) {
    const userId = String(profile.id);

    if (profile.username) {
      const normalized = normalizePolicyText(String(profile.username));
      const hit = findPolicyViolation(rules, {
        normalized,
        raw: String(profile.username),
        field: "username",
        userId,
        exceptionsByRuleId
      });

      if (hit) {
        const hasException = Boolean(
          hit.allowed_user_ids?.includes(userId) ||
            exceptionsByRuleId
              .get(hit.id)
              ?.some((ex: UsernamePolicyExceptionRow) => ex.user_id === userId)
        );
        conflicts.push({
          userId,
          username: profile.username as string,
          displayName: (profile.display_name as string) ?? null,
          ruleId: hit.id,
          ruleType: hit.rule_type,
          ruleValue: hit.value,
          enforcementLevel: hit.enforcement_level,
          field: "username",
          hasException
        });
      }
    }

    if (profile.display_name) {
      const normalized = normalizeDisplayNamePolicyText(String(profile.display_name));
      const hit = findPolicyViolation(rules, {
        normalized,
        raw: String(profile.display_name),
        field: "display_name",
        userId,
        exceptionsByRuleId
      });

      if (hit) {
        const hasException = Boolean(
          hit.allowed_user_ids?.includes(userId) ||
            exceptionsByRuleId
              .get(hit.id)
              ?.some((ex: UsernamePolicyExceptionRow) => ex.user_id === userId)
        );
        conflicts.push({
          userId,
          username: (profile.username as string) ?? null,
          displayName: profile.display_name as string,
          ruleId: hit.id,
          ruleType: hit.rule_type,
          ruleValue: hit.value,
          enforcementLevel: hit.enforcement_level,
          field: "display_name",
          hasException
        });
      }
    }
  }

  return conflicts;
}
