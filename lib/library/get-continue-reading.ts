import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/postgrest-selects";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import { resolveCreatorRowName } from "@/lib/creator/resolve-creator-row-name";
import { createClient } from "@/lib/data/server";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
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
        public_code: string;
        hook: string | null;
        cover_url: string | null;
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
        cover_url: string | null;
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

async function getLatestEpisodeNumbers(storyIds: string[]) {
  if (storyIds.length === 0) {
    return new Map<string, number>();
  }

  const db = await createClient();
  const { data } = await db
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
    const db = await createClient();
    const { data, error, count } = await db
      .from("reading_progress")
      .select(
        `id, progress_percent, updated_at, story_id, stories(id, title, slug, public_code, hook, cover_url, ${CREATOR_PROFILE_STORY_JOIN}), episodes(id, episode_number, title, slug, public_code)`,
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
    const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(db, storyIds);
    const latestEpisodeByStory = await getLatestEpisodeNumbers(storyIds);

    const items = rows
      .map((row): ContinueReadingEnriched | null => {
        const story = firstRelation(row.stories);
        const episode = firstRelation(row.episodes);
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
            publicCode: story.public_code,
            hook: story.hook,
            genreName: taxonomyByStory.get(story.id)?.mainGenreName ?? null,
            creatorName: resolveCreatorRowName(creator),
            coverUrl: resolveStoryCoverUrl(story.cover_url)
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
      .filter((item): item is ContinueReadingEnriched => item !== null);

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
