"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { createUsernamePolicyRuleAction } from "@/lib/admin/create-username-policy-rule";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { normalizePolicyText } from "@/lib/username/normalize-policy-text";
import { normalizeUsername, validateUsernameFormat } from "@/lib/username/normalize-username";
import type {
  UsernamePolicyEnforcementLevel,
  UsernamePolicyImportPreview,
  UsernamePolicyMatchType,
  UsernamePolicyRuleType,
  UsernamePolicyScope
} from "@/types/username-policy";

async function assertStaff() {
  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) throw new Error("Bạn cần đăng nhập.");
  if (!ctx.permissions.includes("admin.user.update")) {
    throw new Error("Bạn không có quyền import rule.");
  }
  return ctx;
}

function parseLine(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return { value: "", note: null as string | null };
  const comma = trimmed.indexOf(",");
  if (comma === -1) return { value: trimmed, note: null };
  return {
    value: trimmed.slice(0, comma).trim(),
    note: trimmed.slice(comma + 1).trim() || null
  };
}

export async function previewUsernameRulesImportAction(input: {
  lines: string;
  ruleType: UsernamePolicyRuleType;
}): Promise<{ ok: boolean; preview: UsernamePolicyImportPreview | null; error: string | null }> {
  try {
    await assertStaff();
    const seen = new Set<string>();
    const rows = input.lines.split(/\r?\n/);

    const lines = rows.map((raw, index) => {
      const { value } = parseLine(raw);
      if (!value) {
        return {
          line: index + 1,
          value: "",
          normalized: "",
          valid: false,
          error: "Dòng trống",
          duplicate: false
        };
      }

      let normalized = normalizePolicyText(value);
      if (
        input.ruleType === "reserved_username" ||
        input.ruleType === "banned_username" ||
        input.ruleType === "system_reserved"
      ) {
        const asUsername = normalizeUsername(value);
        const format = validateUsernameFormat(value);
        if (format.error && !asUsername) {
          return {
            line: index + 1,
            value,
            normalized,
            valid: false,
            error: format.error,
            duplicate: false
          };
        }
        normalized = normalizePolicyText(asUsername || value);
      }

      const duplicate = seen.has(normalized);
      if (!duplicate) seen.add(normalized);

      return {
        line: index + 1,
        value,
        normalized,
        valid: !duplicate && normalized.length > 0,
        error: duplicate ? "Trùng trong danh sách" : null,
        duplicate
      };
    });

    const validCount = lines.filter((l) => l.valid).length;
    const duplicateCount = lines.filter((l) => l.duplicate).length;
    const errorCount = lines.filter((l) => !l.valid && l.value).length;

    return {
      ok: true,
      error: null,
      preview: { lines, validCount, duplicateCount, errorCount }
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể xem trước.",
      preview: null
    };
  }
}

export async function importUsernameRulesAction(input: {
  lines: string;
  ruleType: UsernamePolicyRuleType;
  matchType: UsernamePolicyMatchType;
  scope: UsernamePolicyScope;
  enforcementLevel: UsernamePolicyEnforcementLevel;
  note?: string | null;
}) {
  try {
    await assertStaff();
    const preview = await previewUsernameRulesImportAction({
      lines: input.lines,
      ruleType: input.ruleType
    });

    if (!preview.preview || preview.preview.validCount === 0) {
      return { ok: false, error: "Không có dòng hợp lệ để import.", imported: 0 };
    }

    let imported = 0;
    let lastError: string | null = null;

    for (const row of preview.preview.lines) {
      if (!row.valid) continue;
      const { note: lineNote } = parseLine(
        input.lines.split(/\r?\n/)[row.line - 1] ?? row.value
      );
      const result = await createUsernamePolicyRuleAction({
        ruleType: input.ruleType,
        value: row.value,
        matchType: input.matchType,
        scope: input.scope,
        enforcementLevel: input.enforcementLevel,
        note: lineNote ?? input.note ?? `Import: ${row.value}`
      });
      if (result.ok) imported += 1;
      else lastError = result.error;
    }

    if (imported > 0) {
      await createAdminAuditLog({
        action: "username_policy_imported",
        targetType: "username_policy_rule",
        targetId: null,
        metadata: { imported, ruleType: input.ruleType },
        note: input.note ?? null
      });
      revalidatePath("/admin/username-policy");
      revalidatePath("/admin/audit");
    }

    return {
      ok: imported > 0,
      error: imported === 0 ? (lastError ?? "Không import được.") : null,
      imported
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể import.",
      imported: 0
    };
  }
}

// Keep backward compat alias
export async function bulkImportReservedUsernamesAction(input: {
  lines: string;
  note?: string | null;
}) {
  return importUsernameRulesAction({
    lines: input.lines,
    ruleType: "reserved_username",
    matchType: "exact",
    scope: "username",
    enforcementLevel: "block",
    note: input.note
  });
}
