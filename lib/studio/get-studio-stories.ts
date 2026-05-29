import { createClient } from "@/lib/supabase/server";
import { mapStoryImageRow } from "@/lib/images/map-story-image";
import { STORY_IMAGE_SELECT_COLUMNS } from "@/lib/images/get-current-story-image";
import { resolveStoryImageUrl } from "@/lib/images/get-current-story-image";
import { paginateList, parseStudioPage } from "@/lib/studio/pagination";
import { resolveStoryDisplayStatus } from "@/lib/studio/status-labels";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type {
  StudioDbContentStatus,
  StudioDisplayStatus,
  StudioStoryListFilter,
  StudioStorySort
} from "@/types/studio";
import type { StoryImage, StoryImageRow } from "@/types/story-images";

export type { StudioStoryListFilter, StudioStorySort };

export type StudioStory = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  genreName: string | null;
  status: StudioDbContentStatus;
  displayStatus: StudioDisplayStatus;
  visibility: "public" | "private";
  isCompleted: boolean;
  episodeCount: number;
  readCount: number | null;
  coverThumbUrl: string | null;
  updatedAt: string;
  createdAt: string;
};

export type StudioStoriesResult = {
  stories: StudioStory[];
  counts: Record<StudioStoryListFilter, number>;
  page: number;
  totalPages: number;
  total: number;
  error: string | null;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  short_description: string | null;
  status: StudioDbContentStatus;
  visibility: "public" | "private";
  is_completed: boolean;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
  genres: { name: string | null } | { name: string | null }[] | null;
};

const filterGroups: Record<StudioStoryListFilter, (story: StoryRow) => boolean> = {
  all: () => true,
  draft: (story) => story.status === "draft",
  live: (story) => story.status === "published" || story.status === "approved",
  scheduled: (story) => story.status === "pending",
  completed: (story) => story.is_completed,
  rejected: (story) => story.status === "rejected",
  hidden: (story) =>
    story.status === "archived" ||
    (story.visibility === "private" &&
      (story.status === "published" || story.status === "approved"))
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export function normalizeStudioStoryFilter(filter?: string): StudioStoryListFilter {
  if (
    filter === "draft" ||
    filter === "live" ||
    filter === "scheduled" ||
    filter === "completed" ||
    filter === "rejected" ||
    filter === "hidden" ||
    filter === "pending"
  ) {
    return filter === "pending" ? "scheduled" : filter;
  }

  if (filter === "archived") {
    return "hidden";
  }

  return "all";
}

export function normalizeStudioStorySort(sort?: string): StudioStorySort {
  if (sort === "created" || sort === "reads" || sort === "title") {
    return sort;
  }

  return "updated";
}

export function getStudioStorySearch(value?: string) {
  return (value ?? "").trim();
}

function countByFilter(stories: StoryRow[]): Record<StudioStoryListFilter, number> {
  return {
    all: stories.length,
    draft: stories.filter(filterGroups.draft).length,
    live: stories.filter(filterGroups.live).length,
    scheduled: stories.filter(filterGroups.scheduled).length,
    completed: stories.filter(filterGroups.completed).length,
    rejected: stories.filter(filterGroups.rejected).length,
    hidden: stories.filter(filterGroups.hidden).length
  };
}

function sortStories(stories: StudioStory[], sort: StudioStorySort) {
  const copy = [...stories];

  copy.sort((a, b) => {
    switch (sort) {
      case "created":
        return b.createdAt.localeCompare(a.createdAt);
      case "reads":
        return (b.readCount ?? 0) - (a.readCount ?? 0);
      case "title":
        return a.title.localeCompare(b.title, "vi");
      case "updated":
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });

  return copy;
}

export async function getStudioStoriesPage(
  creatorProfile: CreatorProfile,
  options?: {
    filter?: string;
    search?: string;
    sort?: string;
    page?: string;
  }
): Promise<StudioStoriesResult> {
  const activeFilter = normalizeStudioStoryFilter(options?.filter);
  const activeSearch = getStudioStorySearch(options?.search).toLowerCase();
  const activeSort = normalizeStudioStorySort(options?.sort);
  const activePage = parseStudioPage(options?.page);

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("stories")
      .select(
        "id, title, slug, hook, short_description, status, visibility, is_completed, cover_url, created_at, updated_at, genres(name)"
      )
      .eq("creator_id", creatorProfile.id)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as StoryRow[];
    const storyIds = rows.map((story) => story.id);
    const episodeCountByStory = new Map<string, number>();
    const readCountByStory = new Map<string, number>();
    const imageByStory = new Map<string, StoryImage>();

    if (storyIds.length > 0) {
      const [episodeRows, readsRows, imageRows] = await Promise.all([
        supabase.from("episodes").select("story_id").in("story_id", storyIds),
        supabase
          .from("analytics_events")
          .select("target_id")
          .in("target_id", storyIds)
          .eq("event_name", "open_story"),
        supabase
          .from("story_images")
          .select(STORY_IMAGE_SELECT_COLUMNS)
          .in("story_id", storyIds)
          .eq("is_current", true)
      ]);

      if (episodeRows.error) {
        throw episodeRows.error;
      }

      if (readsRows.error) {
        throw readsRows.error;
      }

      if (imageRows.error) {
        throw imageRows.error;
      }

      for (const episode of (episodeRows.data ?? []) as Array<{ story_id: string }>) {
        episodeCountByStory.set(
          episode.story_id,
          (episodeCountByStory.get(episode.story_id) ?? 0) + 1
        );
      }

      for (const event of (readsRows.data ?? []) as Array<{ target_id: string }>) {
        readCountByStory.set(
          event.target_id,
          (readCountByStory.get(event.target_id) ?? 0) + 1
        );
      }

      for (const row of (imageRows.data ?? []) as StoryImageRow[]) {
        imageByStory.set(row.story_id, mapStoryImageRow(row));
      }
    }

    const allStories: StudioStory[] = rows
      .filter((story) => filterGroups[activeFilter](story))
      .filter((story) =>
        activeSearch ? story.title.toLowerCase().includes(activeSearch) : true
      )
      .map((story) => {
        const genre = firstRelation(story.genres);
        const image = imageByStory.get(story.id) ?? null;
        const coverThumbUrl = resolveStoryImageUrl({
          coverUrl: story.cover_url,
          image,
          variant: "thumb"
        });
        const description =
          story.short_description?.trim() || story.hook?.trim() || null;
        const reads = readCountByStory.get(story.id) ?? 0;

        return {
          coverThumbUrl,
          createdAt: story.created_at,
          description,
          displayStatus: resolveStoryDisplayStatus({
            isCompleted: story.is_completed,
            status: story.status,
            visibility: story.visibility
          }),
          episodeCount: episodeCountByStory.get(story.id) ?? 0,
          genreName: genre?.name ?? null,
          id: story.id,
          isCompleted: story.is_completed,
          readCount: reads > 0 ? reads : null,
          slug: story.slug,
          status: story.status,
          title: story.title,
          updatedAt: story.updated_at,
          visibility: story.visibility
        };
      });

    const sorted = sortStories(allStories, activeSort);
    const paginated = paginateList(sorted, activePage);

    return {
      counts: countByFilter(rows),
      error: null,
      page: paginated.page,
      stories: paginated.items,
      total: paginated.total,
      totalPages: paginated.totalPages
    };
  } catch (error) {
    return {
      counts: {
        all: 0,
        completed: 0,
        draft: 0,
        hidden: 0,
        live: 0,
        rejected: 0,
        scheduled: 0
      },
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách truyện.",
      page: 1,
      stories: [],
      total: 0,
      totalPages: 1
    };
  }
}
