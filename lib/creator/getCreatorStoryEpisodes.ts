import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type { CreatorStoryStatus } from "@/lib/creator/getCreatorStories";

export type CreatorEpisode = {
  id: string;
  slug: string;
  publicCode: string;
  episode_number: number;
  title: string;
  excerpt: string | null;
  status: CreatorStoryStatus;
  word_count: number;
  updated_at: string;
  content_format: string | null;
};

export type CreatorStoryEpisodesData = {
  story: {
    id: string;
    title: string;
    slug: string;
    publicCode: string;
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
      .select("id, title, slug, public_code, status")
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
      .select(
        "id, slug, public_code, episode_number, title, excerpt, status, word_count, updated_at, content_format"
      )
      .eq("story_id", story.id)
      .order("episode_number", { ascending: true });

    if (episodesError) {
      throw episodesError;
    }

    return {
      error: null,
      episodes: (episodes ?? []).map((row) => ({
        id: row.id,
        slug: row.slug,
        publicCode: row.public_code,
        episode_number: row.episode_number,
        title: row.title,
        excerpt: row.excerpt,
        status: row.status,
        word_count: row.word_count,
        updated_at: row.updated_at,
        content_format: row.content_format ?? null
      })),
      story: {
        id: story.id,
        title: story.title,
        slug: story.slug,
        publicCode: story.public_code,
        status: story.status
      }
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
