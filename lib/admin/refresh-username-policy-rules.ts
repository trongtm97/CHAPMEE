"use server";

import { assertPermission } from "@/lib/auth/require-permission";
import { computeUsernamePolicySummary } from "@/lib/admin/username-policy-helpers";
import {
  getUsernameChangeHistory,
  getUsernamePolicyAuditLogs,
  scanExistingUsernameConflicts
} from "@/lib/admin/get-username-policy-admin-data";
import { getUsernamePolicyExceptions } from "@/lib/admin/username-policy-exceptions";
import { getAllUsernamePolicyRules } from "@/lib/username/get-policy-rules";

export async function refreshUsernamePolicyRulesAction() {
  await assertPermission("admin.user.update");
  const { rules, error } = await getAllUsernamePolicyRules(true);
  return { rules, error };
}

export async function refreshUsernamePolicyAdminDataAction() {
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
    conflicts,
    summary,
    auditLogs: auditResult.items,
    exceptions: exceptionsResult.items
  };
}
