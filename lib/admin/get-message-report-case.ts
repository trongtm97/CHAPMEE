"use server";

import { createClient } from "@/lib/supabase/server";
import { containsExternalLink } from "@/lib/moderation/message-safety";
import { getActiveMessagingRestrictions } from "@/lib/messaging/get-active-messaging-restriction";
import type { MessageReportCaseDetail } from "@/types/messaging-safety";

const CONTEXT_LIMIT = 3;

export async function getMessageReportCase(
  reportId: string,
  options: { includeMessageContent: boolean }
): Promise<MessageReportCaseDetail | null> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("message_reports")
    .select(
      `id, reason_code, detail, status, risk_level, created_at, conversation_id, message_id,
       reporter:profiles!message_reports_reporter_id_fkey(id, display_name, username),
       reported:profiles!message_reports_reported_user_id_fkey(id, display_name, username, role, created_at),
       messages(body, sender_id, created_at),
       message_requests(first_message, requester_id)`
    )
    .eq("id", reportId)
    .maybeSingle();

  if (!row) {
    return null;
  }

  const reporterRaw = row.reporter as unknown;
  const reporter = (Array.isArray(reporterRaw) ? reporterRaw[0] : reporterRaw) as {
    id: string;
    display_name: string | null;
    username: string | null;
  };
  const reportedRaw = row.reported as unknown;
  const reported = (Array.isArray(reportedRaw) ? reportedRaw[0] : reportedRaw) as {
    id: string;
    display_name: string | null;
    username: string | null;
    role: string;
    created_at: string;
  };

  const messageRaw = row.messages as unknown;
  const messageRow = (Array.isArray(messageRaw) ? messageRaw[0] : messageRaw) as
    | { body: string; sender_id: string; created_at: string }
    | null;
  const requestRaw = row.message_requests as unknown;
  const requestRow = (Array.isArray(requestRaw) ? requestRaw[0] : requestRaw) as
    | { first_message: string; requester_id: string }
    | null;

  const preview = messageRow?.body ?? requestRow?.first_message ?? null;
  const conversationId = row.conversation_id as string | null;
  const messageId = row.message_id as string | null;

  const contextMessages: MessageReportCaseDetail["contextMessages"] = [];

  if (options.includeMessageContent && conversationId && messageId && messageRow) {
    const createdAt = messageRow.created_at;

    const [{ data: before }, { data: after }] = await Promise.all([
      supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("conversation_id", conversationId)
        .lt("created_at", createdAt)
        .order("created_at", { ascending: false })
        .limit(CONTEXT_LIMIT),
      supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("conversation_id", conversationId)
        .gt("created_at", createdAt)
        .order("created_at", { ascending: true })
        .limit(CONTEXT_LIMIT)
    ]);

    for (const msg of before ?? []) {
      contextMessages.push({
        id: msg.id as string,
        senderId: msg.sender_id as string,
        body: msg.body as string,
        createdAt: msg.created_at as string,
        isReported: false,
        isContextOnly: true
      });
    }
    contextMessages.reverse();

    contextMessages.push({
      id: messageId,
      senderId: messageRow.sender_id,
      body: messageRow.body,
      createdAt,
      isReported: true,
      isContextOnly: false
    });

    for (const msg of after ?? []) {
      contextMessages.push({
        id: msg.id as string,
        senderId: msg.sender_id as string,
        body: msg.body as string,
        createdAt: msg.created_at as string,
        isReported: false,
        isContextOnly: true
      });
    }
  } else if (options.includeMessageContent && preview) {
    contextMessages.push({
      id: messageId ?? reportId,
      senderId: reported.id,
      body: preview,
      createdAt: row.created_at as string,
      isReported: true,
      isContextOnly: false
    });
  }

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    reports30dRes,
    warningsRes,
    restrictionsRes,
    recipientsRes,
    priorReportsRes,
    activeRestrictions
  ] = await Promise.all([
    supabase
      .from("message_reports")
      .select("id", { count: "exact", head: true })
      .eq("reported_user_id", reported.id)
      .gte("created_at", since30d),
    supabase
      .from("violations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", reported.id)
      .eq("severity", "warning"),
    supabase
      .from("messaging_restrictions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", reported.id),
    supabase
      .from("messages")
      .select("conversation_id")
      .eq("sender_id", reported.id)
      .gte("created_at", since24h),
    supabase
      .from("message_reports")
      .select("id", { count: "exact", head: true })
      .eq("reported_user_id", reported.id),
    getActiveMessagingRestrictions(reported.id)
  ]);

  const uniqueConversations = new Set(
    (recipientsRes.data ?? []).map((r) => r.conversation_id as string)
  );

  const accountAgeDays =
    (Date.now() - new Date(reported.created_at).getTime()) / (24 * 60 * 60 * 1000);

  return {
    id: row.id as string,
    reasonCode: row.reason_code as string,
    description: row.detail as string | null,
    status: row.status as MessageReportCaseDetail["status"],
    riskLevel: (row.risk_level as MessageReportCaseDetail["riskLevel"]) ?? "medium",
    createdAt: row.created_at as string,
    conversationId,
    messageId,
    reporter: {
      id: reporter.id,
      displayName: reporter.display_name,
      username: reporter.username
    },
    reportedUser: {
      id: reported.id,
      displayName: reported.display_name,
      username: reported.username,
      role: reported.role ?? "reader"
    },
    messagePreview: options.includeMessageContent ? preview : null,
    priorReportCount: priorReportsRes.count ?? 0,
    hasBlockedKeyword: false,
    hasBlockedLink: preview ? containsExternalLink(preview) : false,
    assignedTo: null,
    contextMessages,
    safetySignals: {
      hasExternalLink: preview ? containsExternalLink(preview) : false,
      hasBlockedKeyword: false,
      hasSpamPattern: false,
      senderIsNewAccount: accountAgeDays < 7,
      senderRecipients24h: uniqueConversations.size,
      senderReportCount30d: reports30dRes.count ?? 0,
      recipientIsAuthor:
        reported.role === "creator" ||
        reported.role === "admin" ||
        reported.role === "moderator"
    },
    reportedUserHistory: {
      reports30d: reports30dRes.count ?? 0,
      warnings: warningsRes.count ?? 0,
      restrictionCount: restrictionsRes.count ?? 0,
      activeRestriction: activeRestrictions[0]?.restrictionType ?? null
    }
  };
}
