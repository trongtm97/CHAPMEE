"use server";

import { revalidatePath } from "next/cache";
import { assertStaffAnyPermission } from "@/lib/auth/staff-guards";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { createClient } from "@/lib/supabase/server";
import type { ModerationKeywordRule } from "@/types/community-auto-moderation";

export async function upsertKeywordRuleAction(
  rule: Omit<ModerationKeywordRule, "createdAt"> & { id?: string }
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { userId } = await assertStaffAnyPermission(["admin.settings.update"]);
    const supabase = await createClient();

    const row = {
      keyword: rule.keyword.trim(),
      match_type: rule.matchType,
      action: rule.action,
      category: rule.category,
      severity: rule.severity,
      is_active: rule.isActive,
      updated_at: new Date().toISOString()
    };

    const { error } = rule.id
      ? await supabase.from("moderation_keyword_rules").update(row).eq("id", rule.id)
      : await supabase
          .from("moderation_keyword_rules")
          .insert({ ...row, created_by: userId });

    if (error) return { ok: false, error: error.message };

    await logAdminAction({
      actorId: userId,
      action: "community_spam_rule_updated",
      targetType: "moderation_keyword_rule",
      targetId: rule.id ?? rule.keyword,
      metadata: { action: rule.action, keyword: rule.keyword }
    });

    revalidatePath("/admin/community/auto-moderation");
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không lưu được từ khóa."
    };
  }
}

export async function deleteKeywordRuleAction(
  id: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { userId } = await assertStaffAnyPermission(["admin.settings.update"]);
    const supabase = await createClient();
    const { error } = await supabase
      .from("moderation_keyword_rules")
      .delete()
      .eq("id", id);

    if (error) return { ok: false, error: error.message };

    await logAdminAction({
      actorId: userId,
      action: "community_spam_rule_updated",
      targetType: "moderation_keyword_rule",
      targetId: id,
      metadata: { deleted: true }
    });

    revalidatePath("/admin/community/auto-moderation");
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không xóa được từ khóa."
    };
  }
}
