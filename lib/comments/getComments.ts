import { createClient } from "@/lib/supabase/server";
import { getPublicVerificationBadges } from "@/lib/verification/get-user-verification";
import type { PublicVerificationBadge } from "@/types/verification";

export type CommentTarget = {
  storyId: string;
  episodeId?: string | null;
};

export type CommunityPostCommentTarget = {
  communityPostId: string;
};

export type CommentView = {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  displayName: string | null;
  verification: PublicVerificationBadge | null;
  canDelete: boolean;
  isVip: boolean;
  isPinned?: boolean;
};

type CommentRow = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles:
    | { display_name: string | null; username: string | null }
    | { display_name: string | null; username: string | null }[]
    | null;
};

async function resolveVipUsers(userIds: string[]) {
  if (userIds.length === 0) return new Set<string>();
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_subscriptions")
    .select("user_id, status, expires_at")
    .in("user_id", userIds)
    .eq("status", "active");
  const now = Date.now();
  return new Set(
    (data ?? [])
      .filter((row) => {
        const expiresAt = row.expires_at ? new Date(String(row.expires_at)).getTime() : 0;
        return expiresAt > now;
      })
      .map((row) => String(row.user_id))
  );
}

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getCurrentCommentUserId() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function getCommunityPostComments(target: CommunityPostCommentTarget) {
  const supabase = await createClient();
  const currentUserId = await getCurrentCommentUserId();
  const { data, error } = await supabase
    .from("comments")
    .select("id, user_id, content, created_at, is_pinned, profiles(display_name, username)")
    .eq("community_post_id", target.communityPostId)
    .eq("status", "visible")
    .is("parent_id", null)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return {
      comments: [],
      currentUserId,
      error: error.message.includes("community_post_id")
        ? null
        : error.message
    };
  }

  const rows = (data ?? []) as unknown as (CommentRow & { is_pinned?: boolean })[];
  const userIds = rows.map((comment) => comment.user_id);
  const [vipUsers, verificationByUser] = await Promise.all([
    resolveVipUsers(userIds),
    getPublicVerificationBadges(userIds)
  ]);

  return {
    comments: rows.map((comment) => {
      const profile = firstRelation(comment.profiles);

      return {
        id: comment.id,
        userId: comment.user_id,
        content: comment.content,
        createdAt: comment.created_at,
        displayName: profile?.display_name ?? profile?.username ?? null,
        verification: verificationByUser.get(comment.user_id) ?? null,
        canDelete: currentUserId === comment.user_id,
        isVip: vipUsers.has(comment.user_id),
        isPinned: Boolean(comment.is_pinned)
      };
    }),
    currentUserId,
    error: null
  };
}

export async function getComments(target: CommentTarget) {
  const supabase = await createClient();
  const currentUserId = await getCurrentCommentUserId();
  let query = supabase
    .from("comments")
    .select(
      "id, user_id, content, created_at, profiles(display_name, username)"
    )
    .eq("story_id", target.storyId)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(30);

  if (target.episodeId) {
    query = query.eq("episode_id", target.episodeId);
  } else {
    query = query.is("episode_id", null);
  }

  const { data, error } = await query;

  if (error) {
    return {
      comments: [],
      currentUserId,
      error: error.message
    };
  }

  const rows = (data ?? []) as unknown as CommentRow[];
  const userIds = rows.map((comment) => comment.user_id);
  const [vipUsers, verificationByUser] = await Promise.all([
    resolveVipUsers(userIds),
    getPublicVerificationBadges(userIds)
  ]);

  return {
    comments: rows.map((comment) => {
      const profile = firstRelation(comment.profiles);

      return {
        id: comment.id,
        userId: comment.user_id,
        content: comment.content,
        createdAt: comment.created_at,
        displayName: profile?.display_name ?? profile?.username ?? null,
        verification: verificationByUser.get(comment.user_id) ?? null,
        canDelete: currentUserId === comment.user_id,
        isVip: vipUsers.has(comment.user_id)
      };
    }),
    currentUserId,
    error: null
  };
}
