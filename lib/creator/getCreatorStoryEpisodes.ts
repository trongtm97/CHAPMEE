import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type { CreatorStoryStatus } from "@/lib/creator/getCreatorStories";

export type CreatorEpisode = {
  id: string;
  episode_number: number;
  title: string;
  excerpt: string | null;
  status: CreatorStoryStatus;
  word_count: number;
  updated_at: string;
};

export type CreatorStoryEpisodesData = {
  story: {
    id: string;
    title: string;
    slug: string;
    status: CreatorStoryStatus;
  } | null;
  episodes: CreatorEpisode[];
  error: string | null;
};

export async function getCreatorStoryEpisodes(
  creatorProfile: CreatorProfile,
  storyId: string
): Promise<CreatorStoryEpisodesData> {
  try {
    const supabase = await createClient();
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("id, title, slug, status")
      .eq("id", storyId)
      .eq("creator_id", creatorProfile.id)
      .maybeSingle();

    if (storyError) {
      throw storyError;
    }

    if (!story) {
      return { story: null, episodes: [], error: null };
    }

    const { data: episodes, error: episodesError } = await supabase
      .from("episodes")
      .select("id, episode_number, title, excerpt, status, word_count, updated_at")
      .eq("story_id", story.id)
      .order("episode_number", { ascending: true });

    if (episodesError) {
      throw episodesError;
    }

    return {
      error: null,
      episodes: (episodes ?? []) as CreatorEpisode[],
      story: story as CreatorStoryEpisodesData["story"]
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Không thể tải danh sách chap.",
      episodes: [],
      story: null
    };
  }
}
