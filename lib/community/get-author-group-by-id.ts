import { createClient } from "@/lib/supabase/server";
import type { AuthorCommunityGroup } from "@/types/community";

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getAuthorGroupById(authorId: string): Promise<{
  group: AuthorCommunityGroup | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("creator_profiles")
      .select(
        "id, pen_name, profiles(display_name, username, avatar_url), stories(count)"
      )
      .eq("id", authorId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return { group: null, error: null };
    }

    const profile = firstRelation(
      (data as { profiles: unknown }).profiles as
        | {
            display_name: string | null;
            username: string | null;
            avatar_url: string | null;
          }
        | {
            display_name: string | null;
            username: string | null;
            avatar_url: string | null;
          }[]
        | null
    );
    const storyRelation = (data as { stories: { count: number }[] | { count: number } | null })
      .stories;
    const storyCount = Array.isArray(storyRelation)
      ? (storyRelation[0]?.count ?? 0)
      : (storyRelation?.count ?? 0);

    return {
      error: null,
      group: {
        id: `author-group-${data.id}`,
        authorId: data.id,
        authorUsername: profile?.username?.trim().toLowerCase() ?? null,
        name:
          data.pen_name ?? profile?.display_name ?? profile?.username ?? "Tác giả",
        avatarUrl: profile?.avatar_url ?? null,
        storyCount,
        followerCount: 200,
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
