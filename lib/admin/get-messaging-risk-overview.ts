"use server";

import { createClient } from "@/lib/supabase/server";
import { startOfTodayIso } from "@/lib/admin/messaging-date-range";
import type { MessagingRiskOverview } from "@/types/admin-messaging";

const MESSAGE_RESTRICTION_TYPES = [
  "message_block_24h",
  "message_block_7d",
  "message_block_30d",
  "message_banned"
];

const CREATOR_ROLES = new Set(["creator", "admin", "moderator", "founder"]);

export async function getMessagingRiskOverview(): Promise<MessagingRiskOverview> {
  const supabase = await createClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const todayStart = startOfTodayIso();
  const now = new Date().toISOString();

  const [
    openReportsRes,
    blocked24hRes,
    requestsTodayRes,
    restrictedRes,
    messagingRestrictedRes,
    safety24hRes,
    newProfilesRes,
    reports24hRes
  ] = await Promise.all([
    supabase
      .from("message_reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "reviewing"]),
    supabase
      .from("message_safety_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "blocked")
      .gte("created_at", since24h),
    supabase
      .from("message_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart),
    supabase
      .from("account_restrictions")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .in("restriction_type", MESSAGE_RESTRICTION_TYPES)
      .lte("starts_at", now)
      .or(`ends_at.is.null,ends_at.gt.${now}`),
    supabase
      .from("messaging_restrictions")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .lte("starts_at", now)
      .or(`ends_at.is.null,ends_at.gt.${now}`),
    supabase
      .from("message_safety_logs")
      .select("user_id, reasons, status")
      .gte("created_at", since24h),
    supabase
      .from("profiles")
      .select("id")
      .gte("created_at", since24h),
    supabase
      .from("message_reports")
      .select("reported_user_id, reported:profiles!message_reports_reported_user_id_fkey(role)")
      .gte("created_at", since24h)
  ]);

  const LINK_REASONS = new Set([
    "spam_link",
    "risky_link",
    "link_first_message",
    "link_stranger",
    "scam"
  ]);

  let linkSpamBlocked24h = 0;
  const newUserIds = new Set((newProfilesRes.data ?? []).map((r) => r.id as string));
  const safetyUserIds = new Set<string>();

  for (const row of safety24hRes.data ?? []) {
    safetyUserIds.add(row.user_id as string);
    const reasons = (row.reasons ?? []) as string[];
    if (reasons.some((r) => LINK_REASONS.has(r))) {
      linkSpamBlocked24h += 1;
    }
  }

  let newAccountAlerts = 0;
  for (const id of newUserIds) {
    if (safetyUserIds.has(id)) {
      newAccountAlerts += 1;
    }
  }

  const { count: openOnNewReports } = await supabase
    .from("message_reports")
    .select("reported_user_id", { count: "exact", head: true })
    .in("status", ["open", "reviewing"])
    .gte("created_at", since24h);

  if (newUserIds.size && (openOnNewReports ?? 0) > 0) {
    newAccountAlerts = Math.max(newAccountAlerts, Math.min(newUserIds.size, openOnNewReports ?? 0));
  }

  const reportCountByUser = new Map<string, number>();
  let authorSpamReports24h = 0;

  for (const row of reports24hRes.data ?? []) {
    const uid = row.reported_user_id as string;
    reportCountByUser.set(uid, (reportCountByUser.get(uid) ?? 0) + 1);
    const reportedRaw = row.reported as unknown;
    const reported = (Array.isArray(reportedRaw) ? reportedRaw[0] : reportedRaw) as {
      role: string;
    } | null;
    if (reported && CREATOR_ROLES.has(reported.role)) {
      authorSpamReports24h += 1;
    }
  }

  let heavilyReportedUsers = 0;
  for (const count of reportCountByUser.values()) {
    if (count >= 3) {
      heavilyReportedUsers += 1;
    }
  }

  const restrictedTotal =
    (restrictedRes.count ?? 0) + (messagingRestrictedRes.count ?? 0);

  return {
    openReports: openReportsRes.count ?? 0,
    blockedMessages24h: blocked24hRes.count ?? 0,
    requestsToday: requestsTodayRes.count ?? 0,
    restrictedUsers: restrictedTotal,
    linkSpamBlocked24h,
    newAccountAlerts24h: newAccountAlerts,
    heavilyReportedUsers,
    authorSpamReports24h
  };
}
