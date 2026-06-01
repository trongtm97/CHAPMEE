import { createClient } from "@/lib/supabase/server";
import { isStandaloneStory, normalizeStoryStructureType } from "@/lib/stories/story-structure";
import { mapDraftRowToItem, isDraftStale } from "@/lib/studio/draft-item";
import {
  normalizeDraftSort,
  normalizeDraftStatusFilter,
  normalizeDraftTimeFilter,
  parseDraftPageSize
} from "@/lib/studio/drafts-query";
import { paginateList, parseStudioPage } from "@/lib/studio/pagination";
import { studioPath } from "@/lib/studio/constants";
import type {
  DraftItem,
  DraftSort,
  DraftStatusFilter,
  DraftTimeFilter,
  StudioDraftListFilter,
  StudioDraftStats,
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
  stories:
    | { title: string; structure_type?: string | null }
    | { title: string; structure_type?: string | null }[]
    | null;
  episodes:
    | { title: string; episode_number: number }
    | { title: string; episode_number: number }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export function normalizeDraftListFilter(filter?: string): StudioDraftListFilter {
  if (
    filter === "story" ||
    filter === "chapter" ||
    filter === "reels" ||
    filter === "seo" ||
    filter === "template" ||
    filter === "standalone_content"
  ) {
    return filter;
  }

  return "all";
}

function matchesStatusFilter(item: DraftItem, filter: DraftStatusFilter) {
  switch (filter) {
    case "writing":
      return item.displayStatus === "autosaved" || item.displayStatus === "writing";
    case "incomplete":
      return (
        item.displayStatus === "missing_title" ||
        item.displayStatus === "missing_content" ||
        item.displayStatus === "not_ready"
      );
    case "ready":
      return item.canPublish;
    case "has_errors":
      return item.missingFields.length > 0;
    case "stale":
      return item.isStale;
    default:
      return true;
  }
}

function matchesTimeFilter(item: DraftItem, filter: DraftTimeFilter, now = Date.now()) {
  if (filter === "all") {
    return true;
  }

  const updated = new Date(item.updatedAt).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  switch (filter) {
    case "recent":
      return now - updated <= 3 * dayMs;
    case "today":
      return now - updated <= dayMs;
    case "7d":
      return now - updated <= 7 * dayMs;
    case "30d":
      return now - updated <= 30 * dayMs;
    case "older":
      return isDraftStale(item.updatedAt, now);
    default:
      return true;
  }
}

function sortDraftItems(items: DraftItem[], sort: DraftSort) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sort) {
      case "updated_asc":
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case "title":
        return a.title.localeCompare(b.title, "vi");
      case "type":
        return a.type.localeCompare(b.type) || b.updatedAt.localeCompare(a.updatedAt);
      case "priority":
        return b.updatedAt.localeCompare(a.updatedAt);
      case "updated":
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });

  return sorted;
}

function computeStats(items: DraftItem[]): StudioDraftStats {
  return {
    atRisk: items.filter(
      (item) => item.missingFields.length > 0 || item.autosaveStatus === "error"
    ).length,
    chapter: items.filter((item) => item.type === "chapter").length,
    standaloneContent: items.filter((item) => item.structureLabel === "standalone").length,
    reels: items.filter((item) => item.type === "reels").length,
    seo: items.filter((item) => item.type === "seo").length,
    stale: items.filter((item) => item.isStale).length,
    story: items.filter((item) => item.type === "story").length,
    total: items.length
  };
}

function computeWriteChapterHref(items: DraftItem[]) {
  const standaloneDraft = items.find(
    (item) => item.structureLabel === "standalone" && item.storyId
  );
  if (standaloneDraft?.storyId) {
    return studioPath(`/stories/${standaloneDraft.storyId}/content`);
  }

  const chapterDraft = items.find((item) => item.type === "chapter" && item.storyId);
  if (chapterDraft?.storyId) {
    return studioPath(`/stories/${chapterDraft.storyId}/chapters/new`);
  }

  const storyDraft = items.find((item) => item.type === "story" && item.storyId);
  if (storyDraft?.storyId) {
    if (storyDraft.structureLabel === "standalone") {
      return studioPath(`/stories/${storyDraft.storyId}/content`);
    }
    return studioPath(`/stories/${storyDraft.storyId}/chapters/new`);
  }

  return studioPath("/stories");
}

