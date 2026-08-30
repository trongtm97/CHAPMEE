"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { requirePermission } from "@/lib/auth/require-permission";
import { notifyMessageReportResolved } from "@/lib/notifications/create-message-notification";
import { notifyMessageRestriction } from "@/lib/notifications/create-message-notification";
import { createClient } from "@/lib/data/server";
import type { RestrictionType } from "@/types/moderation";

export type MessageModerationAction =
  | "no_violation"
  | "warn_user"
  | "delete_message"
  | "restrict_24h"
  | "restrict_7d"
  | "restrict_30d"
  | "suspend"
  | "ban"
  | "reporter_abuse";

function restrictionForAction(
  action: MessageModerationAction
): { type: RestrictionType; hours: number | null } | null {
  switch (action) {
    case "restrict_24h":
      return { type: "message_block_24h", hours: 24 };
    case "restrict_7d":
      return { type: "message_block_7d", hours: 24 * 7 };
    case "restrict_30d":
      return { type: "message_block_30d", hours: 24 * 30 };
    case "ban":
      return { type: "message_banned", hours: null };
    case "suspend":
      return { type: "account_suspended", hours: 24 * 7 };
    default:
      return null;
  }
}

export async function applyMessageReportAction(input: {
  moderatorId: string;
  reportId: string;
  action: MessageModerationAction;
  messageId?: string | null;
  note?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const guard = await requirePermission("moderation.action.create");
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const db = await createClient();

  const { data: report } = await db
    .from("message_reports")
    .select("id, reporter_id, reported_user_id, message_id, status")
    .eq("id", input.reportId)
    .maybeSingle();

  if (!report) {
    return { ok: false, error: "Báo cáo không tồn tại." };
  }

  const targetMessageId = input.messageId ?? (report.message_id as string | null);

  if (input.action === "warn_user") {
    await db.from("violations").insert({
      user_id: report.reported_user_id as string,
      target_type: "message",
      target_id: targetMessageId ?? input.reportId,
      policy_area: "harassment",
      severity: "warning",
      action_taken: "warn",
      strike_count: 0,
      note: input.note ?? "Cảnh cáo tin nhắn",
      report_id: null,
      created_by: input.moderatorId
    });
  }

  if (input.action === "delete_message" && targetMessageId) {
    await db
      .from("messages")
      .update({
        deleted_at: new Date().toISOString(),
        body_safety_status: "hidden",
        status: "deleted_by_moderator"
      })
      .eq("id", targetMessageId);
  }

  const restriction = restrictionForAction(input.action);
  if (restriction) {
    const endsAt = restriction.hours
      ? new Date(Date.now() + restriction.hours * 60 * 60 * 1000).toISOString()
      : null;

    await db.from("account_restrictions").insert({
      user_id: report.reported_user_id as string,
      restriction_type: restriction.type,
      reason: input.note ?? "Vi phạm tin nhắn",
      ends_at: endsAt,
      is_active: true,
      created_by: input.moderatorId
    });

    if (restriction.type.startsWith("message_") || restriction.type === "message_banned") {
      await notifyMessageRestriction(
        report.reported_user_id as string,
        endsAt
      );
    }
  }

  const status =
    input.action === "no_violation" || input.action === "reporter_abuse"
      ? "dismissed"
      : "resolved";

  const resolutionLabels: Partial<Record<MessageModerationAction, string>> = {
    no_violation: "Không vi phạm",
    warn_user: "Cảnh cáo người dùng",
    delete_message: "Đã gỡ tin nhắn",
    restrict_24h: "Hạn chế nhắn tin 24h",
    restrict_7d: "Hạn chế nhắn tin 7 ngày",
    restrict_30d: "Hạn chế nhắn tin 30 ngày",
    suspend: "Tạm khóa tài khoản",
    ban: "Cấm nhắn tin",
    reporter_abuse: "Báo cáo sai"
  };

  await db
    .from("message_reports")
    .update({
      status,
      resolution: resolutionLabels[input.action] ?? input.action,
      reviewed_by: input.moderatorId,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", input.reportId);

  const outcome =
    input.action === "no_violation"
      ? "Báo cáo của bạn đã được xem xét — không phát hiện vi phạm."
      : "Báo cáo tin nhắn của bạn đã được xử lý. Cảm ơn bạn đã giúp cộng đồng an toàn.";

  await notifyMessageReportResolved(report.reporter_id as string, outcome);

  await logAdminAction({
    actorId: input.moderatorId,
    action: "message_moderation",
    targetType: "message_report",
    targetId: input.reportId,
    metadata: {
      action: input.action,
      reportedUserId: report.reported_user_id,
      messageId: targetMessageId,
      note: input.note ?? null
    }
  });

  revalidatePath("/admin/messaging");
  revalidatePath("/admin/moderation/messages");
  return { ok: true };
}
