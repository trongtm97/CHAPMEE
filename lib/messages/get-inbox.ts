import { profileAvatarUrlFromRow } from "@/lib/profile/map-profile-row";
import { createClient } from "@/lib/data/server";
import type { InboxConversationItem } from "@/types/messages";

type ParticipantRow = {
  conversation_id: string;
  is_muted: boolean;
  is_archived: boolean;
  last_read_at: string | null;
  conversations: {
    id: string;
    status: string;
    last_message_at: string | null;
    last_message_preview: string | null;
  } | null;
};

export async function getInboxConversations(
  userId: string,
  includeArchived = false
): Promise<InboxConversationItem[]> {
  const db = await createClient();

  const { data: rows, error } = await db
    .from("conversation_participants")
    .select(
      `conversation_id, is_muted, is_archived, last_read_at,
       conversations!inner(id, status, last_message_at, last_message_preview)`
    )
    .eq("user_id", userId)
    .is("hidden_at", null)
    .eq("conversations.status", "active")
    .order("last_message_at", {
      ascending: false,
      foreignTable: "conversations",
      nullsFirst: false
    });

  if (error || !rows?.length) {
    return [];
  }

  const normalizedRows = (rows ?? []).map((row) => {
    const convRaw = row.conversations as unknown;
    const conversations = (Array.isArray(convRaw) ? convRaw[0] : convRaw) as ParticipantRow["conversations"];
    return { ...row, conversations } as ParticipantRow;
  });

  const filtered = normalizedRows.filter((row) =>
    includeArchived ? true : !row.is_archived
  );

  const conversationIds = filtered.map((row) => row.conversation_id);
  if (!conversationIds.length) {
    return [];
  }

  const { data: others } = await db
    .from("conversation_participants")
    .select(
      `conversation_id, user_id,
       profiles!conversation_participants_user_id_fkey(id, display_name, username, avatar_url)`
    )
    .in("conversation_id", conversationIds)
    .neq("user_id", userId);

  type OtherRow = {
    conversation_id: string;
    profiles?: {
      id: string;
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
    } | null;
  };

  const otherByConv = new Map<string, OtherRow>();
  for (const row of (others ?? []) as unknown as OtherRow[]) {
    otherByConv.set(row.conversation_id, row);
  }

  const items: InboxConversationItem[] = [];

  for (const row of filtered) {
    const conv = row.conversations;
    if (!conv) continue;

    const other = otherByConv.get(row.conversation_id);
    const profileRaw = other?.profiles as unknown;
    const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as
      | {
          id: string;
          display_name: string | null;
          username: string | null;
          avatar_url: string | null;
        }
      | null
      | undefined;

    if (!profile) continue;

    let unreadCount = 0;
    if (conv.last_message_at) {
      const { count } = await db
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .neq("sender_id", userId)
        .gt("created_at", row.last_read_at ?? "1970-01-01")
        .is("deleted_at", null);

      unreadCount = count ?? 0;
    }

    items.push({
      id: conv.id,
      otherUser: {
        id: profile.id,
        displayName: profile.display_name ?? profile.username ?? "Người dùng",
        username: profile.username,
        avatarUrl: profileAvatarUrlFromRow(profile)
      },
      lastMessagePreview: conv.last_message_preview,
      lastMessageAt: conv.last_message_at,
      unreadCount,
      isMuted: row.is_muted,
      isArchived: row.is_archived
    });
  }

  return items;
}

/** @deprecated Dùng getUnreadMessageCount từ get-unread-count.ts */
export async function getMessageUnreadCount(userId: string): Promise<number> {
  const { getUnreadMessageCount } = await import("@/lib/messages/get-unread-count");
  return getUnreadMessageCount(userId);
}
