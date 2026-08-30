import { resolveCreatorRowName } from "@/lib/creator/resolve-creator-row-name";
import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/postgrest-selects";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import { mapStoryStructureFromRow } from "@/lib/stories/story-structure";
import { createClient } from "@/lib/data/server";
import type { LibrarySavedStory } from "@/types/library";

type BookshelfRow = {
  created_at: string;
  stories:
    | {
        id: string;
        title: string;
        slug: string;
        public_code: string;
        cover_url: string | null;
        is_completed: boolean | null;
        published_at: string | null;
        structure_type?: string | null;
        standalone_reading_time_minutes?: number | null;
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
        cover_url: string | null;
        is_completed: boolean | null;
        published_at: string | null;
        structure_type?: string | null;
        standalone_reading_time_minutes?: number | null;
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
  episodes:
    | { episode_number: number; slug: string; public_code: string }
    | { episode_number: number; slug: string; public_code: string }[]
    | null;
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
    const db = await createClient();
    const { data, error, count } = await db
      .from("bookshelf_items")
      .select(
        `created_at, stories(id, title, slug, public_code, cover_url, is_completed, published_at, structure_type, standalone_reading_time_minutes, ${CREATOR_PROFILE_STORY_JOIN})`,
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
      {
        progressPercent: number;
        episodeNumber: number;
        episodeSlug: string;
        episodePublicCode: string;
      }
    >();

    if (storyIds.length > 0) {
      const { data: progressRows } = await db
        .from("reading_progress")
        .select("story_id, progress_percent, episodes(episode_number, slug, public_code)")
        .eq("user_id", userId)
        .in("story_id", storyIds);

      for (const row of (progressRows ?? []) as unknown as ProgressRow[]) {
        const episode = firstRelation(row.episodes);
        progressByStory.set(row.story_id, {
          progressPercent: Number(row.progress_percent ?? 0),
          episodeNumber: episode?.episode_number ?? 0,
          episodeSlug: episode?.slug ?? "",
          episodePublicCode: episode?.public_code ?? ""
        });
      }
    }

    const episodeCountByStory = new Map<string, number>();
    const latestPublishedByStory = new Map<string, string | null>();

    if (storyIds.length > 0) {
      const { data: episodeRows } = await db
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

    const items = rows
      .map((row): LibrarySavedStory | null => {
        const story = firstRelation(row.stories);
        if (!story) {
          return null;
        }
        const creator = firstRelation(story.creator_profiles);
        const progress = progressByStory.get(story.id);
        const structure = mapStoryStructureFromRow(story);

        return {
          id: story.id,
          slug: story.slug,
          publicCode: story.public_code,
          title: story.title,
          coverUrl: resolveStoryCoverUrl(story.cover_url),
          authorName: resolveCreatorRowName(creator),
          isCompleted: Boolean(story.is_completed),
          episodeCount: episodeCountByStory.get(story.id) ?? 0,
          structureType: structure.structureType,
          standaloneReadingTimeMinutes: structure.standaloneReadingTimeMinutes,
          savedAt: row.created_at,
          latestEpisodePublishedAt:
            latestPublishedByStory.get(story.id) ?? story.published_at,
          hasReadingProgress: Boolean(progress),
          progressPercent: progress?.progressPercent ?? null,
          currentEpisodeNumber: progress?.episodeNumber ?? null,
          currentEpisodeSlug: progress?.episodeSlug ?? null,
          currentEpisodePublicCode: progress?.episodePublicCode ?? null
        };
      })
      .filter((item): item is LibrarySavedStory => item !== null);

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
