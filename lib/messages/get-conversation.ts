import { profileAvatarUrlFromRow } from "@/lib/profile/map-profile-row";
import { createClient } from "@/lib/data/server";
import { getConversationMessagingState } from "@/lib/messages/get-conversation-messaging-state";
import { getMessagePrivacySettings } from "@/lib/messages/get-privacy-settings";
import { mapMessageRow } from "@/lib/messages/map-message-row";
import { markConversationRead } from "@/lib/messages/mark-conversation-read";
import type { ConversationDetail, ConversationMessage } from "@/types/messages";

export async function getConversationDetail(
  conversationId: string,
  userId: string
): Promise<ConversationDetail | null> {
  const db = await createClient();

  const { data: participant } = await db
    .from("conversation_participants")
    .select("is_muted, is_archived, last_read_at, conversations!inner(id, status)")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!participant) {
    return null;
  }

  const convRaw = participant.conversations as unknown;
  const conv = (Array.isArray(convRaw) ? convRaw[0] : convRaw) as {
    id: string;
    status: string;
  };

  const { data: otherParticipant } = await db
    .from("conversation_participants")
    .select(
      `user_id, last_read_at,
       profiles!conversation_participants_user_id_fkey(id, display_name, username, avatar_url)`
    )
    .eq("conversation_id", conversationId)
    .neq("user_id", userId)
    .maybeSingle();

  const profileRaw = otherParticipant?.profiles as unknown;
  const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as
    | {
        id: string;
        display_name: string | null;
        username: string | null;
        avatar_url: string | null;
      }
    | undefined;

  if (!profile) {
    return null;
  }

  const privacy = await getMessagePrivacySettings(userId);

  const { data: messages } = await db
    .from("messages")
    .select("id, sender_id, body, body_safety_status, created_at, deleted_at, status")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);

  const mapped = (messages ?? [])
    .map((msg) =>
      mapMessageRow(
        msg as {
          id: string;
          sender_id: string;
          body: string;
          body_safety_status: string;
          created_at: string;
          deleted_at: string | null;
          status: string;
        },
        userId,
        privacy.filterSensitiveMessages
      )
    )
    .filter((m): m is ConversationMessage => m !== null);

  await markConversationRead(conversationId, userId);

  const messaging = await getConversationMessagingState(userId, profile.id);

  return {
    id: conv.id,
    status: conv.status,
    currentUserId: userId,
    filterSensitiveMessages: privacy.filterSensitiveMessages,
    otherUser: {
      id: profile.id,
      displayName: profile.display_name ?? profile.username ?? "Người dùng",
      username: profile.username,
      avatarUrl: profileAvatarUrlFromRow(profile),
      lastReadAt: (otherParticipant?.last_read_at as string | null) ?? null
    },
    messages: mapped,
    participant: {
      isMuted: participant.is_muted as boolean,
      isArchived: participant.is_archived as boolean,
      lastReadAt: (participant.last_read_at as string | null) ?? null
    },
    messaging
  };
}
