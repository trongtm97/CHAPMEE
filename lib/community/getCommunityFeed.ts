import { createClient } from "@/lib/supabase/server";

export type CommunityPostType =
  | "discussion"
  | "review"
  | "poll_placeholder"
  | "challenge";

export type CommunityPost = {
  id: string;
  type: CommunityPostType;
  title: string;
  contentPreview: string;
  authorName: string | null;
  relatedStoryTitle: string | null;
  relatedStorySlug: string | null;
  storyId: string | null;
  creatorId: string | null;
  creatorName: string | null;
  createdAt: string;
  commentCount: number;
};

export type CommunityFeedData = {
  posts: CommunityPost[];
  error: string | null;
  isLoggedIn: boolean;
};

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
    | {
        title: string | null;
        slug: string | null;
        creator_id: string | null;
        creator_profiles:
          | { id: string; pen_name: string | null }
          | { id: string; pen_name: string | null }[]
          | null;
      }
    | {
        title: string | null;
        slug: string | null;
        creator_id: string | null;
        creator_profiles:
          | { id: string; pen_name: string | null }
          | { id: string; pen_name: string | null }[]
          | null;
      }[]
    | null;
};

type CommentRow = {
  story_id: string | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function preview(content: string) {
  return content.length > 180 ? `${content.slice(0, 180).trim()}...` : content;
}

function isMissingAuthSession(errorMessage: string) {
  return errorMessage.toLowerCase().includes("auth session missing");
}

export async function getCommunityFeed(): Promise<CommunityFeedData> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError && !isMissingAuthSession(userError.message)) {
      throw userError;
    }
    const { data, error } = await supabase
      .from("community_posts")
      .select(
        "id, type, title, content, created_at, story_id, profiles!community_posts_user_id_fkey(display_name, username), stories(title, slug, creator_id, creator_profiles(id, pen_name))"
      )
      .eq("status", "approved")
      .in("type", ["discussion", "review", "poll_placeholder", "challenge"])
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as unknown as CommunityPostRow[];
    const storyIds = rows
      .map((post) => post.story_id)
      .filter((storyId): storyId is string => Boolean(storyId));
    const commentCountByStory = new Map<string, number>();

    if (storyIds.length > 0) {
      const { data: comments } = await supabase
        .from("comments")
        .select("story_id")
        .in("story_id", storyIds)
        .eq("status", "visible");

      for (const comment of (comments ?? []) as CommentRow[]) {
        if (!comment.story_id) {
          continue;
        }

        commentCountByStory.set(
          comment.story_id,
          (commentCountByStory.get(comment.story_id) ?? 0) + 1
        );
      }
    }

    return {
      error: null,
      isLoggedIn: Boolean(user),
      posts: rows.map((post) => {
        const author = firstRelation(post.profiles);
        const story = firstRelation(post.stories);
        const storyCreator = story
          ? firstRelation(story.creator_profiles)
          : null;

        return {
          id: post.id,
          type: post.type,
          title: post.title,
          contentPreview: preview(post.content),
          authorName:
            author?.display_name ?? author?.username ?? "Độc giả ChapMee",
          relatedStoryTitle: story?.title ?? null,
          relatedStorySlug: story?.slug ?? null,
          storyId: post.story_id,
          creatorId: story?.creator_id ?? storyCreator?.id ?? null,
          creatorName: storyCreator?.pen_name ?? null,
          createdAt: post.created_at,
          commentCount: post.story_id
            ? (commentCountByStory.get(post.story_id) ?? 0)
            : 0
        };
      })
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải cộng đồng.",
      isLoggedIn: false,
      posts: []
    };
  }
}
