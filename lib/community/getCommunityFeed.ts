import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { resolveProfileAvatarUrlForUser } from "@/lib/profile/resolve-profile-avatar";
import { createClient } from "@/lib/data/server";

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
  authorUsername: string | null;
  authorAvatarUrl: string;
  /** `profiles.id` — người đăng bài. */
  authorUserId: string | null;
  relatedStoryTitle: string | null;
  relatedStorySlug: string | null;
  relatedStoryPublicCode: string | null;
  storyId: string | null;
  creatorId: string | null;
  creatorName: string | null;
  creatorUsername: string | null;
  /** `profiles.id` — tác giả truyện liên quan. */
  creatorUserId: string | null;
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
  title: string | null;
  content: string | null;
  content_storage_type?: string | null;
  content_object_key?: string | null;
  content_hash?: string | null;
  content_preview?: string | null;
  created_at: string;
  story_id: string | null;
  user_id: string;
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
  stories:
    | {
        title: string | null;
        slug: string | null;
        public_code: string | null;
        creator_id: string | null;
        creator_profiles:
          | {
              id: string;
              user_id: string | null;
              pen_name: string | null;
              profiles?: { display_name: string | null; username: string | null } | null;
            }
          | {
              id: string;
              user_id: string | null;
              pen_name: string | null;
              profiles?: { display_name: string | null; username: string | null } | null;
            }[]
          | null;
      }
    | {
        title: string | null;
        slug: string | null;
        public_code: string | null;
        creator_id: string | null;
        creator_profiles:
          | {
              id: string;
              user_id: string | null;
              pen_name: string | null;
              profiles?: { display_name: string | null; username: string | null } | null;
            }
          | {
              id: string;
              user_id: string | null;
              pen_name: string | null;
              profiles?: { display_name: string | null; username: string | null } | null;
            }[]
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
    const db = await createClient();
    const {
      data: { user },
      error: userError
    } = await db.auth.getUser();

    if (userError && !isMissingAuthSession(userError.message)) {
      throw userError;
    }
    const { data, error } = await db
      .from("community_posts")
      .select(
        "id, type, title, content, content_storage_type, content_object_key, content_hash, content_preview, created_at, story_id, user_id, profiles!community_posts_user_id_fkey(display_name, username, avatar_url, default_avatar_id), stories(title, slug, public_code, creator_id, creator_profiles(id, user_id, pen_name, profiles!creator_profiles_user_id_fkey(display_name, username)))"
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
      const { data: comments } = await db
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
          title: post.title ?? "",
          contentPreview: preview(
            (post.content && post.content.trim().length > 0
              ? post.content
              : post.content_preview) ?? ""
          ),
          authorName:
            author?.display_name ?? author?.username ?? "Độc giả ChapMee",
          authorUsername: author?.username?.trim().toLowerCase() ?? null,
          authorAvatarUrl: resolveProfileAvatarUrlForUser(post.user_id, author),
          authorUserId: post.user_id ?? null,
          relatedStoryTitle: story?.title ?? null,
          relatedStorySlug: story?.slug ?? null,
          relatedStoryPublicCode: story?.public_code ?? null,
          storyId: post.story_id,
          creatorId: story?.creator_id ?? storyCreator?.id ?? null,
          creatorName: storyCreator
            ? resolvePublicDisplayName(firstRelation(storyCreator.profiles), storyCreator)
            : null,
          creatorUsername:
            firstRelation(storyCreator?.profiles ?? null)?.username?.trim().toLowerCase() ??
            null,
          creatorUserId: storyCreator?.user_id ?? null,
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
