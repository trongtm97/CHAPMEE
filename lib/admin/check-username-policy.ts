"use server";

import { assertPermission } from "@/lib/auth/require-permission";
import { loadUsernamePolicyContext } from "@/lib/username/load-policy-context";
import { findPolicyViolation } from "@/lib/username/policy-matcher";
import { validateUsernameFormat } from "@/lib/username/normalize-username";
import { normalizePolicyText } from "@/lib/username/normalize-policy-text";
import { normalizeDisplayNamePolicyText } from "@/lib/username/normalize-policy-text";
import { validateDisplayName } from "@/lib/username/validate-display-name";
import { validateUsername } from "@/lib/username/validate-username";
import { createClient } from "@/lib/supabase/server";
import type { UsernamePolicyCheckResult } from "@/types/username-policy";

function buildSuggestions(base: string) {
  const normalized = normalizePolicyText(base);
  if (!normalized) return [];
  const suffixes = ["_", "01", "vn", "me"];
  return suffixes.map((s) => `${normalized}${s}`).slice(0, 4);
}

export async function checkUsernamePolicyAction(input: {
  username?: string;
  displayName?: string;
  userId?: string | null;
}): Promise<{ ok: boolean; result: UsernamePolicyCheckResult | null; error: string | null }> {
  try {
    await assertPermission("admin.user.view");

    const { rules, exceptionsByRuleId } = await loadUsernamePolicyContext();
    const hits: UsernamePolicyCheckResult["hits"] = [];
    const userId = input.userId ?? null;

    let usernameResult = {
      valid: true,
      message: null as string | null,
      normalized: null as string | null,
      isTaken: false
    };

    if (input.username?.trim()) {
      const validation = await validateUsername(input.username, userId);
      const format = validateUsernameFormat(input.username);
      const normalized = validation.normalized ?? format.normalized;
      usernameResult = {
        valid: validation.valid,
        message: validation.message,
        normalized,
        isTaken: validation.error_code === "taken"
      };

      if (normalized) {
        const normalizedPolicy = normalizePolicyText(normalized);
        const hit = findPolicyViolation(rules, {
          normalized: normalizedPolicy,
          raw: normalized,
          field: "username",
          userId,
          exceptionsByRuleId
        });
        if (hit) {
          hits.push({
            ruleId: hit.id,
            ruleType: hit.rule_type,
            ruleValue: hit.value,
            matchType: hit.match_type,
            scope: hit.scope,
            enforcementLevel: hit.enforcement_level,
            field: "username",
            hasException: Boolean(userId && hit.allowed_user_ids?.includes(userId))
          });
        }
      }
    }

    let displayNameResult = { valid: true, message: null as string | null };
    if (input.displayName?.trim()) {
      const validation = await validateDisplayName(input.displayName, userId);
      displayNameResult = {
        valid: validation.valid,
        message: validation.message
      };

      const normalized = normalizeDisplayNamePolicyText(input.displayName);
      const hit = findPolicyViolation(rules, {
        normalized,
        raw: input.displayName.trim(),
        field: "display_name",
        userId,
        exceptionsByRuleId
      });
      if (hit) {
        hits.push({
          ruleId: hit.id,
          ruleType: hit.rule_type,
          ruleValue: hit.value,
          matchType: hit.match_type,
          scope: hit.scope,
          enforcementLevel: hit.enforcement_level,
          field: "display_name",
          hasException: Boolean(userId && hit.allowed_user_ids?.includes(userId))
        });
      }
    }

    const needsReview = hits.some(
      (h) => h.enforcementLevel === "require_review" && !h.hasException
    );

    const suggestions = input.username?.trim()
      ? buildSuggestions(input.username)
      : [];

    if (input.username?.trim() && usernameResult.normalized) {
      const supabase = await createClient();
      let q = supabase
        .from("profiles")
        .select("id")
        .eq("username", usernameResult.normalized)
        .limit(1);
      if (userId) q = q.neq("id", userId);
      const { data } = await q.maybeSingle();
      if (data) usernameResult.isTaken = true;
    }

    return {
      ok: true,
      error: null,
      result: {
        username: usernameResult,
        displayName: displayNameResult,
        hits,
        needsReview,
        suggestions
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể kiểm tra.",
      result: null
    };
  }
}
