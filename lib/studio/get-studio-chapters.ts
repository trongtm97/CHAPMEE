import { createClient } from "@/lib/supabase/server";
import { paginateList, parseStudioPage } from "@/lib/studio/pagination";
import {
  resolveChapterDisplayStatus,
  resolveStoryDisplayStatus
} from "@/lib/studio/status-labels";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type {
  StudioChapterListFilter,
  StudioChapterSort,
  StudioDbContentStatus,
  StudioDisplayStatus
} from "@/types/studio";

export type { StudioChapterListFilter, StudioChapterSort };

export type StudioChapter = {
  id: string;
  episodeNumber: number;
  title: string;
  excerpt: string | null;
  status: StudioDbContentStatus;
  displayStatus: StudioDisplayStatus;
  wordCount: number;
  readingMinutes: number | null;
  updatedAt: string;
  publishedAt: string | null;
  readCount: number | null;
  commentCount: number | null;
};

export type StudioStoryHeader = {
  id: string;
  title: string;
  slug: string;
  status: StudioDbContentStatus;
  displayStatus: StudioDisplayStatus;
  visibility: "public" | "private";
  isCompleted: boolean;
};

export type StudioChaptersResult = {
  story: StudioStoryHeader | null;
  chapters: StudioChapter[];
  counts: Record<StudioChapterListFilter, number>;
  page: number;
  totalPages: number;
  total: number;
  error: string | null;
};

type EpisodeRow = {
  id: string;
  episode_number: number;
  title: string;
  excerpt: string | null;
  status: StudioDbContentStatus;
  word_count: number;
  updated_at: string;
  published_at: string | null;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  status: StudioDbContentStatus;
  visibility: "public" | "private";
  is_completed: boolean;
};

const WORDS_PER_MINUTE = 200;

const filterGroups: Record<StudioChapterListFilter, (episode: EpisodeRow) => boolean> =
  {
    all: () => true,
    draft: (episode) => episode.status === "draft",
    scheduled: (episode) =>
      episode.status === "pending" || episode.status === "approved",
    published: (episode) => episode.status === "published",
    rejected: (episode) => episode.status === "rejected",
    hidden: (episode) => episode.status === "archived"
  };

