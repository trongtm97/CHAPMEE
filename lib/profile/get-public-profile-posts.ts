import { createClient } from "@/lib/data/server";
import { createExcerpt } from "@/lib/text/createExcerpt";
import type { PublicCommunityPostItem } from "@/types/public-profile";

const PAGE_SIZE = 15;

type PostRow = {
  id: string;
  type: string;
  title: string;
  content: string;
  created_at: string;
  stories:
    | { title: string | null; slug: string | null; public_code: string | null }
    | { title: string | null; slug: string | null; public_code: string | null }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getPublicCommunityPostsForUser(
  userId: string,
  page = 1,
  options?: { allowed?: boolean }
): Promise<{ items: PublicCommunityPostItem[]; total: number }> {
  if (options?.allowed === false) {
    return { items: [], total: 0 };
  }

  const db = await createClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { count } = await db
    .from("community_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "approved");

  const { data, error } = await db
    .from("community_posts")
    .select(
      "id, type, title, content, created_at, stories(title, slug, public_code)"
    )
    .eq("user_id", userId)
    .eq("status", "approved")
    .in("type", ["discussion", "review", "poll_placeholder", "challenge"])
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error || !data) {
    return { items: [], total: count ?? 0 };
  }

  const items: PublicCommunityPostItem[] = (data as unknown as PostRow[]).map((row) => {
    const story = firstRelation(row.stories);
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      excerpt: createExcerpt(row.content, 100),
      storyTitle: story?.title ?? null,
      storySlug: story?.slug ?? null,
      storyPublicCode: story?.public_code ?? null,
      createdAt: row.created_at,
      href: `/community/${row.id}`
    };
  });

  return { items, total: count ?? items.length };
}