export async function getStudioDraftsPage(
  profileId: string,
  options?: {
    filter?: string;
    status?: string;
    time?: string;
    sort?: string;
    search?: string;
    page?: string;
    pageSize?: string;
  }
) {
  const activeFilter = normalizeDraftListFilter(options?.filter);
  const statusFilter = normalizeDraftStatusFilter(options?.status);
  const timeFilter = normalizeDraftTimeFilter(options?.time);
  const activeSort = normalizeDraftSort(options?.sort);
  const search = (options?.search ?? "").trim().toLowerCase();
  const page = parseStudioPage(options?.page);
  const pageSize = parseDraftPageSize(options?.pageSize);

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("creator_drafts")
      .select(
        `id, draft_type, title, status, last_saved_at, story_id, chapter_id, plain_text,
        stories(title, structure_type),
        episodes(title, episode_number)`
      )
      .eq("owner_id", profileId)
      .eq("status", "draft")
      .order("last_saved_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as unknown as DraftRow[];

    const draftIds = rows.map((row) => row.id);
    const versionCounts = new Map<string, number>();

    if (draftIds.length > 0) {
      const { data: versionRows } = await supabase
        .from("creator_draft_versions")
        .select("draft_id")
        .in("draft_id", draftIds);

      for (const versionRow of versionRows ?? []) {
        const draftId = versionRow.draft_id as string;
        versionCounts.set(draftId, (versionCounts.get(draftId) ?? 0) + 1);
      }
    }

    const allItems = rows.map((row) =>
      mapDraftRowToItem(row, (versionCounts.get(row.id) ?? 0) > 0)
    );

    const stats = computeStats(allItems);

    const counts: Record<StudioDraftListFilter, number> = {
      all: allItems.length,
      chapter: stats.chapter,
      seo: stats.seo,
      story: stats.story - stats.standaloneContent,
      standalone_content: stats.standaloneContent,
      reels: stats.reels,
      template: allItems.filter((item) => item.type === "template").length
    };

    const filtered = allItems
      .filter((item) => {
        if (activeFilter === "all") return true;
        if (activeFilter === "standalone_content") {
          return item.structureLabel === "standalone";
        }
        if (activeFilter === "story") {
          return item.type === "story" && item.structureLabel !== "standalone";
        }
        return item.type === activeFilter;
      })
      .filter((item) => matchesStatusFilter(item, statusFilter))
      .filter((item) => matchesTimeFilter(item, timeFilter))
      .filter((item) => {
        if (!search) {
          return true;
        }

        const row = rows.find((candidate) => candidate.id === item.id);
        if (!row) {
          return false;
        }

        const story = firstRelation(row.stories);
        const episode = firstRelation(row.episodes);
        const haystack = [
          item.title,
          item.excerpt,
          item.parentStoryTitle,
          story?.title,
          episode?.title,
          episode?.episode_number
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      });

    const sorted = sortDraftItems(filtered, activeSort);
    const paginated = paginateList(sorted, page, pageSize);
    const recentDrafts = [...allItems]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 5);

    const attentionDrafts = allItems
      .filter((item) => item.isStale || item.missingFields.length > 0)
      .sort(
        (a, b) =>
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      )
      .slice(0, 5);

    return {
      attentionDrafts,
      counts,
      drafts: paginated.items,
      error: null,
      filteredIds: sorted.map((item) => item.id),
      page: paginated.page,
      pageSize: paginated.pageSize,
      recentDrafts,
      stats,
      total: paginated.total,
      totalPages: paginated.totalPages,
      writeChapterHref: computeWriteChapterHref(allItems)
    };
  } catch (error) {
    return {
      attentionDrafts: [] as DraftItem[],
      counts: {
        all: 0,
        chapter: 0,
        seo: 0,
        story: 0,
        standalone_content: 0,
        reels: 0,
        template: 0
      },
      drafts: [] as DraftItem[],
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách nháp.",
      filteredIds: [] as string[],
      page: 1,
      pageSize,
      recentDrafts: [] as DraftItem[],
      stats: {
        atRisk: 0,
        chapter: 0,
        reels: 0,
        seo: 0,
        stale: 0,
        story: 0,
        standaloneContent: 0,
        total: 0
      },
      total: 0,
      totalPages: 1,
      writeChapterHref: studioPath("/stories")
    };
  }
}