export function normalizeStudioChapterFilter(
  filter?: string
): StudioChapterListFilter {
  if (
    filter === "draft" ||
    filter === "scheduled" ||
    filter === "published" ||
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

export function normalizeStudioChapterSort(sort?: string): StudioChapterSort {
  if (
    sort === "number_asc" ||
    sort === "number_desc" ||
    sort === "scheduled"
  ) {
    return sort;
  }

  return "number_asc";
}

export function getStudioChapterSearch(value?: string) {
  return (value ?? "").trim();
}

function estimateReadingMinutes(wordCount: number) {
  if (wordCount <= 0) {
    return null;
  }

  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

function countByFilter(episodes: EpisodeRow[]): Record<StudioChapterListFilter, number> {
  return {
    all: episodes.length,
    draft: episodes.filter(filterGroups.draft).length,
    hidden: episodes.filter(filterGroups.hidden).length,
    published: episodes.filter(filterGroups.published).length,
    rejected: episodes.filter(filterGroups.rejected).length,
    scheduled: episodes.filter(filterGroups.scheduled).length
  };
}

function sortChapters(chapters: StudioChapter[], sort: StudioChapterSort) {
  const copy = [...chapters];

  copy.sort((a, b) => {
    switch (sort) {
      case "number_asc":
        return a.episodeNumber - b.episodeNumber;
      case "number_desc":
        return b.episodeNumber - a.episodeNumber;
      case "scheduled": {
        const aDate = a.publishedAt ?? "";
        const bDate = b.publishedAt ?? "";
        return bDate.localeCompare(aDate);
      }
      case "updated":
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });

  return copy;
}

export async function getStudioChaptersPage(
  creatorProfile: CreatorProfile,
  storyId: string,
  options?: {
    filter?: string;
    search?: string;
    sort?: string;
    page?: string;
  }
): Promise<StudioChaptersResult> {
  const activeFilter = normalizeStudioChapterFilter(options?.filter);
  const activeSearch = getStudioChapterSearch(options?.search).toLowerCase();
  const activeSort = normalizeStudioChapterSort(options?.sort);
  const activePage = parseStudioPage(options?.page);

  try {
    const supabase = await createClient();

    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("id, title, slug, status, visibility, is_completed")
      .eq("id", storyId)
      .eq("creator_id", creatorProfile.id)
      .maybeSingle();

    if (storyError) {
      throw storyError;
    }

    if (!story) {
      return {
        chapters: [],
        counts: {
          all: 0,
          draft: 0,
          hidden: 0,
          published: 0,
          rejected: 0,
          scheduled: 0
        },
        error: null,
        page: 1,
        story: null,
        total: 0,
        totalPages: 1
      };
    }

    const storyRow = story as StoryRow;

    const { data: episodes, error: episodesError } = await supabase
      .from("episodes")
      .select(
        "id, episode_number, title, excerpt, status, word_count, updated_at, published_at"
      )
      .eq("story_id", storyRow.id)
      .order("episode_number", { ascending: true });

    if (episodesError) {
      throw episodesError;
    }

    const rows = (episodes ?? []) as EpisodeRow[];
    const episodeIds = rows.map((episode) => episode.id);
    const readCountByEpisode = new Map<string, number>();
    const commentCountByEpisode = new Map<string, number>();

    if (episodeIds.length > 0) {
      const [readsResult, commentsResult] = await Promise.all([
        supabase
          .from("analytics_events")
          .select("target_id")
          .in("target_id", episodeIds)
          .eq("event_name", "chapter_opened"),
        supabase
          .from("comments")
          .select("episode_id")
          .in("episode_id", episodeIds)
          .eq("status", "visible")
      ]);

      if (readsResult.error) {
        throw readsResult.error;
      }

      if (commentsResult.error) {
        throw commentsResult.error;
      }

      for (const event of (readsResult.data ?? []) as Array<{ target_id: string }>) {
        readCountByEpisode.set(
          event.target_id,
          (readCountByEpisode.get(event.target_id) ?? 0) + 1
        );
      }

      for (const comment of (commentsResult.data ?? []) as Array<{
        episode_id: string;
      }>) {
        commentCountByEpisode.set(
          comment.episode_id,
          (commentCountByEpisode.get(comment.episode_id) ?? 0) + 1
        );
      }
    }

    const storyHeader: StudioStoryHeader = {
      displayStatus: resolveStoryDisplayStatus({
        isCompleted: storyRow.is_completed,
        status: storyRow.status,
        visibility: storyRow.visibility
      }),
      id: storyRow.id,
      isCompleted: storyRow.is_completed,
      slug: storyRow.slug,
      status: storyRow.status,
      title: storyRow.title,
      visibility: storyRow.visibility
    };

    const allChapters: StudioChapter[] = rows
      .filter((episode) => filterGroups[activeFilter](episode))
      .filter((episode) => {
        if (!activeSearch) {
          return true;
        }

        const haystack = `${episode.episode_number} ${episode.title}`.toLowerCase();
        return haystack.includes(activeSearch);
      })
      .map((episode) => {
        const reads = readCountByEpisode.get(episode.id) ?? 0;
        const comments = commentCountByEpisode.get(episode.id) ?? 0;

        return {
          commentCount: comments > 0 ? comments : null,
          displayStatus: resolveChapterDisplayStatus({ status: episode.status }),
          episodeNumber: episode.episode_number,
          excerpt: episode.excerpt,
          id: episode.id,
          publishedAt: episode.published_at,
          readCount: reads > 0 ? reads : null,
          readingMinutes: estimateReadingMinutes(episode.word_count),
          status: episode.status,
          title: episode.title,
          updatedAt: episode.updated_at,
          wordCount: episode.word_count
        };
      });

    const sorted = sortChapters(allChapters, activeSort);
    const paginated = paginateList(sorted, activePage);

    return {
      chapters: paginated.items,
      counts: countByFilter(rows),
      error: null,
      page: paginated.page,
      story: storyHeader,
      total: paginated.total,
      totalPages: paginated.totalPages
    };
  } catch (error) {
    return {
      chapters: [],
      counts: {
        all: 0,
        draft: 0,
        hidden: 0,
        published: 0,
        rejected: 0,
        scheduled: 0
      },
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách chương.",
      page: 1,
      story: null,
      total: 0,
      totalPages: 1
    };
  }
}
