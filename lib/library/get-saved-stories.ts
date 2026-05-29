import { createClient } from "@/lib/supabase/server";
import type { LibrarySavedStory } from "@/types/library";

type BookshelfRow = {
  created_at: string;
  stories:
    | {
        id: string;
        title: string;
        slug: string;
        cover_url: string | null;
        is_completed: boolean | null;
        published_at: string | null;
        genres: { name: string | null } | { name: string | null }[] | null;
        creator_profiles:
          | { pen_name: string | null }
          | { pen_name: string | null }[]
          | null;
      }
    | {
        id: string;
        title: string;
        slug: string;
        cover_url: string | null;
        is_completed: boolean | null;
        published_at: string | null;
        genres: { name: string | null } | { name: string | null }[] | null;
        creator_profiles:
          | { pen_name: string | null }
          | { pen_name: string | null }[]
          | null;
      }[]
    | null;
};

type ProgressRow = {
  story_id: string;
  progress_percent: number | null;
  episodes: { episode_number: number } | { episode_number: number }[] | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getSavedStoriesForLibrary(
  userId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const limit = options.limit ?? 30;
  const offset = options.offset ?? 0;

  try {
    const supabase = await createClient();
    const { data, error, count } = await supabase
      .from("bookshelf_items")
      .select(
        "created_at, stories(id, title, slug, cover_url, is_completed, published_at, genres(name), creator_profiles(pen_name))",
        { count: "exact" }
      )
      .eq("user_id", userId)
      .eq("status", "saved")
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as BookshelfRow[];
    const storyIds = rows
      .map((row) => firstRelation(row.stories)?.id)
      .filter((id): id is string => Boolean(id));

    const progressByStory = new Map<
      string,
      { progressPercent: number; episodeNumber: number }
    >();

    if (storyIds.length > 0) {
      const { data: progressRows } = await supabase
        .from("reading_progress")
        .select("story_id, progress_percent, episodes(episode_number)")
        .eq("user_id", userId)
        .in("story_id", storyIds);

      for (const row of (progressRows ?? []) as unknown as ProgressRow[]) {
        const episode = firstRelation(row.episodes);
        progressByStory.set(row.story_id, {
          progressPercent: Number(row.progress_percent ?? 0),
          episodeNumber: episode?.episode_number ?? 0
        });
      }
    }

    const episodeCountByStory = new Map<string, number>();
    const latestPublishedByStory = new Map<string, string | null>();

    if (storyIds.length > 0) {
      const { data: episodeRows } = await supabase
        .from("episodes")
        .select("story_id, published_at, episode_number")
        .in("story_id", storyIds)
        .order("episode_number", { ascending: false });

      for (const ep of episodeRows ?? []) {
        const sid = ep.story_id as string;
        episodeCountByStory.set(sid, (episodeCountByStory.get(sid) ?? 0) + 1);
        if (!latestPublishedByStory.has(sid)) {
          latestPublishedByStory.set(sid, (ep.published_at as string | null) ?? null);
        }
      }
    }

    const items: LibrarySavedStory[] = rows
      .map((row) => {
        const story = firstRelation(row.stories);
        if (!story) {
          return null;
        }
        const creator = firstRelation(story.creator_profiles);
        const progress = progressByStory.get(story.id);

        return {
          id: story.id,
          slug: story.slug,
          title: story.title,
          coverUrl: story.cover_url,
          authorName: creator?.pen_name ?? null,
          isCompleted: Boolean(story.is_completed),
          episodeCount: episodeCountByStory.get(story.id) ?? 0,
          savedAt: row.created_at,
          latestEpisodePublishedAt:
            latestPublishedByStory.get(story.id) ?? story.published_at,
          hasReadingProgress: Boolean(progress),
          progressPercent: progress?.progressPercent ?? null,
          currentEpisodeNumber: progress?.episodeNumber ?? null
        };
      })
      .filter((item): item is LibrarySavedStory => Boolean(item));

    return {
      items,
      total: count ?? items.length,
      error: null as string | null
    };
  } catch (error) {
    return {
      items: [] as LibrarySavedStory[],
      total: 0,
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải truyện đã lưu."
    };
  }
}
