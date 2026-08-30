"use server";

import { createClient } from "@/lib/data/server";
import { sinceForRange } from "@/lib/admin/messaging-date-range";
import {
  computeMessagingRiskScore,
  restrictionLabel,
  sortRiskyUsers
} from "@/lib/admin/messaging-risk-score";
import type {
  MessagingAccountAgeFilter,
  MessagingDateRange,
  MessagingRoleFilter,
  RiskyMessageUser
} from "@/types/admin-messaging";

const SPAM_REASON_KEYS = [
  "spam_link",
  "risky_link",
  "link_first_message",
  "link_stranger",
  "scam",
  "off_platform"
];

function isCreatorRole(role: string) {
  return role === "creator" || role === "admin" || role === "moderator" || role === "founder";
}

export async function getRiskyMessageUsers(input: {
  range: MessagingDateRange;
  role: MessagingRoleFilter;
  accountAge: MessagingAccountAgeFilter;
}): Promise<RiskyMessageUser[]> {
  const db = await createClient();
  const since = sinceForRange(input.range);
  const since24h = sinceForRange("24h");
  const now = Date.now();

  const [
    openReportsRes,
    reports7dRes,
    safetyRes,
    requestsRes,
    blocksRes,
    restrictionsRes,
    messagingRestrictionsRes
  ] = await Promise.all([
    db
      .from("message_reports")
      .select("reported_user_id")
      .in("status", ["open", "reviewing"]),
    db
      .from("message_reports")
      .select("reported_user_id")
      .gte("created_at", sinceForRange("7d")),
    db
      .from("message_safety_logs")
      .select("user_id, status, reasons, created_at")
      .gte("created_at", since),
    db
      .from("message_requests")
      .select("requester_id")
      .gte("created_at", since24h),
    db
      .from("message_blocks")
      .select("blocked_id"),
    db
      .from("account_restrictions")
      .select("user_id, restriction_type, ends_at, is_active")
      .eq("is_active", true)
      .in("restriction_type", [
        "message_block_24h",
        "message_block_7d",
        "message_block_30d",
        "message_banned",
        "account_suspended"
      ]),
    db
      .from("messaging_restrictions")
      .select("user_id, restriction_type")
      .eq("is_active", true)
  ]);

  const userIds = new Set<string>();

  const bump = (map: Map<string, number>, id: string) => {
    userIds.add(id);
    map.set(id, (map.get(id) ?? 0) + 1);
  };

  const openReports = new Map<string, number>();
  const reports7d = new Map<string, number>();

  for (const row of openReportsRes.data ?? []) {
    bump(openReports, row.reported_user_id as string);
  }
  for (const row of reports7dRes.data ?? []) {
    bump(reports7d, row.reported_user_id as string);
  }

  const blockedMap = new Map<string, number>();
  const warningMap = new Map<string, number>();
  const spamMap = new Map<string, number>();

  for (const row of safetyRes.data ?? []) {
    const uid = row.user_id as string;
    userIds.add(uid);
    if (row.status === "blocked") {
      blockedMap.set(uid, (blockedMap.get(uid) ?? 0) + 1);
    }
    if (row.status === "review") {
      warningMap.set(uid, (warningMap.get(uid) ?? 0) + 1);
    }
    const reasons = (row.reasons ?? []) as string[];
    if (reasons.some((r) => SPAM_REASON_KEYS.includes(r))) {
      spamMap.set(uid, (spamMap.get(uid) ?? 0) + 1);
    }
  }

  const requestsMap = new Map<string, number>();
  for (const row of requestsRes.data ?? []) {
    bump(requestsMap, row.requester_id as string);
  }

  const blocksReceivedMap = new Map<string, number>();
  for (const row of blocksRes.data ?? []) {
    bump(blocksReceivedMap, row.blocked_id as string);
  }

  const restrictionMap = new Map<string, string>();
  for (const row of restrictionsRes.data ?? []) {
    restrictionMap.set(row.user_id as string, row.restriction_type as string);
    userIds.add(row.user_id as string);
  }
  for (const row of messagingRestrictionsRes.data ?? []) {
    restrictionMap.set(row.user_id as string, row.restriction_type as string);
    userIds.add(row.user_id as string);
  }

  if (!userIds.size) {
    return [];
  }

  const { data: profiles } = await db
    .from("profiles")
    .select("id, display_name, username, avatar_url, role, created_at")
    .in("id", Array.from(userIds));

  const users: RiskyMessageUser[] = [];

  for (const profile of profiles ?? []) {
    const userId = profile.id as string;
    const role = (profile.role as string) ?? "reader";
    const createdAt = profile.created_at as string;
    const accountAgeHours = (now - new Date(createdAt).getTime()) / (60 * 60 * 1000);

    if (input.role === "creator" && !isCreatorRole(role)) continue;
    if (input.role === "reader" && isCreatorRole(role)) continue;
    if (input.accountAge === "new" && accountAgeHours >= 24) continue;

    const openCount = openReports.get(userId) ?? 0;
    const blocked = blockedMap.get(userId) ?? 0;
    const warnings = warningMap.get(userId) ?? 0;
    const requests = requestsMap.get(userId) ?? 0;
    const spam = spamMap.get(userId) ?? 0;
    const blocks = blocksReceivedMap.get(userId) ?? 0;

    const riskScore = computeMessagingRiskScore({
      openReports: openCount,
      safetyBlocked: blocked,
      safetyWarnings: warnings,
      requests24h: requests,
      duplicateSpamCount: spam,
      blocksReceived: blocks,
      accountAgeHours,
      hasOpenReportWhileNew: accountAgeHours < 24 && openCount > 0
    });

    if (riskScore < 1 && !restrictionMap.has(userId)) {
      continue;
    }

    users.push({
      userId,
      displayName: (profile.display_name as string) ?? (profile.username as string) ?? "Người dùng",
      username: profile.username as string | null,
      avatarUrl: profile.avatar_url as string | null,
      role,
      accountCreatedAt: createdAt,
      accountAgeHours: Math.round(accountAgeHours),
      openReports7d: reports7d.get(userId) ?? 0,
      safetyBlockedCount: blocked,
      safetyWarningCount: warnings,
      requests24h: requests,
      duplicateSpamCount: spam,
      blocksReceived: blocks,
      riskScore,
      activeRestriction: restrictionLabel(restrictionMap.get(userId) ?? null)
    });
  }

  return sortRiskyUsers(users).slice(0, 100);
}
