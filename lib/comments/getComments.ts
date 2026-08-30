import { createClient } from "@/lib/data/server";
import { resolveProfileAvatarUrlForUser } from "@/lib/profile/resolve-profile-avatar";
import { getPublicVerificationBadges } from "@/lib/verification/get-user-verification";
import type { PublicVerificationBadge } from "@/types/verification";

export type CommentTarget = {
  storyId: string;
  episodeId?: string | null;
  /** Story page: include chapter + reels comments (not community posts). */
  aggregateStoryComments?: boolean;
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
  username: string | null;
  avatarUrl: string;
  verification: PublicVerificationBadge | null;
  canDelete: boolean;
  isVip: boolean;
  isPinned?: boolean;
  sourceLabel?: string | null;
};

type CommentRow = {
  id: string;
  user_id: string;
  content: string | null;
  created_at: string;
  episode_id?: string | null;
  content_storage_type?: string | null;
  content_object_key?: string | null;
  content_hash?: string | null;
  content_preview?: string | null;
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
};

function resolveCommentDisplayContent(row: CommentRow): string {
  if (row.content && row.content.trim().length > 0) {
    return row.content;
  }
  return (row.content_preview ?? "").trim();
}

async function resolveVipUsers(userIds: string[]) {
  if (userIds.length === 0) return new Set<string>();
  const db = await createClient();
  const { data } = await db
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
  const db = await createClient();
  const {
    data: { user }
  } = await db.auth.getUser();

  return user?.id ?? null;
}

export async function getCommunityPostComments(target: CommunityPostCommentTarget) {
  const db = await createClient();
  const currentUserId = await getCurrentCommentUserId();
  const { data, error } = await db
    .from("comments")
    .select(
      "id, user_id, content, content_storage_type, content_object_key, content_hash, content_preview, created_at, is_pinned, profiles(display_name, username, avatar_url, default_avatar_id)"
    )
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
        content: resolveCommentDisplayContent(comment),
        createdAt: comment.created_at,
        displayName: profile?.display_name ?? profile?.username ?? null,
        username: profile?.username?.trim().toLowerCase() ?? null,
        avatarUrl: resolveProfileAvatarUrlForUser(comment.user_id, profile),
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
  const db = await createClient();
  const currentUserId = await getCurrentCommentUserId();
  const limit = target.aggregateStoryComments ? 50 : 30;
  let query = db
    .from("comments")
    .select(
      "id, user_id, episode_id, content, content_storage_type, content_object_key, content_hash, content_preview, created_at, profiles(display_name, username, avatar_url, default_avatar_id)"
    )
    .eq("story_id", target.storyId)
    .eq("status", "visible")
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (target.aggregateStoryComments) {
    query = query.is("community_post_id", null);
  } else if (target.episodeId) {
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
  const episodeIds = [
    ...new Set(rows.map((row) => row.episode_id).filter((id): id is string => Boolean(id)))
  ];
  const episodeNumberById = new Map<string, number>();

  if (episodeIds.length > 0) {
    const { data: episodeRows } = await db
      .from("episodes")
      .select("id, episode_number")
      .in("id", episodeIds);

    for (const episode of episodeRows ?? []) {
      episodeNumberById.set(String(episode.id), Number(episode.episode_number));
    }
  }

  const userIds = rows.map((comment) => comment.user_id);
  const [vipUsers, verificationByUser] = await Promise.all([
    resolveVipUsers(userIds),
    getPublicVerificationBadges(userIds)
  ]);

  return {
    comments: rows.map((comment) => {
      const profile = firstRelation(comment.profiles);
      const episodeNumber = comment.episode_id
        ? episodeNumberById.get(comment.episode_id)
        : undefined;

      return {
        id: comment.id,
        userId: comment.user_id,
        content: resolveCommentDisplayContent(comment),
        createdAt: comment.created_at,
        displayName: profile?.display_name ?? profile?.username ?? null,
        username: profile?.username?.trim().toLowerCase() ?? null,
        avatarUrl: resolveProfileAvatarUrlForUser(comment.user_id, profile),
        verification: verificationByUser.get(comment.user_id) ?? null,
        canDelete: currentUserId === comment.user_id,
        isVip: vipUsers.has(comment.user_id),
        sourceLabel:
          episodeNumber !== undefined ? `Chương ${episodeNumber}` : null
      };
    }),
    currentUserId,
    error: null
  };
}
