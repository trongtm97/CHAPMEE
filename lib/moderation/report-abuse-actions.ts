"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { requirePermission } from "@/lib/auth/require-permission";
import { applyModerationAction } from "@/lib/moderation/apply-action";
import { recordReportOutcome } from "@/lib/moderation/reporter-quality";
import { createClient } from "@/lib/data/server";

export async function markReportAbuseAction(formData: FormData) {
  const guard = await requirePermission("moderation.action.create", {
    returnTo: "/admin/moderation"
  });
  if (!guard.ok || !guard.context) {
    throw new Error(guard.error ?? "Không có quyền.");
  }

  const reportId = String(formData.get("report_id") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  const db = await createClient();
  const { data: report } = await db
    .from("reports")
    .select("id, reporter_id, status")
    .eq("id", reportId)
    .maybeSingle();

  if (!report?.reporter_id) {
    throw new Error("Không tìm thấy báo cáo.");
  }

  const alreadyAbuse = report.status === "rejected_abuse";

  await db
    .from("reports")
    .update({
      status: "rejected_abuse",
      assigned_to: guard.context.userId
    })
    .eq("id", reportId);

  if (!alreadyAbuse) {
    await recordReportOutcome(report.reporter_id, "abuse");
  }

  await logAdminAction({
    actorId: guard.context.userId,
    action: "report_marked_abuse",
    targetType: "report",
    targetId: reportId,
    metadata: { reporter_id: report.reporter_id, note }
  });

  revalidatePath("/admin/moderation");
}

export async function enforceReporterAbuseAction(formData: FormData) {
  const guard = await requirePermission("moderation.action.create", {
    returnTo: "/admin/moderation"
  });
  if (!guard.ok || !guard.context) {
    throw new Error(guard.error ?? "Không có quyền.");
  }

  const reporterId = String(formData.get("reporter_id") ?? "");
  const enforcement = String(formData.get("enforcement") ?? "");
  const reportId = String(formData.get("report_id") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!reporterId) {
    throw new Error("Thiếu thông tin người báo cáo.");
  }

  if (enforcement === "warn") {
    await applyModerationAction({
      moderatorId: guard.context.userId,
      userId: reporterId,
      policyArea: "spam",
      severity: "warning",
      action: "warn",
      note: note ?? "Lạm dụng chức năng báo cáo.",
      reportId
    });
  } else if (enforcement === "restrict_reports") {
    const db = await createClient();
    await db.from("account_restrictions").insert({
      user_id: reporterId,
      restriction_type: "report_block",
      reason: note ?? "Lạm dụng báo cáo — hạn chế gửi báo cáo mới.",
      ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      created_by: guard.context.userId
    });
    await applyModerationAction({
      moderatorId: guard.context.userId,
      userId: reporterId,
      policyArea: "spam",
      severity: "moderate",
      action: "warn",
      note: note ?? "Hạn chế gửi báo cáo 7 ngày.",
      reportId
    });
  } else if (enforcement === "violation") {
    await applyModerationAction({
      moderatorId: guard.context.userId,
      userId: reporterId,
      policyArea: "platform_integrity",
      severity: "moderate",
      action: "warn",
      note: note ?? "Cố tình lạm dụng báo cáo để hại người khác.",
      reportId
    });
    const db = await createClient();
    await db.from("account_restrictions").insert({
      user_id: reporterId,
      restriction_type: "report_block",
      reason: note ?? "Lạm dụng báo cáo nghiêm trọng.",
      ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      created_by: guard.context.userId
    });
  } else {
    throw new Error("Hành động không hợp lệ.");
  }

  await logAdminAction({
    actorId: guard.context.userId,
    action: "reporter_abuse_enforcement",
    targetType: "user",
    targetId: reporterId,
    metadata: { enforcement, reportId, note }
  });

  revalidatePath("/admin/moderation");
  revalidatePath("/me/account-status");
}
