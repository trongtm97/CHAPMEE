import { createClient } from "@/lib/supabase/server";
import type { PublicActivityItem } from "@/types/public-profile";
import type { ProfilePrivacySettings } from "@/types/public-profile";

const PAGE_SIZE = 20;

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  stories: { title: string; slug: string } | { title: string; slug: string }[] | null;
};

type CollectionRow = {
  id: string;
  title: string;
  created_at: string;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  created_at: string;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getPublicActivitiesForUser(
  userId: string,
  privacy: ProfilePrivacySettings,
  page = 1
): Promise<{ items: PublicActivityItem[]; total: number }> {
  if (!privacy.showPublicActivities) {
    return { items: [], total: 0 };
  }

  const supabase = await createClient();
  const items: PublicActivityItem[] = [];

  let creatorStoryRows: StoryRow[] = [];
  if (privacy.showCreatorWorks) {
    const { data: creatorProfile } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (creatorProfile?.id) {
      const { data: stories } = await supabase
        .from("stories")
        .select("id, title, slug, created_at")
        .eq("creator_id", creatorProfile.id)
        .eq("visibility", "public")
        .in("status", ["published", "approved"])
        .order("created_at", { ascending: false })
        .limit(5);
      creatorStoryRows = (stories ?? []) as StoryRow[];
    }
  }

  const [commentsResult, collectionsResult] = await Promise.all([
    privacy.showPublicComments
      ? supabase
          .from("comments")
          .select("id, content, created_at, stories(title, slug)")
          .eq("user_id", userId)
          .eq("status", "visible")
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),
    privacy.showPublicCollections
      ? supabase
          .from("collections")
          .select("id, title, created_at")
          .eq("user_id", userId)
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    Promise.resolve({ data: [] as StoryRow[] })
  ]);

  for (const row of (commentsResult.data ?? []) as unknown as CommentRow[]) {
    const story = firstRelation(row.stories);
    if (!story) {
      continue;
    }
    items.push({
      id: `comment-${row.id}`,
      type: "comment",
      message: `Đã bình luận trong «${story.title}»`,
      href: `/stories/${story.slug}`,
      createdAt: row.created_at
    });
  }

  for (const row of (collectionsResult.data ?? []) as CollectionRow[]) {
    items.push({
      id: `collection-${row.id}`,
      type: "collection",
      message: `Đã tạo tủ công khai «${row.title}»`,
      href: `/collections/${row.id}`,
      createdAt: row.created_at
    });
  }

  for (const row of creatorStoryRows) {
    items.push({
      id: `story-${row.id}`,
      type: "story",
      message: `Đã đăng truyện «${row.title}»`,
      href: `/stories/${row.slug}`,
      createdAt: row.created_at
    });
  }

  const sorted = items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const total = sorted.length;
  const from = (page - 1) * PAGE_SIZE;
  return {
    items: sorted.slice(from, from + PAGE_SIZE),
    total
  };
}
