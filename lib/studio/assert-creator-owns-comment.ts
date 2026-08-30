import { notFound } from "next/navigation";
import { createClient } from "@/lib/data/server";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";

export type CreatorOwnedComment = {
  id: string;
  user_id: string;
  story_id: string | null;
  episode_id: string | null;
  community_post_id: string | null;
  status: string;
  is_pinned: boolean;
};

type CommentOwnershipRow = {
  id: string;
  user_id: string;
  story_id: string | null;
  episode_id: string | null;
  community_post_id: string | null;
  status: string;
  is_pinned: boolean;
  stories: { creator_id: string } | { creator_id: string }[] | null;
  community_posts:
    | {
        creator_id: string | null;
        story_id: string | null;
        stories: { creator_id: string } | { creator_id: string }[] | null;
      }
    | {
        creator_id: string | null;
        story_id: string | null;
        stories: { creator_id: string } | { creator_id: string }[] | null;
      }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function creatorOwnsCommentRow(
  row: CommentOwnershipRow,
  creatorProfileId: string
) {
  const story = firstRelation(row.stories);
  if (story?.creator_id === creatorProfileId) {
    return true;
  }

  const post = firstRelation(row.community_posts);
  if (!post) {
    return false;
  }

  if (post.creator_id === creatorProfileId) {
    return true;
  }

  const postStory = firstRelation(post.stories);
  return postStory?.creator_id === creatorProfileId;
}

export async function assertCreatorOwnsComment(
  creatorProfile: CreatorProfile,
  commentId: string
): Promise<CreatorOwnedComment> {
  const db = await createClient();
  const { data, error } = await db
    .from("comments")
    .select(
      `
      id,
      user_id,
      story_id,
      episode_id,
      community_post_id,
      status,
      is_pinned,
      stories(creator_id),
      community_posts(creator_id, story_id, stories(creator_id))
    `
    )
    .eq("id", commentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const row = data as unknown as CommentOwnershipRow | null;

  if (!row || !creatorOwnsCommentRow(row, creatorProfile.id)) {
    notFound();
  }

  return {
    id: row.id,
    user_id: row.user_id,
    story_id: row.story_id,
    episode_id: row.episode_id,
    community_post_id: row.community_post_id,
    status: row.status,
    is_pinned: Boolean(row.is_pinned)
  };
}
