import { createClient } from "@/lib/supabase/server";
import type { ProfilePrivacySettings, PublicCommentItem } from "@/types/public-profile";

const PAGE_SIZE = 20;

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  stories: { title: string; slug: string } | { title: string; slug: string }[] | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getPublicCommentsForUser(
  userId: string,
  privacy: ProfilePrivacySettings,
  page = 1
): Promise<{ items: PublicCommentItem[]; total: number }> {
  if (!privacy.showPublicComments) {
    return { items: [], total: 0 };
  }

  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { count } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "visible");

  const { data, error } = await supabase
    .from("comments")
    .select("id, content, created_at, stories(title, slug)")
    .eq("user_id", userId)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error || !data) {
    return { items: [], total: count ?? 0 };
  }

  const commentIds = (data as CommentRow[]).map((row) => row.id);
  const likeCounts = new Map<string, number>();

  if (commentIds.length > 0) {
    const { data: reactions } = await supabase
      .from("reactions")
      .select("target_id")
      .eq("target_type", "comment")
      .eq("reaction_type", "like")
      .in("target_id", commentIds);

    for (const reaction of reactions ?? []) {
      const id = String((reaction as { target_id: string }).target_id);
      likeCounts.set(id, (likeCounts.get(id) ?? 0) + 1);
    }
  }

  const items: PublicCommentItem[] = [];

  for (const row of data as unknown as CommentRow[]) {
    const story = firstRelation(row.stories);
    if (!story) {
      continue;
    }
    items.push({
      id: row.id,
      content: row.content,
      storyTitle: story.title,
      storySlug: story.slug,
      likeCount: likeCounts.get(row.id) ?? 0,
      replyCount: 0,
      createdAt: row.created_at
    });
  }

  return { items, total: count ?? items.length };
}
