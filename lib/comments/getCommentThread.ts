import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type CommentThreadItem = {
  id: string;
  parentId: string | null;
  authorLabel: string;
  content: string;
  createdAt: string;
  likeCount: number;
  isLiked: boolean;
  replyCount: number;
  replies: CommentThreadItem[];
  canPin: boolean;
  canDelete: boolean;
  isPinned: boolean;
};

type CommentTarget = {
  storyId: string;
  episodeId?: string | null;
};

type CommentRow = {
  id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  is_pinned?: boolean | null;
  profiles:
    | { display_name: string | null; username: string | null }
    | { display_name: string | null; username: string | null }[]
    | null;
};

type IdRow = {
  target_id?: string | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function sortComments(first: CommentThreadItem, second: CommentThreadItem) {
  if (first.isPinned !== second.isPinned) {
    return first.isPinned ? -1 : 1;
  }

  return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
}

export async function getCommentThread(target: CommentTarget) {
  const supabase = await createClient();
  const { user } = await getCurrentProfile();
  let supportsPin = true;

  let commentsData: CommentRow[] = [];
  let commentsError: string | null = null;

  const baseQueryWithPin = supabase
    .from("comments")
    .select(
      "id, user_id, parent_id, content, created_at, is_pinned, profiles(display_name, username)"
    )
    .eq("story_id", target.storyId)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(100);

  const queryWithPin = target.episodeId
    ? baseQueryWithPin.eq("episode_id", target.episodeId)
    : baseQueryWithPin.is("episode_id", null);

  const commentsResult = await queryWithPin;

  if (commentsResult.error?.message?.includes("is_pinned")) {
    supportsPin = false;
    const baseFallbackQuery = supabase
      .from("comments")
      .select("id, user_id, parent_id, content, created_at, profiles(display_name, username)")
      .eq("story_id", target.storyId)
      .eq("status", "visible")
      .order("created_at", { ascending: false })
      .limit(100);

    const fallbackQuery = target.episodeId
      ? baseFallbackQuery.eq("episode_id", target.episodeId)
      : baseFallbackQuery.is("episode_id", null);
    const fallbackResult = await fallbackQuery;

    commentsError = fallbackResult.error?.message ?? null;
    commentsData = ((fallbackResult.data ?? []) as unknown as CommentRow[]).map(
      (comment) => ({
        ...comment,
        is_pinned: false
      })
    );
  } else {
    commentsError = commentsResult.error?.message ?? null;
    commentsData = (commentsResult.data ?? []) as unknown as CommentRow[];
  }

  if (commentsError) {
    return {
      comments: [] as CommentThreadItem[],
      currentUserId: user?.id ?? null,
      error: commentsError
    };
  }

  const rows = commentsData;
  const commentIds = rows.map((comment) => comment.id);
  const likeCountByComment = new Map<string, number>();
  const likedIds = new Set<string>();

  if (commentIds.length > 0) {
    const [likesResult, currentUserLikesResult] = await Promise.all([
      supabase
        .from("reactions")
        .select("target_id")
        .eq("target_type", "comment")
        .eq("reaction_type", "like")
        .in("target_id", commentIds),
      user
        ? supabase
            .from("reactions")
            .select("target_id")
            .eq("user_id", user.id)
            .eq("target_type", "comment")
            .eq("reaction_type", "like")
            .in("target_id", commentIds)
        : Promise.resolve({ data: [] })
    ]);

    for (const reaction of (likesResult.data ?? []) as IdRow[]) {
      const targetId = reaction.target_id;

      if (!targetId) {
        continue;
      }

      likeCountByComment.set(targetId, (likeCountByComment.get(targetId) ?? 0) + 1);
    }

    for (const reaction of (currentUserLikesResult.data ?? []) as IdRow[]) {
      if (reaction.target_id) {
        likedIds.add(reaction.target_id);
      }
    }
  }

  let canPinComments = false;

  if (user) {
    const authContext = await getCurrentAuthContext();
    canPinComments = Boolean(
      authContext?.permissions.includes("comment.moderate") ||
        authContext?.permissions.includes("comment.pin")
    );
  }

  if (!canPinComments && user) {
    const { data: storyRow } = await supabase
      .from("stories")
      .select("creator_profiles!inner(user_id)")
      .eq("id", target.storyId)
      .maybeSingle();

    const creatorProfile = firstRelation(
      (storyRow as { creator_profiles?: { user_id: string | null } | { user_id: string | null }[] | null } | null)
        ?.creator_profiles
    );
    canPinComments = creatorProfile?.user_id === user.id;
  }

  const mapped = rows.map((comment) => {
    const profileRow = firstRelation(comment.profiles);

    return {
      id: comment.id,
      parentId: comment.parent_id,
      authorLabel:
        profileRow?.display_name ?? profileRow?.username ?? "Độc giả ChapMee",
      content: comment.content,
      createdAt: comment.created_at,
      likeCount: likeCountByComment.get(comment.id) ?? 0,
      isLiked: likedIds.has(comment.id),
      replyCount: 0,
      replies: [],
      canPin: supportsPin && canPinComments,
      canDelete: user?.id === comment.user_id,
      isPinned: supportsPin ? Boolean(comment.is_pinned) : false
    } satisfies CommentThreadItem;
  });

  const repliesByParent = new Map<string, CommentThreadItem[]>();
  const topLevel: CommentThreadItem[] = [];

  for (const comment of mapped) {
    if (comment.parentId) {
      const replies = repliesByParent.get(comment.parentId) ?? [];
      replies.push(comment);
      repliesByParent.set(comment.parentId, replies);
    } else {
      topLevel.push(comment);
    }
  }

  for (const comment of topLevel) {
    const replies = repliesByParent.get(comment.id) ?? [];
    replies.sort(sortComments);
    comment.replies = replies;
    comment.replyCount = replies.length;
  }

  topLevel.sort(sortComments);

  return {
    comments: topLevel,
    currentUserId: user?.id ?? null,
    error: null
  };
}
