import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";

export type CreatorStoryStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "published"
  | "archived";

export type CreatorStoryFilter =
  | "all"
  | "draft"
  | "pending"
  | "live"
  | "closed";

export type CreatorStory = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  status: CreatorStoryStatus;
  genreName: string | null;
  episodeCount: number;
  updatedAt: string;
};

export type CreatorStoriesData = {
  stories: CreatorStory[];
  counts: Record<CreatorStoryFilter, number>;
  error: string | null;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  status: CreatorStoryStatus;
  updated_at: string;
  genres: { name: string | null } | { name: string | null }[] | null;
};

type EpisodeRow = {
  story_id: string;
};

const filterGroups: Record<CreatorStoryFilter, CreatorStoryStatus[]> = {
  all: ["draft", "pending", "approved", "rejected", "published", "archived"],
  draft: ["draft"],
  pending: ["pending"],
  live: ["approved", "published"],
  closed: ["rejected", "archived"]
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function normalizeFilter(filter?: string): CreatorStoryFilter {
  if (
    filter === "draft" ||
    filter === "pending" ||
    filter === "live" ||
    filter === "closed"
  ) {
    return filter;
  }

  return "all";
}

function countByFilter(stories: StoryRow[]): Record<CreatorStoryFilter, number> {
  return {
    all: stories.length,
    draft: stories.filter((story) => filterGroups.draft.includes(story.status))
      .length,
    pending: stories.filter((story) =>
      filterGroups.pending.includes(story.status)
    ).length,
    live: stories.filter((story) => filterGroups.live.includes(story.status))
      .length,
    closed: stories.filter((story) =>
      filterGroups.closed.includes(story.status)
    ).length
  };
}

export function getCreatorStoryFilter(filter?: string): CreatorStoryFilter {
  return normalizeFilter(filter);
}

export async function getCreatorStories(
  creatorProfile: CreatorProfile,
  filter?: string
): Promise<CreatorStoriesData> {
  try {
    const activeFilter = normalizeFilter(filter);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("stories")
      .select("id, title, slug, hook, status, updated_at, genres(name)")
      .eq("creator_id", creatorProfile.id)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as StoryRow[];
    const storyIds = rows.map((story) => story.id);
    const episodeCountByStory = new Map<string, number>();

    if (storyIds.length > 0) {
      const { data: episodeRows } = await supabase
        .from("episodes")
        .select("story_id")
        .in("story_id", storyIds);

      for (const episode of (episodeRows ?? []) as EpisodeRow[]) {
        episodeCountByStory.set(
          episode.story_id,
          (episodeCountByStory.get(episode.story_id) ?? 0) + 1
        );
      }
    }

    const filteredRows =
      activeFilter === "all"
        ? rows
        : rows.filter((story) =>
            filterGroups[activeFilter].includes(story.status)
          );

    return {
      counts: countByFilter(rows),
      error: null,
      stories: filteredRows.map((story) => {
        const genre = firstRelation(story.genres);

        return {
          id: story.id,
          title: story.title,
          slug: story.slug,
          hook: story.hook,
          status: story.status,
          genreName: genre?.name ?? null,
          episodeCount: episodeCountByStory.get(story.id) ?? 0,
          updatedAt: story.updated_at
        };
      })
    };
  } catch (error) {
    return {
      counts: {
        all: 0,
        draft: 0,
        pending: 0,
        live: 0,
        closed: 0
      },
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách truyện.",
      stories: []
    };
  }
}
