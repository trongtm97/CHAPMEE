"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { invalidateKeywordRulesCache } from "@/lib/messaging/get-keyword-rules";
import { restrictionEndsAt } from "@/lib/messaging/labels";
import { requirePermission } from "@/lib/auth/require-permission";
import { notifyMessageRestriction } from "@/lib/notifications/create-message-notification";
import { createClient } from "@/lib/supabase/server";
import type {
  KeywordRuleAction,
  KeywordRuleCategory,
  MessagingRestrictionType,
  MessagingRestrictReasonCode
} from "@/types/messaging-safety";
import type { MessageSafetySettings } from "@/types/messaging-safety";

function revalidate() {
  revalidatePath("/admin/messaging");
}

export async function createMessagingRestrictionAction(input: {
  moderatorId: string;
  userId: string;
  restrictionType: MessagingRestrictionType;
  reasonCode: MessagingRestrictReasonCode;
  note?: string | null;
  notifyUser?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const guard = await requirePermission("moderation.action.create");
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const supabase = await createClient();
  const endsAt = restrictionEndsAt(input.restrictionType);

  const { data, error } = await supabase
    .from("messaging_restrictions")
    .insert({
      user_id: input.userId,
      restriction_type: input.restrictionType,
      reason_code: input.reasonCode,
      note: input.note ?? null,
      ends_at: endsAt?.toISOString() ?? null,
      is_active: true,
      created_by: input.moderatorId
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: "Không áp dụng được hạn chế." };
  }

  if (input.notifyUser) {
    await notifyMessageRestriction(
      input.userId,
      endsAt?.toISOString() ?? null
    );
  }

  await logAdminAction({
    actorId: input.moderatorId,
    action: "messaging_user_restricted",
    targetType: "profile",
    targetId: input.userId,
    metadata: {
      restrictionId: data?.id,
      restrictionType: input.restrictionType,
      reasonCode: input.reasonCode,
      note: input.note ?? null
    }
  });

  revalidate();
  return { ok: true };
}

export async function revokeMessagingRestrictionAction(input: {
  moderatorId: string;
  restrictionId: string;
  reason?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const guard = await requirePermission("moderation.action.create");
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const supabase = await createClient();

  const { data: row } = await supabase
    .from("messaging_restrictions")
    .select("user_id")
    .eq("id", input.restrictionId)
    .maybeSingle();

  const { error } = await supabase
    .from("messaging_restrictions")
    .update({
      is_active: false,
      revoked_by: input.moderatorId,
      revoked_at: new Date().toISOString(),
      revoke_reason: input.reason ?? "Admin gỡ hạn chế"
    })
    .eq("id", input.restrictionId);

  if (error) {
    return { ok: false, error: "Không gỡ được hạn chế." };
  }

  await logAdminAction({
    actorId: input.moderatorId,
    action: "messaging_restriction_revoked",
    targetType: "profile",
    targetId: row?.user_id as string,
    metadata: {
      restrictionId: input.restrictionId,
      reason: input.reason ?? null
    }
  });

  revalidate();
  return { ok: true };
}

export async function updateMessageReportStatusAction(input: {
  moderatorId: string;
  reportId: string;
  status: "reviewing" | "resolved" | "dismissed" | "rejected";
  resolution?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const guard = await requirePermission("moderation.action.create");
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const supabase = await createClient();
  const auditAction =
    input.status === "dismissed" || input.status === "rejected"
      ? "messaging_report_rejected"
      : "messaging_report_resolved";

  const { error } = await supabase
    .from("message_reports")
    .update({
      status: input.status === "rejected" ? "dismissed" : input.status,
      resolution: input.resolution ?? null,
      resolved_by: input.moderatorId,
      resolved_at: new Date().toISOString(),
      reviewed_by: input.moderatorId,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", input.reportId);

  if (error) {
    return { ok: false, error: "Không cập nhật được báo cáo." };
  }

  await logAdminAction({
    actorId: input.moderatorId,
    action: auditAction,
    targetType: "message_report",
    targetId: input.reportId,
    metadata: { status: input.status, resolution: input.resolution ?? null }
  });

  revalidate();
  return { ok: true };
}

export async function logMessagingCaseViewedAction(input: {
  moderatorId: string;
  reportId: string;
}): Promise<void> {
  await logAdminAction({
    actorId: input.moderatorId,
    action: "messaging_case_viewed",
    targetType: "message_report",
    targetId: input.reportId,
    metadata: {}
  });
}

export async function updateMessageSafetySettingsAction(input: {
  moderatorId: string;
  settingsId: string;
  patch: Partial<MessageSafetySettings>;
}): Promise<{ ok: boolean; error?: string }> {
  const guard = await requirePermission("moderation.action.create");
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("message_safety_settings")
    .update({
      enabled: input.patch.enabled,
      default_dm_policy: input.patch.defaultDmPolicy,
      new_account_days: input.patch.newAccountDays,
      unverified_daily_message_limit: input.patch.unverifiedDailyMessageLimit,
      verified_daily_message_limit: input.patch.verifiedDailyMessageLimit,
      trusted_daily_message_limit: input.patch.trustedDailyMessageLimit,
      max_messages_per_minute: input.patch.maxMessagesPerMinute,
      max_messages_per_day: input.patch.maxMessagesPerDay,
      max_new_recipients_per_day: input.patch.maxNewRecipientsPerDay,
      duplicate_message_limit_per_day: input.patch.duplicateMessageLimitPerDay,
      duplicate_cooldown_seconds: input.patch.duplicateCooldownSeconds,
      block_external_links_for_new_users:
        input.patch.blockExternalLinksForNewUsers,
      block_external_links_for_unverified:
        input.patch.blockExternalLinksForUnverified,
      allow_internal_links: input.patch.allowInternalLinks,
      author_protection_enabled: input.patch.authorProtectionEnabled,
      author_dm_new_user_limit: input.patch.authorDmNewUserLimit,
      auto_restrict_report_threshold: input.patch.autoRestrictReportThreshold,
      updated_at: new Date().toISOString()
    })
    .eq("id", input.settingsId);

  if (error) {
    return { ok: false, error: "Không lưu được cấu hình." };
  }

  await logAdminAction({
    actorId: input.moderatorId,
    action: "messaging_safety_settings_updated",
    targetType: "message_safety_settings",
    targetId: input.settingsId,
    metadata: { patch: input.patch }
  });

  revalidate();
  return { ok: true };
}

export async function upsertKeywordRuleAction(input: {
  moderatorId: string;
  keyword: string;
  action: KeywordRuleAction;
  severity: string;
  category?: KeywordRuleCategory | null;
  ruleId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const guard = await requirePermission("moderation.action.create");
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const supabase = await createClient();
  const payload = {
    keyword: input.keyword.trim().toLowerCase(),
    action: input.action,
    severity: input.severity,
    category: input.category ?? null,
    updated_at: new Date().toISOString()
  };

  if (!payload.keyword) {
    return { ok: false, error: "Từ khóa không được để trống." };
  }

  if (input.ruleId) {
    const { error } = await supabase
      .from("message_safety_keyword_rules")
      .update(payload)
      .eq("id", input.ruleId);

    if (error) {
      return { ok: false, error: "Không cập nhật được quy tắc." };
    }

    await logAdminAction({
      actorId: input.moderatorId,
      action: "messaging_keyword_rule_updated",
      targetType: "message_safety_keyword_rule",
      targetId: input.ruleId,
      metadata: payload
    });
  } else {
    const { data, error } = await supabase
      .from("message_safety_keyword_rules")
      .insert({ ...payload, created_by: input.moderatorId })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: "Không tạo được quy tắc." };
    }

    await logAdminAction({
      actorId: input.moderatorId,
      action: "messaging_keyword_rule_created",
      targetType: "message_safety_keyword_rule",
      targetId: data?.id,
      metadata: payload
    });
  }

  invalidateKeywordRulesCache();
  revalidate();
  return { ok: true };
}

export async function getKeywordRulesForAdmin() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("message_safety_keyword_rules")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    keyword: row.keyword as string,
    action: row.action as KeywordRuleAction,
    severity: row.severity as string,
    category: row.category as KeywordRuleCategory | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string
  }));
}
