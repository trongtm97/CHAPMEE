import { createClient } from "@/lib/supabase/server";
import { paginateList, parseStudioPage } from "@/lib/studio/pagination";
import { studioPath } from "@/lib/studio/constants";
import type {
  StudioDraftListFilter,
  StudioDraftListItem,
  StudioDraftType
} from "@/types/drafts";

type DraftRow = {
  id: string;
  draft_type: StudioDraftType;
  title: string | null;
  status: "draft" | "archived";
  last_saved_at: string;
  story_id: string | null;
  chapter_id: string | null;
  plain_text: string | null;
  stories: { title: string } | { title: string }[] | null;
  episodes:
    | { title: string; episode_number: number }
    | { title: string; episode_number: number }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function resumeHref(row: DraftRow) {
  if (row.draft_type === "story" && row.story_id) {
    return studioPath(`/stories/${row.story_id}/edit`);
  }

  if (row.draft_type === "chapter" && row.story_id && row.chapter_id) {
    return studioPath(`/stories/${row.story_id}/chapters/${row.chapter_id}/edit`);
  }

  if (row.draft_type === "chapter" && row.story_id) {
    return studioPath(`/stories/${row.story_id}/chapters/new`);
  }

  if (row.draft_type === "swipe") {
    return studioPath("/swipe");
  }

  return studioPath("/stories");
}

function displayTitle(row: DraftRow) {
  if (row.title?.trim()) {
    return row.title.trim();
  }

  const story = firstRelation(row.stories);
  const episode = firstRelation(row.episodes);

  if (episode?.title) {
    return episode.title;
  }

  if (story?.title) {
    return story.title;
  }

  return "Nháp không tiêu đề";
}

export function normalizeDraftListFilter(filter?: string): StudioDraftListFilter {
  if (
    filter === "story" ||
    filter === "chapter" ||
    filter === "swipe" ||
    filter === "seo" ||
    filter === "template"
  ) {
    return filter;
  }

  return "all";
}

export async function getStudioDraftsPage(
  profileId: string,
  options?: {
    filter?: string;
    search?: string;
    page?: string;
  }
) {
  const activeFilter = normalizeDraftListFilter(options?.filter);
  const search = (options?.search ?? "").trim().toLowerCase();
  const page = parseStudioPage(options?.page);

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("creator_drafts")
      .select(
        `id, draft_type, title, status, last_saved_at, story_id, chapter_id, plain_text,
        stories(title),
        episodes(title, episode_number)`
      )
      .eq("owner_id", profileId)
      .eq("status", "draft")
      .order("last_saved_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as unknown as DraftRow[];

    const counts: Record<StudioDraftListFilter, number> = {
      all: rows.length,
      chapter: rows.filter((row) => row.draft_type === "chapter").length,
      seo: rows.filter((row) => row.draft_type === "seo").length,
      story: rows.filter((row) => row.draft_type === "story").length,
      swipe: rows.filter((row) => row.draft_type === "swipe").length,
      template: rows.filter((row) => row.draft_type === "template").length
    };

    const filtered = rows
      .filter((row) =>
        activeFilter === "all" ? true : row.draft_type === activeFilter
      )
      .filter((row) => {
        if (!search) {
          return true;
        }

        const story = firstRelation(row.stories);
        const episode = firstRelation(row.episodes);
        const haystack = [
          row.title,
          row.plain_text,
          story?.title,
          episode?.title,
          episode?.episode_number
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      })
      .map((row): StudioDraftListItem => {
        const story = firstRelation(row.stories);
        const episode = firstRelation(row.episodes);

        return {
          chapterId: row.chapter_id,
          chapterNumber: episode?.episode_number ?? null,
          chapterTitle: episode?.title ?? null,
          draftType: row.draft_type,
          id: row.id,
          lastSavedAt: row.last_saved_at,
          resumeHref: resumeHref(row),
          status: row.status,
          storyId: row.story_id,
          storyTitle: story?.title ?? null,
          title: displayTitle(row)
        };
      });

    const paginated = paginateList(filtered, page);

    return {
      counts,
      drafts: paginated.items,
      error: null,
      page: paginated.page,
      total: paginated.total,
      totalPages: paginated.totalPages
    };
  } catch (error) {
    return {
      counts: {
        all: 0,
        chapter: 0,
        seo: 0,
        story: 0,
        swipe: 0,
        template: 0
      },
      drafts: [] as StudioDraftListItem[],
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách nháp.",
      page: 1,
      total: 0,
      totalPages: 1
    };
  }
}
