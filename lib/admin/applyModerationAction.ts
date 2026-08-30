"use server";

import { revalidatePath } from "next/cache";
import { createModerationCase } from "@/lib/admin/createModerationCase";
import { assertPermission } from "@/lib/auth/require-permission";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { createClient } from "@/lib/data/server";

type ModerationAction =
  | "hide_comment"
  | "hide_community_post"
  | "archive_story"
  | "reject_story"
  | "archive_episode"
  | "reject_episode";

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

async function updateTargetStatus(action: ModerationAction, targetId: string) {
  const db = await createClient();

  if (action === "hide_comment") {
    return db
      .from("comments")
      .update({ status: "hidden" })
      .eq("id", targetId);
  }

  if (action === "hide_community_post") {
    return db
      .from("community_posts")
      .update({ status: "hidden" })
      .eq("id", targetId);
  }

  if (action === "archive_story" || action === "reject_story") {
    return db
      .from("stories")
      .update({ status: action === "archive_story" ? "archived" : "rejected" })
      .eq("id", targetId);
  }

  return db
    .from("episodes")
    .update({ status: action === "archive_episode" ? "archived" : "rejected" })
    .eq("id", targetId);
}

function allowedActionForTarget(action: ModerationAction, targetType: string) {
  return (
    (targetType === "comment" && action === "hide_comment") ||
    (targetType === "community_post" && action === "hide_community_post") ||
    (targetType === "story" &&
      (action === "archive_story" || action === "reject_story")) ||
    (targetType === "episode" &&
      (action === "archive_episode" || action === "reject_episode"))
  );
}

function describeAction(action: ModerationAction) {
  return action.replaceAll("_", " ");
}

export async function applyModerationAction(formData: FormData) {
  const profile = await requireAdminAction();
  await assertPermission("moderation.action.create");
  const reportId = String(formData.get("report_id") ?? "");
  const action = String(formData.get("moderation_action") ?? "") as ModerationAction;
  const note = String(formData.get("moderation_note") ?? "").trim();
  const report = await getReport(reportId);

  if (!report) {
    revalidatePath("/admin/reports");
    return;
  }

  if (!allowedActionForTarget(action, report.target_type)) {
    throw new Error("Moderation action không phù hợp với target type.");
  }

  const { error } = await updateTargetStatus(action, report.target_id);

  if (error) {
    throw new Error(error.message);
  }

  const db = await createClient();
  const { error: reportError } = await db
    .from("reports")
    .update({ status: "resolved" })
    .eq("id", report.id);

  if (reportError) {
    throw new Error(reportError.message);
  }

  await createModerationCase({
    actionTaken: describeAction(action),
    moderatorId: profile.id,
    note,
    reportId: report.id,
    targetId: report.target_id,
    targetType: report.target_type
  });

  await logAdminAction({
    actorId: profile.id,
    action: "moderation_action",
    targetType: report.target_type,
    targetId: report.target_id,
    metadata: { action, reportId: report.id, note: note || null }
  });

  revalidatePath("/admin/reports");
}
