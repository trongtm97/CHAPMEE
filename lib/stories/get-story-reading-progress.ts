import { createClient } from "@/lib/supabase/server";
import type { StoryReadingProgress } from "@/types/chapter";

type ProgressRow = {
  progress_percent: number | null;
  episode_id: string | null;
  episodes:
    | { id: string; episode_number: number; title: string }
    | { id: string; episode_number: number; title: string }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getStoryReadingProgress(
  storyId: string,
  userId?: string | null
): Promise<StoryReadingProgress | null> {
  if (!userId) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reading_progress")
    .select("progress_percent, episode_id, episodes(id, episode_number, title)")
    .eq("user_id", userId)
    .eq("story_id", storyId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as unknown as ProgressRow;
  const episode = firstRelation(row.episodes);
  if (!episode || !row.episode_id) {
    return null;
  }

  const progressPercent = Number(row.progress_percent ?? 0);
  if (progressPercent <= 0) {
    return null;
  }

  return {
    episodeId: episode.id,
    episodeNumber: episode.episode_number,
    episodeTitle: episode.title,
    progressPercent
  };
}
