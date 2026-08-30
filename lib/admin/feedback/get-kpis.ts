"use server";

import { createClient } from "@/lib/data/server";
import type { FeedbackKpiSummary } from "@/types/admin-feedback";

export async function getFeedbackKpiSummary(): Promise<FeedbackKpiSummary> {
  const empty: FeedbackKpiSummary = {
    newCount: 0,
    reviewingCount: 0,
    needReplyCount: 0,
    resolvedTodayCount: 0,
    urgentCount: 0,
    withAttachmentCount: 0
  };

  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  const auth = await checkStaffPermission("feedback.view.all");
  if (!auth.ok) return empty;

  const db = await createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { count: newCount },
    { count: reviewingCount },
    { count: needReplyCount },
    { count: resolvedTodayCount },
    { count: urgentCount },
    { count: withScreenshot },
    { count: withAttachments }
  ] = await Promise.all([
    db
      .from("feedback_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    db
      .from("feedback_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "reviewing"),
    db
      .from("feedback_messages")
      .select("id", { count: "exact", head: true })
      .in("status", ["new", "reviewing", "need_more_info"]),
    db
      .from("feedback_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolved")
      .gte("resolved_at", todayStart.toISOString()),
    db
      .from("feedback_messages")
      .select("id", { count: "exact", head: true })
      .eq("priority", "urgent")
      .in("status", ["new", "reviewing", "need_more_info", "replied"]),
    db
      .from("feedback_messages")
      .select("id", { count: "exact", head: true })
      .not("screenshot_url", "is", null),
    db
      .from("feedback_attachments")
      .select("feedback_id", { count: "exact", head: true })
  ]);

  return {
    newCount: newCount ?? 0,
    reviewingCount: reviewingCount ?? 0,
    needReplyCount: needReplyCount ?? 0,
    resolvedTodayCount: resolvedTodayCount ?? 0,
    urgentCount: urgentCount ?? 0,
    withAttachmentCount: (withScreenshot ?? 0) + (withAttachments ?? 0)
  };
}
