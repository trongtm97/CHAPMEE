import { getCreatorFollowerCountsMap } from "@/lib/community/get-creator-follower-counts";
import { profileAvatarUrlFromRow } from "@/lib/profile/map-profile-row";
import { createClient } from "@/lib/data/server";
import type { AuthorCommunityGroup } from "@/types/community";

type CreatorRow = {
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

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function statusLine(authorId: string, index: number) {
  const mod = hashString(authorId) % 4;

  if (mod === 0) {
    return "Đang trả lời";
  }

  if (mod === 1) {
    return "Có poll mới";
  }

  if (mod === 2) {
    return "Vừa đăng thử thách";
  }

  return index === 0 ? "Đang trả lời" : "Có bài mới";
}

export async function getAuthorGroups(): Promise<{
  groups: AuthorCommunityGroup[];
  error: string | null;
}> {
  try {
    const db = await createClient();
    const { data, error } = await db
      .from("creator_profiles")
      .select(
        "id, user_id, pen_name, profiles(display_name, username, avatar_url, default_avatar_id), stories(count)"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as unknown as CreatorRow[];
    const followerCounts = await getCreatorFollowerCountsMap(rows.map((row) => row.id));

    const groups: AuthorCommunityGroup[] = rows.map((row, index) => {
      const profile = firstRelation(row.profiles);
      const storyRelation = row.stories;
      const storyCount = Array.isArray(storyRelation)
        ? (storyRelation[0]?.count ?? 0)
        : (storyRelation?.count ?? 0);
      const name =
        row.pen_name ?? profile?.display_name ?? profile?.username ?? "Tác giả";
      const isReplying = hashString(row.id) % 3 === 0 || index < 2;

      return {
        id: `author-group-${row.id}`,
        authorId: row.id,
        authorUsername: profile?.username?.trim().toLowerCase() ?? null,
        name,
        avatarUrl: profileAvatarUrlFromRow({ ...profile, id: row.user_id }),
        storyCount,
        followerCount: followerCounts.get(row.id) ?? 0,
        statusLine: statusLine(row.id, index),
        isReplying
      };
    });

    return {
      error: null,
      groups: groups
        .sort((a, b) => Number(b.isReplying) - Number(a.isReplying))
        .slice(0, 6)
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Không thể tải nhóm tác giả.",
      groups: []
    };
  }
}
