import { createClient } from "@/lib/supabase/server";

export type ContinueReadingItem = {
  id: string;
  progressPercent: number;
  story: {
    id: string;
    title: string;
    slug: string;
    hook: string | null;
    genreName: string | null;
    creatorName: string | null;
    coverUrl: string | null;
  };
  episode: {
    id: string;
    episodeNumber: number;
    title: string;
  };
};

type ProgressRow = {
  id: string;
  progress_percent: number | null;
  stories:
    | {
        id: string;
        title: string;
        slug: string;
        hook: string | null;
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

export async function getContinueReading(userId?: string, limit = 3) {
  if (!userId) {
    return {
      items: [] as ContinueReadingItem[],
      error: null as string | null
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reading_progress")
      .select(
        "id, progress_percent, stories(id, title, slug, hook, cover_url, genres(name), creator_profiles(pen_name)), episodes(id, episode_number, title)"
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    const items = ((data ?? []) as unknown as ProgressRow[])
      .map((row) => {
        const story = firstRelation(row.stories);
        const episode = firstRelation(row.episodes);
        const genre = firstRelation(story?.genres);
        const creator = firstRelation(story?.creator_profiles);

        if (!story || !episode) {
          return null;
        }

        return {
          id: row.id,
          progressPercent: Number(row.progress_percent ?? 0),
          story: {
            id: story.id,
            title: story.title,
            slug: story.slug,
            hook: story.hook,
            genreName: genre?.name ?? null,
            creatorName: creator?.pen_name ?? null,
            coverUrl: (story as { cover_url?: string | null }).cover_url ?? null
          },
          episode: {
            id: episode.id,
            episodeNumber: episode.episode_number,
            title: episode.title
          }
        };
      })
      .filter((item): item is ContinueReadingItem => Boolean(item));

    return { items, error: null };
  } catch (error) {
    return {
      items: [],
      error:
        error instanceof Error
          ? error.message
          : "Could not load continue reading."
    };
  }
}
