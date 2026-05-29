import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type { CreatorStoryStatus } from "@/lib/creator/getCreatorStories";

export type CreatorOwnedStory = {
  id: string;
  title: string;
  slug: string;
  status: CreatorStoryStatus;
};

export async function getCreatorOwnedStory(
  creatorProfile: CreatorProfile,
  storyId: string
): Promise<{ story: CreatorOwnedStory | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stories")
      .select("id, title, slug, status")
      .eq("id", storyId)
      .eq("creator_id", creatorProfile.id)
      .maybeSingle();

    return {
      story: data as CreatorOwnedStory | null,
      error: error?.message ?? null
    };
  } catch (error) {
    return {
      story: null,
      error:
        error instanceof Error ? error.message : "Không thể tải truyện này."
    };
  }
}
