import { createClient } from "@/lib/supabase/server";
import { createExcerpt } from "@/lib/text/createExcerpt";
import type { ProfilePrivacySettings, PublicWorkItem } from "@/types/public-profile";

const PAGE_SIZE = 20;

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  cover_url: string | null;
  is_completed: boolean | null;
  status: string;
  creator_profiles: { pen_name: string | null } | { pen_name: string | null }[] | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function statusLabel(isCompleted: boolean | null, status: string) {
  if (isCompleted) {
    return "Hoàn thành";
  }
  if (status === "published" || status === "approved") {
    return "Đang ra";
  }
  return "Đang soạn";
}

export async function getPublicWorksForUser(
  userId: string,
  creatorId: string | null,
  privacy: ProfilePrivacySettings,
  page = 1,
  includeReadCount = true
): Promise<{ items: PublicWorkItem[]; total: number }> {
  if (!privacy.showCreatorWorks || !creatorId) {
    return { items: [], total: 0 };
  }

  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { count } = await supabase
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", creatorId)
    .eq("visibility", "public")
    .in("status", ["published", "approved"]);

  const { data, error } = await supabase
    .from("stories")
    .select(
      "id, title, slug, hook, cover_url, is_completed, status, creator_profiles(pen_name)"
    )
    .eq("creator_id", creatorId)
    .eq("visibility", "public")
    .in("status", ["published", "approved"])
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error || !data) {
    return { items: [], total: count ?? 0 };
  }

  const storyIds = (data as StoryRow[]).map((row) => row.id);
  const episodeCounts = new Map<string, number>();

  if (storyIds.length > 0) {
    const { data: episodes } = await supabase
      .from("episodes")
      .select("story_id")
      .in("story_id", storyIds)
      .in("status", ["published", "approved"]);

    for (const episode of episodes ?? []) {
      const storyId = String((episode as { story_id: string }).story_id);
      episodeCounts.set(storyId, (episodeCounts.get(storyId) ?? 0) + 1);
    }
  }

  const items: PublicWorkItem[] = (data as unknown as StoryRow[]).map((row) => {
    const creator = firstRelation(row.creator_profiles);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.hook ? createExcerpt(row.hook, 120) : null,
      coverUrl: row.cover_url,
      chapterCount: episodeCounts.get(row.id) ?? 0,
      readCount: includeReadCount ? null : null,
      statusLabel: statusLabel(row.is_completed, row.status),
      authorName: creator?.pen_name ?? null
    };
  });

  return { items, total: count ?? items.length };
}
