import { createClient } from "@/lib/supabase/server";
import type { AuthorCommunityGroup } from "@/types/community";

type CreatorRow = {
  id: string;
  pen_name: string | null;
  profiles:
    | { display_name: string | null; username: string | null; avatar_url: string | null }
    | { display_name: string | null; username: string | null; avatar_url: string | null }[]
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
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("creator_profiles")
      .select(
        "id, pen_name, profiles(display_name, username, avatar_url), stories(count)"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as unknown as CreatorRow[];

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
        name,
        avatarUrl: profile?.avatar_url ?? null,
        storyCount,
        followerCount: 120 + (hashString(row.id) % 800),
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
