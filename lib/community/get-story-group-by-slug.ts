import { eq } from "drizzle-orm";
import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/postgrest-selects";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import { resolveCreatorRowName } from "@/lib/creator/resolve-creator-row-name";
import { createClient } from "@/lib/data/server";
import { db as pgDb } from "@/lib/db";
import { storyGroups as storyGroupRegistry } from "@/lib/db/schema/story-community-sync";
import type { StoryCommunityGroup } from "@/types/community";

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getStoryGroupBySlug(slugOrId: string): Promise<{
  group: StoryCommunityGroup | null;
  story: {
    id: string;
    title: string;
    slug: string;
    publicCode: string;
    coverUrl: string | null;
    authorName: string | null;
    hook: string | null;
  } | null;
  error: string | null;
}> {
  try {
    const client = await createClient();
    let { data, error } = await client
      .from("stories")
      .select(
        `id, title, slug, public_code, cover_url, hook, ${CREATOR_PROFILE_STORY_JOIN}`
      )
      .eq("slug", slugOrId)
      .maybeSingle();

    if (!data) {
      const byId = await client
        .from("stories")
        .select(
          `id, title, slug, public_code, cover_url, hook, ${CREATOR_PROFILE_STORY_JOIN}`
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

    const registryRows = await pgDb
      .select({
        memberCount: storyGroupRegistry.memberCount,
        activityCount: storyGroupRegistry.activityCount
      })
      .from(storyGroupRegistry)
      .where(eq(storyGroupRegistry.storyId, data.id))
      .limit(1);

    const registry = registryRows[0];
    const memberCount = registry?.memberCount ?? 0;
    const activityCount = registry?.activityCount ?? 0;

    const group: StoryCommunityGroup = {
      id: `story-group-${data.id}`,
      storyId: data.id,
      name: data.title,
      slug: data.slug,
      coverUrl: resolveStoryCoverUrl(data.cover_url),
      authorName: resolveCreatorRowName(creator),
      memberCount,
      todayPostCount: 0,
      badge: null,
      statusLine:
        activityCount > 0
          ? `${activityCount.toLocaleString("vi-VN")} hoạt động gần đây`
          : "Tham gia thảo luận",
      hotScore: memberCount + activityCount
    };

    return {
      error: null,
      group,
      story: {
        id: data.id,
        title: data.title,
        slug: data.slug,
        publicCode: data.public_code,
        coverUrl: resolveStoryCoverUrl(data.cover_url),
        authorName: resolveCreatorRowName(creator),
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
