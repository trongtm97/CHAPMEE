import type { CommunityPost, CommunityPostType } from "@/lib/community/getCommunityFeed";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { resolveProfileAvatarUrlForUser } from "@/lib/profile/resolve-profile-avatar";
import { createClient } from "@/lib/data/server";

type CommunityPostRow = {
  id: string;
  type: CommunityPostType;
  title: string;
  content: string;
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

export function previewCommunityContent(content: string) {
  return content.length > 180 ? `${content.slice(0, 180).trim()}...` : content;
}

export function mapCommunityPostRows(rows: CommunityPostRow[]): CommunityPost[] {
  return rows.map((post) => {
    const author = firstRelation(post.profiles);
    const story = firstRelation(post.stories);
    const storyCreator = story ? firstRelation(story.creator_profiles) : null;

    return {
      id: post.id,
      type: post.type,
      title: post.title,
      contentPreview: previewCommunityContent(post.content),
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
      commentCount: 0
    };
  });
}

export async function attachCommentCounts(posts: CommunityPost[]) {
  const storyIds = posts
    .map((post) => post.storyId)
    .filter((storyId): storyId is string => Boolean(storyId));

  if (!storyIds.length) {
    return posts;
  }

  const db = await createClient();
  const { data: comments } = await db
    .from("comments")
    .select("story_id")
    .in("story_id", storyIds)
    .eq("status", "visible");

  const commentCountByStory = new Map<string, number>();

  for (const comment of (comments ?? []) as CommentRow[]) {
    if (!comment.story_id) {
      continue;
    }

    commentCountByStory.set(
      comment.story_id,
      (commentCountByStory.get(comment.story_id) ?? 0) + 1
    );
  }

  return posts.map((post) => ({
    ...post,
    commentCount: post.storyId
      ? (commentCountByStory.get(post.storyId) ?? 0)
      : 0
  }));
}
