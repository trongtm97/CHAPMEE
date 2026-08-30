import { createClient } from "@/lib/data/server";
import type { ConversationMessage, MessageModerationReportItem } from "@/types/messages";

async function countPriorReports(
  db: Awaited<ReturnType<typeof createClient>>,
  reportedUserId: string
) {
  const { count } = await db
    .from("message_reports")
    .select("id", { count: "exact", head: true })
    .eq("reported_user_id", reportedUserId)
    .in("status", ["open", "reviewing", "resolved"]);

  return count ?? 0;
}

async function loadReportContext(
  db: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  messageId: string | null
): Promise<ConversationMessage[]> {
  if (!messageId) {
    return [];
  }

  const { data: target } = await db
    .from("messages")
    .select("id, sender_id, body, body_safety_status, created_at, deleted_at, status")
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .maybeSingle();

  if (!target) {
    return [];
  }

  const createdAt = target.created_at as string;

  const [{ data: before }, { data: after }] = await Promise.all([
    db
      .from("messages")
      .select("id, sender_id, body, body_safety_status, created_at, deleted_at, status")
      .eq("conversation_id", conversationId)
      .lt("created_at", createdAt)
      .order("created_at", { ascending: false })
      .limit(5),
    db
      .from("messages")
      .select("id, sender_id, body, body_safety_status, created_at, deleted_at, status")
      .eq("conversation_id", conversationId)
      .gt("created_at", createdAt)
      .order("created_at", { ascending: true })
      .limit(5)
  ]);

  const rows = [...(before ?? []).reverse(), target, ...(after ?? [])];

  return rows.map((msg) => {
    const deleted =
      Boolean(msg.deleted_at) ||
      msg.status === "deleted" ||
      msg.status === "deleted_by_moderator";
    const removedByMod =
      msg.status === "deleted_by_moderator" ||
      (msg.deleted_at && msg.body_safety_status === "hidden");

    return {
      id: msg.id as string,
      senderId: msg.sender_id as string,
      body: deleted
        ? removedByMod
          ? "[Tin đã bị gỡ]"
          : "[Tin đã xóa]"
        : (msg.body as string),
      bodySafetyStatus:
        msg.body_safety_status as ConversationMessage["bodySafetyStatus"],
      createdAt: msg.created_at as string,
      isOwn: false,
      displayState: removedByMod
        ? ("removed_by_moderator" as const)
        : deleted
          ? ("deleted" as const)
          : ("normal" as const)
    };
  });
}

export async function getOpenMessageReports(): Promise<MessageModerationReportItem[]> {
  const db = await createClient();

  const { data, error } = await db
    .from("message_reports")
    .select(
      `id, reason_code, detail, status, created_at, conversation_id, message_id, message_request_id,
       reporter:profiles!message_reports_reporter_id_fkey(id, display_name, username),
       reported:profiles!message_reports_reported_user_id_fkey(id, display_name, username),
       messages(body),
       message_requests(first_message)`
    )
    .in("status", ["open", "reviewing"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    return [];
  }

  const items: MessageModerationReportItem[] = [];

  for (const row of data) {
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
    };
    const messageRaw = row.messages as unknown;
    const messageRow = (Array.isArray(messageRaw) ? messageRaw[0] : messageRaw) as
      | { body: string }
      | null;
    const requestRaw = row.message_requests as unknown;
    const requestRow = (Array.isArray(requestRaw) ? requestRaw[0] : requestRaw) as
      | { first_message: string }
      | null;

    const contextMessages =
      row.conversation_id && row.message_id
        ? await loadReportContext(
            db,
            row.conversation_id as string,
            row.message_id as string
          )
        : [];

    const priorReportCount = await countPriorReports(
      db,
      reported.id
    );

    items.push({
      id: row.id as string,
      reasonCode: row.reason_code as MessageModerationReportItem["reasonCode"],
      detail: row.detail as string | null,
      status: row.status as string,
      createdAt: row.created_at as string,
      reporter: {
        id: reporter.id,
        displayName: reporter.display_name,
        username: reporter.username
      },
      reportedUser: {
        id: reported.id,
        displayName: reported.display_name,
        username: reported.username
      },
      messagePreview: messageRow?.body ?? requestRow?.first_message ?? null,
      conversationId: (row.conversation_id as string) ?? "",
      contextMessages,
      priorReportCount
    });
  }

  return items;
}
