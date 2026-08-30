import { createClient } from "@/lib/data/server";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type { StudioStoryGroupShortcut } from "@/types/comments";

const POST_COUNT_SAMPLE_LIMIT = 200;

export async function getStudioStoryGroups(
  creatorProfile: CreatorProfile
): Promise<StudioStoryGroupShortcut[]> {
  const db = await createClient();
  const { data: stories, error } = await db
    .from("stories")
    .select("id, title, slug")
    .eq("creator_id", creatorProfile.id)
    .in("status", ["approved", "published", "pending"])
    .order("updated_at", { ascending: false })
    .limit(24);

  if (error || !stories?.length) {
    return [];
  }

  const storyIds = stories.map((row) => row.id);
  const postCountByStory = new Map<string, number>();

  const { data: posts } = await db
    .from("community_posts")
    .select("story_id")
    .in("story_id", storyIds)
    .eq("status", "approved")
    .limit(POST_COUNT_SAMPLE_LIMIT);

  for (const post of posts ?? []) {
    if (!post.story_id) {
      continue;
    }
    postCountByStory.set(
      post.story_id,
      (postCountByStory.get(post.story_id) ?? 0) + 1
    );
  }

  return stories.map((story) => ({
    id: `story-group-${story.id}`,
    storyId: story.id,
    name: story.title,
    slug: story.slug,
    postCount: postCountByStory.get(story.id) ?? 0,
    groupHref: `/community/story/${story.slug}`
  }));
}
