import { createClient } from "@/lib/supabase/server";
import type { ContinueReadingEnriched } from "@/types/library";

type ProgressRow = {
  id: string;
  progress_percent: number | null;
  updated_at: string | null;
  story_id: string;
  stories:
    | {
        id: string;
        title: string;
        slug: string;
        hook: string | null;
        cover_url: string | null;
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
        hook: string | null;
        cover_url: string | null;
        genres: { name: string | null } | { name: string | null }[] | null;
        creator_profiles:
          | { pen_name: string | null }
          | { pen_name: string | null }[]
          | null;
      }[]
    | null;
  episodes:
    | {
        id: string;
        episode_number: number;
        title: string;
      }
    | {
        id: string;
        episode_number: number;
        title: string;
      }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

async function getLatestEpisodeNumbers(storyIds: string[]) {
  if (storyIds.length === 0) {
    return new Map<string, number>();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("episodes")
    .select("story_id, episode_number")
    .in("story_id", storyIds)
    .order("episode_number", { ascending: false });

  const latestByStory = new Map<string, number>();
  for (const row of data ?? []) {
    const storyId = row.story_id as string;
    if (!latestByStory.has(storyId)) {
      latestByStory.set(storyId, Number(row.episode_number));
    }
  }
  return latestByStory;
}

export async function getContinueReadingForLibrary(
  userId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const limit = options.limit ?? 30;
  const offset = options.offset ?? 0;

  try {
    const supabase = await createClient();
    const { data, error, count } = await supabase
      .from("reading_progress")
      .select(
        "id, progress_percent, updated_at, story_id, stories(id, title, slug, hook, cover_url, genres(name), creator_profiles(pen_name)), episodes(id, episode_number, title)",
        { count: "exact" }
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as ProgressRow[];
    const storyIds = [
      ...new Set(rows.map((row) => row.story_id).filter(Boolean))
    ] as string[];
    const latestEpisodeByStory = await getLatestEpisodeNumbers(storyIds);

    const items: ContinueReadingEnriched[] = rows
      .map((row) => {
        const story = firstRelation(row.stories);
        const episode = firstRelation(row.episodes);
        const genre = firstRelation(story?.genres);
        const creator = firstRelation(story?.creator_profiles);

        if (!story || !episode) {
          return null;
        }

        const progressPercent = Number(row.progress_percent ?? 0);
        const latestEpisode = latestEpisodeByStory.get(story.id) ?? episode.episode_number;
        const hasNewChapter = episode.episode_number < latestEpisode;
        const isCaughtUp =
          !hasNewChapter &&
          (progressPercent >= 95 || episode.episode_number >= latestEpisode);

        return {
          id: row.id,
          progressPercent,
          lastReadAt: row.updated_at,
          hasNewChapter,
          isCaughtUp,
          story: {
            id: story.id,
            title: story.title,
            slug: story.slug,
            hook: story.hook,
            genreName: genre?.name ?? null,
            creatorName: creator?.pen_name ?? null,
            coverUrl: story.cover_url ?? null
          },
          episode: {
            id: episode.id,
            episodeNumber: episode.episode_number,
            title: episode.title
          }
        };
      })
      .filter((item): item is ContinueReadingEnriched => Boolean(item));

    return {
      items,
      total: count ?? items.length,
      error: null as string | null
    };
  } catch (error) {
    return {
      items: [] as ContinueReadingEnriched[],
      total: 0,
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách đọc tiếp."
    };
  }
}
