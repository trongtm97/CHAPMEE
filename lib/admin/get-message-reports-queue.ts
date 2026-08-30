"use server";

import { createClient } from "@/lib/data/server";
import { containsExternalLink } from "@/lib/moderation/message-safety";
import type { MessageReportQueueItem } from "@/types/messaging-safety";
import type { MessagingDashboardFilters } from "@/types/admin-messaging";

async function countPriorReports(
  db: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { count } = await db
    .from("message_reports")
    .select("id", { count: "exact", head: true })
    .eq("reported_user_id", userId);
  return count ?? 0;
}

function matchesFilters(
  row: Record<string, unknown>,
  filters: MessagingDashboardFilters
): boolean {
  if (filters.reportStatus !== "all" && row.status !== filters.reportStatus) {
    return false;
  }
  if (filters.riskLevel !== "all" && row.risk_level !== filters.riskLevel) {
    return false;
  }
  if (
    filters.reportReason !== "all" &&
    row.reason_code !== filters.reportReason
  ) {
    return false;
  }
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    const hay = [
      row.id,
      row.conversation_id,
      row.message_id
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) {
      return false;
    }
  }
  return true;
}

export async function getMessageReportsQueue(
  filters: MessagingDashboardFilters
): Promise<MessageReportQueueItem[]> {
  const db = await createClient();

  let query = db
    .from("message_reports")
    .select(
      `id, reason_code, detail, status, risk_level, created_at, conversation_id, message_id,
       assigned_to,
       reporter:profiles!message_reports_reporter_id_fkey(id, display_name, username),
       reported:profiles!message_reports_reported_user_id_fkey(id, display_name, username, role),
       messages(body),
       message_requests(first_message)`
    )
    .order("created_at", { ascending: false })
    .limit(80);

  if (filters.reportStatus === "all") {
    query = query.in("status", ["open", "reviewing", "resolved", "dismissed", "rejected"]);
  } else if (filters.reportStatus === "open") {
    query = query.eq("status", "open");
  } else if (filters.reportStatus === "reviewing") {
    query = query.eq("status", "reviewing");
  } else if (filters.reportStatus === "resolved") {
    query = query.eq("status", "resolved");
  } else if (filters.reportStatus === "rejected") {
    query = query.in("status", ["dismissed", "rejected"]);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  const items: MessageReportQueueItem[] = [];

  for (const row of data) {
    if (!matchesFilters(row as Record<string, unknown>, filters)) {
      continue;
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
    };
    const messageRaw = row.messages as unknown;
    const messageRow = (Array.isArray(messageRaw) ? messageRaw[0] : messageRaw) as
      | { body: string }
      | null;
    const requestRaw = row.message_requests as unknown;
    const requestRow = (Array.isArray(requestRaw) ? requestRaw[0] : requestRaw) as
      | { first_message: string }
      | null;

    const preview = messageRow?.body ?? requestRow?.first_message ?? null;
    const priorReportCount = await countPriorReports(db, reported.id);

    items.push({
      id: row.id as string,
      reasonCode: row.reason_code as string,
      description: row.detail as string | null,
      status: row.status as MessageReportQueueItem["status"],
      riskLevel: (row.risk_level as MessageReportQueueItem["riskLevel"]) ?? "medium",
      createdAt: row.created_at as string,
      conversationId: (row.conversation_id as string) ?? null,
      messageId: (row.message_id as string) ?? null,
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
      messagePreview: preview,
      priorReportCount,
      hasBlockedKeyword: false,
      hasBlockedLink: preview ? containsExternalLink(preview) : false,
      assignedTo: (row.assigned_to as string) ?? null
    });
  }

  return items;
}
