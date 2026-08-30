"use server";

import { createClient } from "@/lib/data/server";
import { sinceForRange } from "@/lib/admin/messaging-date-range";
import { computeMessagingRiskScore } from "@/lib/admin/messaging-risk-score";
import type { MessageUserRiskDetail } from "@/types/admin-messaging";
import type { MessageReportReasonCode } from "@/types/messages";

export async function getMessageUserRiskDetail(
  userId: string
): Promise<MessageUserRiskDetail | null> {
  const db = await createClient();
  const since7d = sinceForRange("7d");
  const since24h = sinceForRange("24h");
  const now = Date.now();

  const { data: profile } = await db
    .from("profiles")
    .select("id, display_name, username, avatar_url, role, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  const createdAt = profile.created_at as string;
  const accountAgeHours = (now - new Date(createdAt).getTime()) / (60 * 60 * 1000);

  const [
    openReportsRes,
    reports7dRes,
    blocksRes,
    safetyRes,
    requestsRes,
    restrictionsRes,
    recentReportsRes
  ] = await Promise.all([
    db
      .from("message_reports")
      .select("id", { count: "exact", head: true })
      .eq("reported_user_id", userId)
      .in("status", ["open", "reviewing"]),
    db
      .from("message_reports")
      .select("id", { count: "exact", head: true })
      .eq("reported_user_id", userId)
      .gte("created_at", since7d),
    db
      .from("message_blocks")
      .select("id", { count: "exact", head: true })
      .eq("blocked_id", userId),
    db
      .from("message_safety_logs")
      .select("status, reasons")
      .eq("user_id", userId)
      .gte("created_at", since7d),
    db
      .from("message_requests")
      .select("id", { count: "exact", head: true })
      .eq("requester_id", userId)
      .gte("created_at", since24h),
    db
      .from("account_restrictions")
      .select("id, restriction_type, reason, ends_at")
      .eq("user_id", userId)
      .eq("is_active", true),
    db
      .from("message_reports")
      .select(
        `id, reason_code, status, created_at,
         reporter:profiles!message_reports_reporter_id_fkey(display_name, username)`
      )
      .eq("reported_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8)
  ]);

  let safetyBlocked = 0;
  let safetyWarnings = 0;
  let spamCount = 0;
  for (const row of safetyRes.data ?? []) {
    if (row.status === "blocked") safetyBlocked += 1;
    if (row.status === "review") safetyWarnings += 1;
    const reasons = (row.reasons ?? []) as string[];
    if (reasons.some((r) => r.includes("link") || r === "scam")) {
      spamCount += 1;
    }
  }

  const openReports = openReportsRes.count ?? 0;
  const riskScore = computeMessagingRiskScore({
    openReports,
    safetyBlocked,
    safetyWarnings,
    requests24h: requestsRes.count ?? 0,
    duplicateSpamCount: spamCount,
    blocksReceived: blocksRes.count ?? 0,
    accountAgeHours,
    hasOpenReportWhileNew: accountAgeHours < 24 && openReports > 0
  });

  const recentReports = (recentReportsRes.data ?? []).map((row) => {
    const reporterRaw = row.reporter as unknown;
    const reporter = (Array.isArray(reporterRaw) ? reporterRaw[0] : reporterRaw) as {
      display_name: string | null;
      username: string | null;
    };
    return {
      id: row.id as string,
      reasonCode: row.reason_code as MessageReportReasonCode,
      status: row.status as string,
      createdAt: row.created_at as string,
      reporterName:
        reporter?.display_name ?? reporter?.username ?? "Ẩn danh"
    };
  });

  return {
    userId,
    displayName:
      (profile.display_name as string) ??
      (profile.username as string) ??
      "Người dùng",
    username: profile.username as string | null,
    avatarUrl: profile.avatar_url as string | null,
    role: (profile.role as string) ?? "reader",
    accountCreatedAt: createdAt,
    openReports,
    reports7d: reports7dRes.count ?? 0,
    blocksReceived: blocksRes.count ?? 0,
    safetyBlocked,
    safetyWarnings,
    requests24h: requestsRes.count ?? 0,
    riskScore,
    activeRestrictions: (restrictionsRes.data ?? []).map((r) => ({
      id: r.id as string,
      restrictionType: r.restriction_type as string,
      reason: r.reason as string | null,
      endsAt: r.ends_at as string | null
    })),
    recentReports
  };
}
