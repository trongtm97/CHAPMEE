import { createClient } from "@/lib/data/server";

export type CommunityReviewStatus = "pending" | "rejected" | "hidden";

export type CommunityPostForReview = {
  id: string;
  type: "discussion" | "review" | "poll_placeholder" | "challenge";
  title: string;
  content: string;
  authorName: string | null;
  relatedStoryTitle: string | null;
  relatedStorySlug: string | null;
  relatedStoryPublicCode: string | null;
  createdAt: string;
  status: CommunityReviewStatus;
};

export type CommunityPostsForReviewData = {
  posts: CommunityPostForReview[];
  error: string | null;
};

type CommunityPostRow = {
  id: string;
  type: CommunityPostForReview["type"];
  title: string | null;
  content: string | null;
  content_storage_type?: string | null;
  content_object_key?: string | null;
  content_hash?: string | null;
  content_preview?: string | null;
  created_at: string;
  status: CommunityReviewStatus;
  profiles:
    | { display_name: string | null; username: string | null }
    | { display_name: string | null; username: string | null }[]
    | null;
  stories:
    | { title: string | null; slug: string | null; public_code: string | null }
    | { title: string | null; slug: string | null; public_code: string | null }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function resolveContent(row: CommunityPostRow): string {
  if (row.content && row.content.trim().length > 0) {
    return row.content;
  }
  return (row.content_preview ?? "").trim();
}

export async function getPendingCommunityPosts(
  status: CommunityReviewStatus = "pending"
): Promise<CommunityPostsForReviewData> {
  try {
    const db = await createClient();
    const { data, error } = await db
      .from("community_posts")
      .select(
        "id, type, title, content, content_storage_type, content_object_key, content_hash, content_preview, created_at, status, profiles!community_posts_user_id_fkey(display_name, username), stories(title, slug, public_code)"
      )
      .eq("status", status)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      throw new Error(error.message);
    }

    return {
      error: null,
      posts: ((data ?? []) as unknown as CommunityPostRow[]).map((post) => {
        const author = firstRelation(post.profiles);
        const story = firstRelation(post.stories);

        return {
          id: post.id,
          type: post.type,
          title: post.title ?? "",
          content: resolveContent(post),
          authorName:
            author?.display_name ?? author?.username ?? "Doc gia ChapMee",
          relatedStoryTitle: story?.title ?? null,
          relatedStorySlug: story?.slug ?? null,
          relatedStoryPublicCode: story?.public_code ?? null,
          createdAt: post.created_at,
          status: post.status
        };
      })
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Khong the tai bai cong dong cho duyet.",
      posts: []
    };
  }
}
