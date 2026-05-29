import { createClient } from "@/lib/supabase/server";
import type { StoryCommunityGroup } from "@/types/community";
import { getStoryGroups } from "@/lib/community/get-story-groups";

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getStoryGroupBySlug(slugOrId: string): Promise<{
  group: StoryCommunityGroup | null;
  story: {
    id: string;
    title: string;
    slug: string;
    coverUrl: string | null;
    authorName: string | null;
    hook: string | null;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    let { data, error } = await supabase
      .from("stories")
      .select(
        "id, title, slug, cover_url, hook, creator_profiles(id, pen_name)"
      )
      .eq("slug", slugOrId)
      .maybeSingle();

    if (!data) {
      const byId = await supabase
        .from("stories")
        .select(
          "id, title, slug, cover_url, hook, creator_profiles(id, pen_name)"
        )
        .eq("id", slugOrId)
        .maybeSingle();
      data = byId.data;
      error = byId.error;
    }

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return { group: null, story: null, error: null };
    }

    const creator = firstRelation(
      (data as { creator_profiles: unknown }).creator_profiles as
        | { pen_name: string | null }
        | { pen_name: string | null }[]
        | null
    );

    const { groups } = await getStoryGroups();
    const group =
      groups.find((item) => item.storyId === data.id) ??
      ({
        id: `story-group-${data.id}`,
        storyId: data.id,
        name: data.title,
        slug: data.slug,
        coverUrl: data.cover_url,
        authorName: creator?.pen_name ?? null,
        memberCount: 100,
        todayPostCount: 0,
        badge: null,
        statusLine: "Tham gia thảo luận",
        hotScore: 50
      } satisfies StoryCommunityGroup);

    return {
      error: null,
      group,
      story: {
        id: data.id,
        title: data.title,
        slug: data.slug,
        coverUrl: data.cover_url,
        authorName: creator?.pen_name ?? null,
        hook: data.hook
      }
    };
  } catch (error) {
    return {
      group: null,
      story: null,
      error:
        error instanceof Error ? error.message : "Không thể tải nhóm truyện."
    };
  }
}
