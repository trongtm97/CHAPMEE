"use server";

import { revalidatePath } from "next/cache";
import { createModerationCase } from "@/lib/admin/createModerationCase";
import { assertStaffPermission } from "@/lib/auth/staff-guards";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";
import { createClient } from "@/lib/data/server";

async function requireAdminAction() {
  const guard = await requireAdminOrModerator("/admin/reports");

  if (!guard.ok) {
    throw new Error(guard.error);
  }

  return guard.profile;
}

async function getReport(reportId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("reports")
    .select("id, target_type, target_id")
    .eq("id", reportId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function markReportReviewingAction(formData: FormData) {
  await requireAdminAction();
  await assertStaffPermission("report.review");
  const reportId = String(formData.get("report_id") ?? "");
  const db = await createClient();
  const { error } = await db
    .from("reports")
    .update({ status: "reviewing" })
    .eq("id", reportId)
    .in("status", ["pending", "reviewing"]);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/reports");
}

export async function resolveReportAction(formData: FormData) {
  const profile = await requireAdminAction();
  await assertStaffPermission("report.review");
  const reportId = String(formData.get("report_id") ?? "");
  const note = String(formData.get("moderation_note") ?? "").trim();
  const report = await getReport(reportId);

  if (!report) {
    revalidatePath("/admin/reports");
    return;
  }

  const db = await createClient();
  const { error } = await db
    .from("reports")
    .update({ status: "resolved" })
    .eq("id", reportId);

  if (error) {
    throw new Error(error.message);
  }

  await createModerationCase({
    actionTaken: "Resolved report",
    moderatorId: profile.id,
    note,
    reportId,
    targetId: report.target_id,
    targetType: report.target_type
  });

  await logAdminAction({
    actorId: profile.id,
    action: "delete_report",
    targetType: report.target_type,
    targetId: report.target_id,
    metadata: { reportId, status: "resolved", note: note || null }
  });

  revalidatePath("/admin/reports");
}

export async function rejectReportAction(formData: FormData) {
  const profile = await requireAdminAction();
  await assertStaffPermission("report.review");
  const reportId = String(formData.get("report_id") ?? "");
  const note = String(formData.get("moderation_note") ?? "").trim();
  const report = await getReport(reportId);

  if (!report) {
    revalidatePath("/admin/reports");
    return;
  }

  const db = await createClient();
  const { error } = await db
    .from("reports")
    .update({ status: "rejected" })
    .eq("id", reportId);

  if (error) {
    throw new Error(error.message);
  }

  await createModerationCase({
    actionTaken: "Rejected report",
    moderatorId: profile.id,
    note,
    reportId,
    targetId: report.target_id,
    targetType: report.target_type
  });

  await logAdminAction({
    actorId: profile.id,
    action: "delete_report",
    targetType: report.target_type,
    targetId: report.target_id,
    metadata: { reportId, status: "rejected", note: note || null }
  });

  revalidatePath("/admin/reports");
}
