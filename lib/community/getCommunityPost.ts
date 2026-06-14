import { createClient } from "@/lib/data/server";
import type { CommunityPost, CommunityPostType } from "@/lib/community/getCommunityFeed";
import { resolveProfileAvatarUrlForUser } from "@/lib/profile/resolve-profile-avatar";
import { loadCommunityPostContentObject } from "@/lib/storage/community-posts-content-storage";

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
    | { title: string | null; slug: string | null; public_code: string | null }
    | { title: string | null; slug: string | null; public_code: string | null }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function resolvePostDisplayContent(
  row: CommunityPostRow
): { content: string; title: string | null } {
  // For S3-stored posts, body content is on S3; title lives in S3 too.
  // Fall back to DB column / preview if present (legacy db rows).
  if (row.content && row.content.trim().length > 0) {
    return { content: row.content, title: row.title };
  }
  return {
    content: (row.content_preview ?? "").trim(),
    title: row.title
  };
}

export async function getCommunityPost(
  postId: string
): Promise<{ post: CommunityPost | null; error: string | null }> {
  try {
    const db = await createClient();
    const { data, error } = await db
      .from("community_posts")
      .select(
        "id, type, title, content, content_storage_type, content_object_key, content_hash, content_preview, created_at, story_id, user_id, profiles!community_posts_user_id_fkey(display_name, username, avatar_url, default_avatar_id), stories(title, slug, public_code)"
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
    const display = resolvePostDisplayContent(row);

    if (
      row.content_storage_type === "s3" &&
      row.content_object_key
    ) {
      try {
        const loaded = await loadCommunityPostContentObject({
          expectedHash: row.content_hash ?? undefined,
          objectKey: row.content_object_key
        });
        display.content = loaded.envelope.content;
        display.title = loaded.envelope.title;
      } catch (s3Error) {
        // Keep preview as fallback if S3 fetch fails.
        display.content = (row.content_preview ?? "").trim();
      }
    }

    return {
      error: null,
      post: {
          id: row.id,
          type: row.type,
          title: display.title ?? "",
          contentPreview: display.content,
          authorName:
            author?.display_name ?? author?.username ?? "Độc giả ChapMee",
          authorUsername: author?.username?.trim().toLowerCase() ?? null,
          authorAvatarUrl: resolveProfileAvatarUrlForUser(row.user_id, author),
          authorUserId: row.user_id ?? null,
          relatedStoryTitle: story?.title ?? null,
          relatedStorySlug: story?.slug ?? null,
          relatedStoryPublicCode: story?.public_code ?? null,
          storyId: row.story_id,
          creatorId: null,
          creatorName: null,
          creatorUsername: null,
          creatorUserId: null,
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
