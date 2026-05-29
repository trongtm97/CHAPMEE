import { createClient } from "@/lib/supabase/server";
import type { CommunityPost, CommunityPostType } from "@/lib/community/getCommunityFeed";

type CommunityPostRow = {
  id: string;
  type: CommunityPostType;
  title: string;
  content: string;
  created_at: string;
  story_id: string | null;
  profiles:
    | { display_name: string | null; username: string | null }
    | { display_name: string | null; username: string | null }[]
    | null;
  stories:
    | { title: string | null; slug: string | null }
    | { title: string | null; slug: string | null }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getCommunityPost(
  postId: string
): Promise<{ post: CommunityPost | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("community_posts")
      .select(
        "id, type, title, content, created_at, story_id, profiles!community_posts_user_id_fkey(display_name, username), stories(title, slug)"
      )
      .eq("id", postId)
      .eq("status", "approved")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return { post: null, error: null };
    }

    const row = data as unknown as CommunityPostRow;
    const author = firstRelation(row.profiles);
    const story = firstRelation(row.stories);

    return {
      error: null,
      post: {
          id: row.id,
          type: row.type,
          title: row.title,
          contentPreview: row.content,
          authorName:
            author?.display_name ?? author?.username ?? "Độc giả ChapMee",
          relatedStoryTitle: story?.title ?? null,
          relatedStorySlug: story?.slug ?? null,
          storyId: row.story_id,
          creatorId: null,
          creatorName: null,
          createdAt: row.created_at,
          commentCount: 0
        }
    };
  } catch (error) {
    return {
      post: null,
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải bài viết."
    };
  }
}
