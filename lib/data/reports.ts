import { createClient } from "@/lib/data/server";
import type { ModerationQueueItem, ModerationStatus, ReportReason, ReportStatus, ReportTargetType } from "@/types/moderation";

export async function createReport(input: {
  reporterUserId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string | null;
}) {
  const db = await createClient();
  const { error } = await db.from("reports").insert({
    reporter_id: input.reporterUserId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: input.description ?? null,
    status: "pending"
  });
  if (error) throw error;
}

export async function getModerationQueue(): Promise<ModerationQueueItem[]> {
  const db = await createClient();
  const { data, error } = await db.rpc("get_moderation_queue");
  if (error) throw error;
  type ModerationQueueRow = {
    id: string;
    target_type: ReportTargetType;
    target_id: string;
    reason: ReportReason;
    report_count: number | null;
    preview: string | null;
    status: ReportStatus;
    created_at: string;
    moderation_status: ModerationStatus | null;
  };

  return (Array.isArray(data) ? data : []).map((row) => {
    const item = row as ModerationQueueRow;
    return {
      id: item.id,
      targetType: item.target_type,
      targetId: item.target_id,
      reasonCode: item.reason,
      reportCount: Number(item.report_count ?? 0),
      preview: item.preview ?? null,
      status: item.status,
      priority: "normal",
      createdAt: item.created_at,
      moderationStatus: item.moderation_status ?? null
    };
  });
}

export async function updateReportStatus(input: {
  reportId: string;
  status: ReportStatus;
  moderatorUserId: string;
  moderatorNote?: string | null;
}) {
  const db = await createClient();
  const { error } = await db
    .from("reports")
    .update({
      status: input.status,
      moderator_id: input.moderatorUserId,
      moderator_note: input.moderatorNote ?? null
    })
    .eq("id", input.reportId);
  if (error) throw error;
}

export async function setModerationStatus(input: {
  targetType: ReportTargetType;
  targetId: string;
  status: ModerationStatus;
}) {
  const db = await createClient();
  const table =
    input.targetType === "comment"
      ? "comments"
      : input.targetType === "story"
        ? "stories"
        : input.targetType === "chapter"
          ? "episodes"
          : null;
  if (!table) return;
  const { error } = await db
    .from(table)
    .update({ moderation_status: input.status })
    .eq("id", input.targetId);
  if (error) throw error;
}

export async function moderateTarget(input: {
  reportId: string;
  targetType: ReportTargetType;
  targetId: string;
  status: ModerationStatus;
  moderatorUserId: string;
  moderatorNote?: string | null;
}) {
  await updateReportStatus({
    reportId: input.reportId,
    moderatorNote: input.moderatorNote ?? null,
    moderatorUserId: input.moderatorUserId,
    status: input.status === "hidden" || input.status === "rejected" ? "reviewed" : "resolved"
  });
  await setModerationStatus({
    targetId: input.targetId,
    targetType: input.targetType,
    status: input.status
  });
}
