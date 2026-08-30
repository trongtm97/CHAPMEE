import { createClient } from "@/lib/data/server";

export type CommunityStoryOption = {
  id: string;
  title: string;
};

export type CommunityStoryOptionsResult = {
  stories: CommunityStoryOption[];
  error: string | null;
};

export async function getStoriesForCommunityPost(): Promise<CommunityStoryOptionsResult> {
  try {
    const db = await createClient();
    const { data, error } = await db
      .from("stories")
      .select("id, title")
      .eq("visibility", "public")
      .in("status", ["approved", "published"])
      .order("published_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(error.message);
    }

    return {
      error: null,
      stories: (data ?? []).map((story) => ({
        id: String(story.id),
        title: String(story.title)
      }))
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách truyện.",
      stories: []
    };
  }
}
