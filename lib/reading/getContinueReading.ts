import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/supabase-selects";
import { resolveCreatorRowName } from "@/lib/creator/resolve-creator-row-name";
import { createClient } from "@/lib/supabase/server";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";

export type ContinueReadingItem = {
  id: string;
  progressPercent: number;
  story: {
    id: string;
    title: string;
    slug: string;
    publicCode: string;
    hook: string | null;
    genreName: string | null;
    creatorName: string | null;
    coverUrl: string | null;
  };
  episode: {
    id: string;
    episodeNumber: number;
    title: string;
    slug: string;
    publicCode: string;
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
        public_code: string;
        hook: string | null;
        cover_url?: string | null;
        creator_profiles:
          | { pen_name: string | null }
          | { pen_name: string | null }[]
          | null;
      }
    | {
        id: string;
        title: string;
        slug: string;
        public_code: string;
        hook: string | null;
        cover_url?: string | null;
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
        slug: string;
        public_code: string;
      }
    | {
        id: string;
        episode_number: number;
        title: string;
        slug: string;
        public_code: string;
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
        `id, progress_percent, stories(id, title, slug, public_code, hook, cover_url, ${CREATOR_PROFILE_STORY_JOIN}), episodes(id, episode_number, title, slug, public_code)`
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as ProgressRow[];
    const storyIds = [
      ...new Set(
        rows
          .map((row) => firstRelation(row.stories)?.id)
          .filter((id): id is string => Boolean(id))
      )
    ];
    const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(supabase, storyIds);

    const items = rows
      .map((row) => {
        const story = firstRelation(row.stories);
        const episode = firstRelation(row.episodes);
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
            publicCode: story.public_code,
            hook: story.hook,
            genreName: taxonomyByStory.get(story.id)?.mainGenreName ?? null,
            creatorName: resolveCreatorRowName(creator),
            coverUrl: (story as { cover_url?: string | null }).cover_url ?? null
          },
          episode: {
            id: episode.id,
            episodeNumber: episode.episode_number,
            title: episode.title,
            slug: episode.slug,
            publicCode: episode.public_code
          }
        };
      })
      .filter((item): item is ContinueReadingItem => item !== null);

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
