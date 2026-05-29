"use server";

import { createClient } from "@/lib/supabase/server";

export type BlockedUserItem = {
  blockedId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  blockedAt: string;
};

export async function getBlockedUsers(
  blockerId: string
): Promise<BlockedUserItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("message_blocks")
    .select(
      `blocked_id, created_at,
       profiles!message_blocks_blocked_id_fkey(id, display_name, username, avatar_url)`
    )
    .eq("blocker_id", blockerId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const profileRaw = row.profiles as unknown;
    const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as {
      id: string;
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
    };

    return {
      blockedId: row.blocked_id as string,
      displayName: profile.display_name ?? profile.username ?? "Người dùng",
      username: profile.username,
      avatarUrl: profile.avatar_url,
      blockedAt: row.created_at as string
    };
  });
}
