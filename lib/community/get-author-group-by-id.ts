import { getCreatorFollowerCountsMap } from "@/lib/community/get-creator-follower-counts";
import { profileAvatarUrlFromRow } from "@/lib/profile/map-profile-row";
import { createClient } from "@/lib/data/server";
import type { AuthorCommunityGroup } from "@/types/community";

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getAuthorGroupById(authorId: string): Promise<{
  group: AuthorCommunityGroup | null;
  error: string | null;
}> {
  try {
    const db = await createClient();
    const { data, error } = await db
      .from("creator_profiles")
      .select(
        "id, user_id, pen_name, profiles(display_name, username, avatar_url, default_avatar_id), stories(count)"
      )
      .eq("id", authorId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return { group: null, error: null };
    }

    const row = data as {
      id: string;
      user_id: string;
      pen_name: string | null;
      profiles:
        | {
            display_name: string | null;
            username: string | null;
            avatar_url: string | null;
            default_avatar_id: number | null;
          }
        | {
            display_name: string | null;
            username: string | null;
            avatar_url: string | null;
            default_avatar_id: number | null;
          }[]
        | null;
      stories: { count: number }[] | { count: number } | null;
    };

    const profile = firstRelation(row.profiles);
    const storyRelation = row.stories;
    const storyCount = Array.isArray(storyRelation)
      ? (storyRelation[0]?.count ?? 0)
      : (storyRelation?.count ?? 0);
    const followerCounts = await getCreatorFollowerCountsMap([row.id]);

    return {
      error: null,
      group: {
        id: `author-group-${row.id}`,
        authorId: row.id,
        authorUsername: profile?.username?.trim().toLowerCase() ?? null,
        name: row.pen_name ?? profile?.display_name ?? profile?.username ?? "Tác giả",
        avatarUrl: profileAvatarUrlFromRow({ ...profile, id: row.user_id }),
        storyCount,
        followerCount: followerCounts.get(row.id) ?? 0,
        statusLine: "Nhóm tác giả",
        isReplying: true
      }
    };
  } catch (error) {
    return {
      group: null,
      error:
        error instanceof Error ? error.message : "Không thể tải nhóm tác giả."
    };
  }
}
