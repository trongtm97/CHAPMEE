import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/supabase-selects";
import { resolveCreatorRowName } from "@/lib/creator/resolve-creator-row-name";
import { createClient } from "@/lib/supabase/server";
import type { StoryCommunityGroup } from "@/types/community";

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  creator_profiles:
    | { id: string; pen_name: string | null }
    | { id: string; pen_name: string | null }[]
    | null;
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

function badgeForStory(storyId: string, index: number): StoryCommunityGroup["badge"] {
  const mod = hashString(storyId) % 5;

  if (mod === 0) {
    return "author_reply";
  }

  if (mod === 1) {
    return "new_chapter";
  }

  if (index === 0) {
    return "hot";
  }

  return mod === 2 ? "hot" : null;
}

function statusLineForStory(
  storyId: string,
  todayCount: number,
  badge: StoryCommunityGroup["badge"]
) {
  if (badge === "author_reply") {
    return "Tác giả vừa trả lời";
  }

  if (badge === "new_chapter") {
    return "Mới có chương";
  }

  if (todayCount > 0) {
    return `${todayCount} thảo luận hôm nay`;
  }

  const comments = 20 + (hashString(storyId) % 180);

  return `${comments} bình luận mới`;
}

export async function getStoryGroups(): Promise<{
  groups: StoryCommunityGroup[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stories")
      .select(`id, title, slug, cover_url, ${CREATOR_PROFILE_STORY_JOIN}`)
      .eq("visibility", "public")
      .in("status", ["approved", "published"])
      .order("published_at", { ascending: false })
      .limit(16);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as unknown as StoryRow[];
    const storyIds = rows.map((row) => row.id);
    const postCountByStory = new Map<string, number>();

    if (storyIds.length > 0) {
      const { data: posts } = await supabase
        .from("community_posts")
        .select("story_id")
        .in("story_id", storyIds)
        .eq("status", "approved");

      for (const post of posts ?? []) {
        if (!post.story_id) {
          continue;
        }

        postCountByStory.set(
          post.story_id,
          (postCountByStory.get(post.story_id) ?? 0) + 1
        );
      }
    }

    const groups: StoryCommunityGroup[] = rows.map((row, index) => {
      const creator = firstRelation(row.creator_profiles);
      const todayPostCount = postCountByStory.get(row.id) ?? 0;
      const badge = badgeForStory(row.id, index);
      const memberCount = 80 + (hashString(row.id) % 420);

      return {
        id: `story-group-${row.id}`,
        storyId: row.id,
        name: row.title,
        slug: row.slug,
        coverUrl: row.cover_url,
        authorName: resolveCreatorRowName(creator),
        memberCount,
        todayPostCount,
        badge,
        statusLine: statusLineForStory(row.id, todayPostCount, badge),
        hotScore: memberCount + todayPostCount * 8 + (badge === "hot" ? 40 : 0)
      };
    });

    return {
      error: null,
      groups: groups.sort((a, b) => b.hotScore - a.hotScore).slice(0, 8)
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Không thể tải nhóm truyện.",
      groups: []
    };
  }
}
