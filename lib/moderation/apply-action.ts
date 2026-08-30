"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { requirePermission } from "@/lib/auth/require-permission";
import { createNotification } from "@/lib/notifications/create-notification";
import {
  defaultSeverityForAction,
  restrictionDurationHours,
  restrictionTypeForAction,
  strikePointsForSeverity
} from "@/lib/moderation/moderation-rules";
import { recordReportOutcome } from "@/lib/moderation/reporter-quality";
import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type {
  ModerationActionType,
  PolicyArea,
  ViolationSeverity
} from "@/types/moderation";

export type ApplyModerationActionInput = {
  moderatorId: string;
  userId: string;
  targetType?: string | null;
  targetId?: string | null;
  policyArea: PolicyArea;
  severity?: ViolationSeverity;
  action: ModerationActionType;
  note?: string | null;
  reportId?: string | null;
};

const STRIKE_EXPIRY_DAYS = 90;

export async function applyModerationAction(
  input: ApplyModerationActionInput
): Promise<{ ok: boolean; violationId?: string; error?: string }> {
  const severity = input.severity ?? defaultSeverityForAction(input.action);
  const db = await createClient();

  if (input.action === "no_action") {
    return { ok: true };
  }

  let violationId: string | undefined;

  const { data: violation, error: violationError } = await db
    .from("violations")
    .insert({
      user_id: input.userId,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      policy_area: input.policyArea,
      severity,
      action_taken: input.action,
      strike_count: strikePointsForSeverity(severity),
      note: input.note ?? null,
      report_id: input.reportId ?? null,
      created_by: input.moderatorId,
      expires_at:
        severity === "critical"
          ? null
          : new Date(Date.now() + STRIKE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()
    })
    .select("id")
    .single();

  if (violationError || !violation) {
    if (violationError && isMissingSchemaError(violationError)) {
      return { ok: false, error: "Hệ thống moderation chưa được migrate." };
    }
    return {
      ok: false,
      error: violationError?.message ?? "Không tạo được violation."
    };
  }

  violationId = violation.id;

  const strikePoints = strikePointsForSeverity(severity);
  if (strikePoints > 0 && severity !== "warning") {
    const expiresAt = new Date(
      Date.now() + STRIKE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    await db.from("account_strikes").insert({
      user_id: input.userId,
      violation_id: violationId,
      policy_area: input.policyArea,
      points: strikePoints,
      expires_at: expiresAt,
      is_active: true
    });
  }

  const restrictionType = restrictionTypeForAction(input.action);
  if (restrictionType) {
    const hours = restrictionDurationHours(severity, input.action);
    const endsAt =
      hours === null
        ? null
        : new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    await db.from("account_restrictions").insert({
      user_id: input.userId,
      restriction_type: restrictionType,
      reason: input.note ?? `Vi phạm: ${input.policyArea}`,
      ends_at: endsAt,
      is_active: true,
      created_by: input.moderatorId,
      violation_id: violationId
    });

    if (
      restrictionType === "account_suspended" ||
      restrictionType === "account_banned"
    ) {
      await db
        .from("profiles")
        .update({
          status: restrictionType === "account_banned" ? "banned" : "suspended"
        })
        .eq("id", input.userId);
    }
  }

  await applyContentAction(db, input.action, input.targetType, input.targetId);
  await sendModerationNotification(input.userId, input.action, input.note);

  await logAdminAction({
    actorId: input.moderatorId,
    action: "moderation_enforcement",
    targetType: input.targetType ?? "user",
    targetId: input.targetId ?? input.userId,
    metadata: {
      action: input.action,
      policyArea: input.policyArea,
      severity,
      violationId,
      reportId: input.reportId ?? null
    }
  });

  revalidatePath("/me/account-status");
  revalidatePath("/studio/status");
  revalidatePath("/admin/moderation");

  return { ok: true, violationId };
}

async function applyContentAction(
  db: Awaited<ReturnType<typeof createClient>>,
  action: ModerationActionType,
  targetType?: string | null,
  targetId?: string | null
) {
  if (!targetType || !targetId) {
    return;
  }

  if (action === "age_restrict" && targetType === "story") {
    await db
      .from("stories")
      .update({ age_rating: "mature_18" })
      .eq("id", targetId);
    return;
  }

  if (action !== "remove_content" && action !== "hide_content") {
    return;
  }

  if (targetType === "comment") {
    await db
      .from("comments")
      .update({
        status: action === "hide_content" ? "hidden" : "deleted",
        moderation_status: "resolved"
      })
      .eq("id", targetId);
  } else if (targetType === "community_post") {
    await db
      .from("community_posts")
      .update({ status: "hidden" })
      .eq("id", targetId);
  } else if (targetType === "story") {
    await db
      .from("stories")
      .update({
        status: "archived",
        moderation_status: "resolved"
      })
      .eq("id", targetId);
  } else if (targetType === "chapter") {
    await db
      .from("episodes")
      .update({
        status: "archived",
        moderation_status: "resolved"
      })
      .eq("id", targetId);
  }
}

async function sendModerationNotification(
  userId: string,
  action: ModerationActionType,
  note?: string | null
) {
  const titles: Partial<Record<ModerationActionType, string>> = {
    warn: "Cảnh cáo từ ChapMee",
    remove_content: "Nội dung đã bị gỡ",
    hide_content: "Nội dung đã bị ẩn",
    restrict_commenting: "Bình luận bị hạn chế",
    restrict_posting: "Đăng bài bị hạn chế",
    restrict_story_publishing: "Đăng truyện bị hạn chế",
    hold_monetization: "Kiếm tiền tạm giữ",
    hold_payout: "Rút tiền tạm giữ",
    suspend_account: "Tài khoản tạm khóa",
    ban_account: "Tài khoản bị khóa"
  };

  const title = titles[action];
  if (!title) {
    return;
  }

  await createNotification(userId, "community_guideline_update", {
    title,
    body:
      note ??
      "Xem trạng thái tài khoản và gửi khiếu nại nếu bạn cho rằng quyết định này nhầm.",
    actionUrl: "/me/account-status",
    metadata: { moderation_action: action }
  });
}

export async function processReportModerationAction(formData: FormData) {
  const guard = await requirePermission("moderation.action.create", {
    returnTo: "/admin/moderation"
  });
  if (!guard.ok || !guard.context) {
    throw new Error(guard.error ?? "Không có quyền.");
  }

  const reportId = String(formData.get("report_id") ?? "");
  const db = await createClient();

  const { data: reportRow } = await db
    .from("reports")
    .select("reporter_id, status")
    .eq("id", reportId)
    .maybeSingle();

  const rawAction = String(formData.get("action") ?? "");
  if (rawAction === "escalate") {
    await db
      .from("reports")
      .update({
        status: "escalated",
        assigned_to: guard.context.userId
      })
      .eq("id", reportId);
    revalidatePath("/admin/moderation");
    return;
  }
  const action = rawAction as ModerationActionType;
  const policyArea = String(formData.get("policy_area") ?? "platform_integrity") as PolicyArea;
  const userId = String(formData.get("user_id") ?? "");
  const targetType = String(formData.get("target_type") ?? "") || null;
  const targetId = String(formData.get("target_id") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!reportId || !userId) {
    throw new Error("Thiếu thông tin báo cáo.");
  }

  if (action !== "no_action") {
    const result = await applyModerationAction({
      moderatorId: guard.context.userId,
      userId,
      targetType,
      targetId,
      policyArea,
      action,
      note,
      reportId
    });

    if (!result.ok) {
      throw new Error(result.error ?? "Không thể xử lý.");
    }
  }

  const reportStatus =
    action === "no_action" ? "resolved_no_violation" : "resolved_action_taken";

  await db
    .from("reports")
    .update({
      status: reportStatus,
      assigned_to: guard.context.userId
    })
    .eq("id", reportId);

  if (reportRow?.reporter_id) {
    const outcome =
      action === "no_action" ? "no_violation" : ("valid" as const);
    const alreadyFinal = ["resolved_no_violation", "resolved_action_taken", "rejected_abuse"].includes(
      reportRow.status ?? ""
    );
    if (!alreadyFinal) {
      await recordReportOutcome(reportRow.reporter_id, outcome);
    }
  }

  await logAdminAction({
    actorId: guard.context.userId,
    action: "moderation_action",
    targetType: targetType ?? "report",
    targetId: reportId,
    metadata: { action, policyArea, note }
  });

  revalidatePath("/admin/moderation");
  revalidatePath("/admin/reports");
}
