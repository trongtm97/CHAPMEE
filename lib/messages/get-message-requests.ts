import { profileAvatarUrlFromRow } from "@/lib/profile/map-profile-row";
import { createClient } from "@/lib/data/server";
import type { MessageRequestItem } from "@/types/messages";

export async function getPendingMessageRequests(
  recipientId: string
): Promise<MessageRequestItem[]> {
  const db = await createClient();

  const { data, error } = await db
    .from("message_requests")
    .select(
      `id, first_message, created_at, status,
       requester:profiles!message_requests_requester_id_fkey(id, display_name, username, avatar_url)`
    )
    .eq("recipient_id", recipientId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const requesterRaw = row.requester as unknown;
    const requester = (Array.isArray(requesterRaw) ? requesterRaw[0] : requesterRaw) as {
      id: string;
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
    };

    return {
      id: row.id as string,
      requester: {
        id: requester.id,
        displayName:
          requester.display_name ?? requester.username ?? "Người dùng",
        username: requester.username,
        avatarUrl: profileAvatarUrlFromRow(requester)
      },
      firstMessage: row.first_message as string,
      createdAt: row.created_at as string,
      status: row.status as MessageRequestItem["status"]
    };
  });
}
