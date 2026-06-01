import { analyticsEvents } from "@/lib/analytics/events";
import { isNeedsActionStatus } from "@/lib/content-quality/labels";
import type { ContentQualityStatus } from "@/types/content-quality";
import {
  hasStandaloneContent,
  isStandaloneStory,
  mapStoryStructureFromRow
} from "@/lib/stories/story-structure";
import { createClient } from "@/lib/supabase/server";
import { mapStoryImageRow } from "@/lib/images/map-story-image";
import { STORY_IMAGE_SELECT_COLUMNS } from "@/lib/images/get-current-story-image";
import { resolveStoryImageUrl } from "@/lib/images/get-current-story-image";
import { paginateList, parseStudioPage } from "@/lib/studio/pagination";
import { studioPath } from "@/lib/studio/constants";
import {
  STUDIO_LIST_PAGE_SIZE_DEFAULT,
  STUDIO_LIST_PAGE_SIZES,
  type StudioListPageSize
} from "@/types/studio";
import { resolveStoryDisplayStatus } from "@/lib/studio/status-labels";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type {
  StudioDbContentStatus,
  StudioDisplayStatus,
  StudioStoryListFilter,
  StudioStorySort
} from "@/types/studio";
import {
  loadStoryIdsMatchingTaxonomyFilters,
  type StudioTaxonomyListFilters
} from "@/lib/studio/filter-stories-taxonomy";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import {
  loadCreatorMainGenreFilterOptions,
  loadMainGenreLabelsByStoryIds,
  pickMainGenreFromLabels
} from "@/lib/taxonomy/story-genre-labels";
import { loadStoryMainGenreTermIndex } from "@/lib/ranking/story-main-genre-index";
import type {
  StudioStoriesOverview,
  StudioStoryAttentionItem,
  StudioStoryGenreOption
} from "@/types/studio-stories";
import type { StoryImage, StoryImageRow } from "@/types/story-images";

export type { StudioStoryListFilter, StudioStorySort };

const READ_EVENT_NAMES = [
  analyticsEvents.openStory,
  analyticsEvents.storyViewed,
  analyticsEvents.chapterOpened
] as const;

const STALE_DRAFT_DAYS = 14;

export type StudioStory = {
  id: string;
  title: string;
  slug: string;
  publicCode: string;
  description: string | null;
  genreId: string | null;
  genreName: string | null;
  contentTypeName: string | null;
  taxonomyTagPreview: string[];
  status: StudioDbContentStatus;
  displayStatus: StudioDisplayStatus;
  visibility: "public" | "private";
  isCompleted: boolean;
  episodeCount: number;
  draftChapterCount: number;
  structureType: "chaptered" | "standalone";
  standaloneReadingTimeMinutes: number;
  readCount: number | null;
  reads7d: number;
  saves7d: number;
  newComments7d: number;
  coverThumbUrl: string | null;
  missingCover: boolean;
  missingDescription: boolean;
  noChapters: boolean;
  hasQualityWarning: boolean;
  staleDraftCount: number;
  attentionScore: number;
  updatedAt: string;
  createdAt: string;
};

export type StudioStoriesResult = {
  stories: StudioStory[];
  counts: Record<StudioStoryListFilter, number>;
  overview: StudioStoriesOverview;
  attentionItems: StudioStoryAttentionItem[];
  filteredStoryIds: string[];
  genres: StudioStoryGenreOption[];
  page: number;
  pageSize: StudioListPageSize;
  totalPages: number;
  total: number;
  error: string | null;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  public_code: string;
  hook: string | null;
  short_description: string | null;
  status: StudioDbContentStatus;
  visibility: "public" | "private";
  is_completed: boolean;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
  structure_type?: string | null;
  standalone_plain_text?: string | null;
  standalone_reading_time_minutes?: number | null;
};

type EpisodeRow = {
  story_id: string;
  status: string;
  updated_at: string;
};

type QualityRow = {
  story_id: string | null;
  status: ContentQualityStatus;
};

const emptyCounts = (): Record<StudioStoryListFilter, number> => ({
  all: 0,
  completed: 0,
  draft: 0,
  hidden: 0,
  live: 0,
  missing_cover: 0,
  rejected: 0,
  scheduled: 0
});

const emptyOverview = (): StudioStoriesOverview => ({
  completed: 0,
  draft: 0,
  live: 0,
  missingCover: 0,
  reads7d: 0,
  rejected: 0,
  scheduled: 0,
  total: 0
});

function countByTarget(rows: Array<{ target_id: string }> | null) {
  const map = new Map<string, number>();

  for (const row of rows ?? []) {
    map.set(row.target_id, (map.get(row.target_id) ?? 0) + 1);
  }

  return map;
}

function countByStoryId(rows: Array<{ story_id: string }> | null) {
  const map = new Map<string, number>();

  for (const row of rows ?? []) {
    map.set(row.story_id, (map.get(row.story_id) ?? 0) + 1);
  }

  return map;
}

function storyMatchesFilter(story: StoryRow, missingCover: boolean): Record<StudioStoryListFilter, boolean> {
  return {
    all: true,
    completed: story.is_completed,
    draft: story.status === "draft",
    hidden:
      story.status === "archived" ||
      (story.visibility === "private" &&
        (story.status === "published" || story.status === "approved")),
    live: story.status === "published" && story.visibility === "public",
    missing_cover: missingCover,
    rejected: story.status === "rejected",
    scheduled: story.status === "approved" || story.status === "pending"
  };
}

export function normalizeStudioStoryFilter(filter?: string): StudioStoryListFilter {
  if (
    filter === "draft" ||
    filter === "live" ||
    filter === "scheduled" ||
    filter === "completed" ||
    filter === "rejected" ||
    filter === "hidden" ||
    filter === "missing_cover" ||
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
  if (
    sort === "created" ||
    sort === "reads" ||
    sort === "reads_7d" ||
    sort === "comments" ||
    sort === "saves" ||
    sort === "title" ||
    sort === "chapters" ||
    sort === "main_genre" ||
    sort === "needs_attention" ||
    sort === "updated_asc"
  ) {
    return sort;
  }

  return "updated";
}

export function parseStudioStoryPageSize(value?: string): StudioListPageSize {
  const parsed = Number.parseInt(value ?? "", 10);

  if (STUDIO_LIST_PAGE_SIZES.includes(parsed as StudioListPageSize)) {
    return parsed as StudioListPageSize;
  }

  return STUDIO_LIST_PAGE_SIZE_DEFAULT;
}

export function getStudioStorySearch(value?: string) {
  return (value ?? "").trim();
}

function sortStories(stories: StudioStory[], sort: StudioStorySort) {
  const copy = [...stories];

  copy.sort((a, b) => {
    switch (sort) {
      case "created":
        return b.createdAt.localeCompare(a.createdAt);
      case "reads":
        return (b.readCount ?? 0) - (a.readCount ?? 0);
      case "reads_7d":
        return b.reads7d - a.reads7d;
      case "comments":
        return b.newComments7d - a.newComments7d;
      case "saves":
        return b.saves7d - a.saves7d;
      case "title":
        return a.title.localeCompare(b.title, "vi");
      case "chapters":
        return b.episodeCount - a.episodeCount;
      case "main_genre": {
        const ga = (a.genreName ?? "").localeCompare(b.genreName ?? "", "vi");
        return ga !== 0 ? ga : b.updatedAt.localeCompare(a.updatedAt);
      }
      case "needs_attention":
        return b.attentionScore - a.attentionScore || b.updatedAt.localeCompare(a.updatedAt);
      case "updated_asc":
        return a.updatedAt.localeCompare(b.updatedAt);
      case "updated":
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });

  return copy;
}

function matchesSearch(story: StoryRow, search: string) {
  if (!search) {
    return true;
  }

  const description = story.short_description?.trim() || story.hook?.trim() || "";
  const haystack = [story.title, description].join(" ").toLowerCase();

  return haystack.includes(search);
}

function computeAttentionScore(input: {
  missingCover: boolean;
  missingDescription: boolean;
  noChapters: boolean;
  hasQualityWarning: boolean;
  newComments7d: number;
  staleDraftCount: number;
}) {
  let score = 0;

  if (input.hasQualityWarning) {
    score += 15;
  }

  if (input.missingCover) {
    score += 10;
  }

  if (input.noChapters) {
    score += 8;
  }

  if (input.staleDraftCount > 0) {
    score += 6;
  }

  if (input.missingDescription) {
    score += 4;
  }

  if (input.newComments7d > 0) {
    score += 3;
  }

  return score;
}

function hasActiveTaxonomyFilters(filters: StudioTaxonomyListFilters) {
  return Boolean(
    filters.mainGenreTermId ||
      filters.subgenreTermId ||
      filters.contentTypeTermId ||
      filters.presentationMode ||
      filters.ageRatingTermId ||
      filters.hasContentWarning !== undefined
  );
}

function canPaginateStudioStoriesAtDb(
  sort: StudioStorySort,
  filter: StudioStoryListFilter,
  search: string,
  _taxonomyFilters: StudioTaxonomyListFilters
) {
  return (
    !search &&
    filter === "all" &&
    (sort === "updated" ||
      sort === "updated_asc" ||
      sort === "created" ||
      sort === "title")
  );
}

function buildAttentionStorySnapshot(
  story: StoryRow,
  input: {
    missingCover: boolean;
    episodeCount: number;
    staleDraftCount: number;
    newComments7d: number;
    hasQualityWarning: boolean;
  }
): StudioStory {
  const structure = mapStoryStructureFromRow(story);
  const description = story.short_description?.trim() || story.hook?.trim() || null;
  return {
    attentionScore: computeAttentionScore({
      hasQualityWarning: input.hasQualityWarning,
      missingCover: input.missingCover,
      missingDescription: !description,
      newComments7d: input.newComments7d,
      noChapters: isStandaloneStory(structure)
        ? !hasStandaloneContent(structure)
        : input.episodeCount === 0,
      staleDraftCount: input.staleDraftCount
    }),
    coverThumbUrl: null,
    createdAt: story.created_at,
    description,
    displayStatus: resolveStoryDisplayStatus({
      isCompleted: story.is_completed,
      status: story.status,
      visibility: story.visibility
    }),
    draftChapterCount: 0,
    episodeCount: input.episodeCount,
    structureType: structure.structureType,
    standaloneReadingTimeMinutes: structure.standaloneReadingTimeMinutes,
    genreId: null,
    genreName: null,
    hasQualityWarning: input.hasQualityWarning,
    id: story.id,
    isCompleted: story.is_completed,
    missingCover: input.missingCover,
    missingDescription: !description,
    newComments7d: input.newComments7d,
    noChapters: isStandaloneStory(structure)
      ? !hasStandaloneContent(structure)
      : input.episodeCount === 0,
    readCount: null,
    reads7d: 0,
    saves7d: 0,
    publicCode: story.public_code,
    slug: story.slug,
    staleDraftCount: input.staleDraftCount,
    status: story.status,
    title: story.title,
    updatedAt: story.updated_at,
    visibility: story.visibility,
    contentTypeName: null,
    taxonomyTagPreview: []
  };
}

function buildAttentionItems(stories: StudioStory[]): StudioStoryAttentionItem[] {
  const items: StudioStoryAttentionItem[] = [];

  for (const story of stories) {
    const editHref = studioPath(`/stories/${story.id}/edit`);
    const chaptersHref = studioPath(`/stories/${story.id}/chapters`);
    const contentHref = studioPath(`/stories/${story.id}/content`);
    const manageHref =
      story.structureType === "standalone" ? contentHref : chaptersHref;
    const newChapterHref = studioPath(`/stories/${story.id}/chapters/new`);
    const commentsHref = studioPath(`/comments?story=${story.id}`);
    const isStandalone = story.structureType === "standalone";

    if (story.hasQualityWarning) {
      items.push({
        ctaLabel: "Sửa nội dung",
        href: editHref,
        id: `${story.id}-quality`,
        kind: "quality_warning",
        label: "Cảnh báo chất lượng nội dung",
        storyId: story.id,
        storyTitle: story.title
      });
    }

    if (story.missingCover) {
      items.push({
        ctaLabel: "Thêm bìa",
        href: editHref,
        id: `${story.id}-cover`,
        kind: "missing_cover",
        label: "Thiếu ảnh bìa",
        secondaryHref: editHref,
        secondaryLabel: "Sửa truyện",
        storyId: story.id,
        storyTitle: story.title
      });
    }

    if (story.missingDescription) {
      items.push({
        ctaLabel: "Sửa truyện",
        href: editHref,
        id: `${story.id}-desc`,
        kind: "missing_description",
        label: "Chưa có mô tả",
        storyId: story.id,
        storyTitle: story.title
      });
    }

    if (story.noChapters) {
      items.push({
        ctaLabel: isStandalone ? "Soạn nội dung" : "Viết chương",
        href: isStandalone ? contentHref : newChapterHref,
        id: `${story.id}-chapters`,
        kind: "no_chapters",
        label: isStandalone ? "Chưa có nội dung" : "Chưa có chương",
        storyId: story.id,
        storyTitle: story.title
      });
    }

    if (!isStandalone && story.staleDraftCount > 0) {
      items.push({
        ctaLabel: "Viết tiếp",
        href: chaptersHref,
        id: `${story.id}-stale`,
        kind: "stale_draft",
        label: `${story.staleDraftCount} chương nháp lâu chưa đăng`,
        storyId: story.id,
        storyTitle: story.title
      });
    }

    if (story.newComments7d > 0) {
      items.push({
        ctaLabel: "Xem bình luận",
        href: commentsHref,
        id: `${story.id}-comments`,
        kind: "new_comments",
        label: `${story.newComments7d} bình luận mới`,
        storyId: story.id,
        storyTitle: story.title
      });
    }
  }

  return items
    .sort((a, b) => {
      const priority: Record<StudioStoryAttentionItem["kind"], number> = {
        missing_cover: 4,
        missing_description: 3,
        new_comments: 3,
        no_chapters: 2,
        quality_warning: 5,
        stale_draft: 1
      };

      return priority[b.kind] - priority[a.kind];
    });
}

export async function getStudioStoriesPage(
  creatorProfile: CreatorProfile,
  options?: {
    filter?: string;
    search?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
    contentTypeTerm?: string;
    mainGenreTerm?: string;
    subgenreTerm?: string;
    presentationMode?: string;
    ageRatingTerm?: string;
    hasWarning?: string;
  }
): Promise<StudioStoriesResult> {
  const activeFilter = normalizeStudioStoryFilter(options?.filter);
  const activeSearch = getStudioStorySearch(options?.search).toLowerCase();
  const activeSort = normalizeStudioStorySort(options?.sort);
  const taxonomyFilters: StudioTaxonomyListFilters = {
    contentTypeTermId: (options?.contentTypeTerm ?? "").trim() || undefined,
    mainGenreTermId: (options?.mainGenreTerm ?? "").trim() || undefined,
    subgenreTermId: (options?.subgenreTerm ?? "").trim() || undefined,
    presentationMode: (options?.presentationMode ?? "").trim() || undefined,
    ageRatingTermId: (options?.ageRatingTerm ?? "").trim() || undefined,
    hasContentWarning:
      options?.hasWarning === "yes"
        ? true
        : options?.hasWarning === "no"
          ? false
          : undefined
  };
  const activePage = parseStudioPage(options?.page);
  const activePageSize = parseStudioStoryPageSize(options?.pageSize);

  try {
    const supabase = await createClient();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const staleBefore = new Date(
      Date.now() - STALE_DRAFT_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const useDbPagination = canPaginateStudioStoriesAtDb(
      activeSort,
      activeFilter,
      activeSearch,
      taxonomyFilters
    );

    let rows: StoryRow[] = [];
    let allCreatorRows: StoryRow[] = [];
    let dbTotal = 0;
    let precomputedTaxonomyAllowed: Set<string> | null = null;

    if (useDbPagination) {
      const offset = (activePage - 1) * activePageSize;
      const ascending = activeSort === "updated_asc" || activeSort === "title";
      const orderColumn =
        activeSort === "created"
          ? "created_at"
          : activeSort === "title"
            ? "title"
            : "updated_at";

      const listSelect =
        "id, title, slug, public_code, hook, short_description, status, visibility, is_completed, cover_url, created_at, updated_at, structure_type, standalone_plain_text, standalone_reading_time_minutes";

      const hasTaxonomyFilter = hasActiveTaxonomyFilters(taxonomyFilters);

      if (hasTaxonomyFilter) {
        const { data: allRowsData, error: allRowsError } = await supabase
          .from("stories")
          .select(listSelect)
          .eq("creator_id", creatorProfile.id);

        if (allRowsError) {
          throw allRowsError;
        }

        allCreatorRows = (allRowsData ?? []) as unknown as StoryRow[];
        const allowedIds = [
          ...(await loadStoryIdsMatchingTaxonomyFilters(
            supabase,
            allCreatorRows.map((story) => story.id),
            taxonomyFilters
          ))
        ];
        precomputedTaxonomyAllowed = new Set(allowedIds);
        dbTotal = allowedIds.length;

        if (allowedIds.length === 0) {
          rows = [];
        } else {
          const { data: pageRowsData, error: pageRowsError } = await supabase
            .from("stories")
            .select(listSelect)
            .eq("creator_id", creatorProfile.id)
            .in("id", allowedIds)
            .order(orderColumn, { ascending })
            .range(offset, offset + activePageSize - 1);

          if (pageRowsError) {
            throw pageRowsError;
          }

          rows = (pageRowsData ?? []) as unknown as StoryRow[];
        }
      } else {
        const [allRowsResult, pageRowsResult] = await Promise.all([
          supabase
            .from("stories")
            .select(listSelect)
            .eq("creator_id", creatorProfile.id),
          supabase
            .from("stories")
            .select(listSelect, { count: "exact" })
            .eq("creator_id", creatorProfile.id)
            .order(orderColumn, { ascending })
            .range(offset, offset + activePageSize - 1)
        ]);

        if (allRowsResult.error) {
          throw allRowsResult.error;
        }
        if (pageRowsResult.error) {
          throw pageRowsResult.error;
        }

        allCreatorRows = (allRowsResult.data ?? []) as unknown as StoryRow[];
        rows = (pageRowsResult.data ?? []) as unknown as StoryRow[];
        dbTotal = pageRowsResult.count ?? rows.length;
      }
    } else {
      const { data, error } = await supabase
        .from("stories")
        .select(
          "id, title, slug, public_code, hook, short_description, status, visibility, is_completed, cover_url, created_at, updated_at, structure_type, standalone_plain_text, standalone_reading_time_minutes"
        )
        .eq("creator_id", creatorProfile.id)
        .order("updated_at", { ascending: false });

      if (error) {
        throw error;
      }

      allCreatorRows = (data ?? []) as unknown as StoryRow[];
      rows = allCreatorRows;
    }

    const storyIds = allCreatorRows.map((story) => story.id);

    const taxonomyAllowed =
      precomputedTaxonomyAllowed ??
      (await loadStoryIdsMatchingTaxonomyFilters(
        supabase,
        storyIds,
        taxonomyFilters
      ));

    const storiesWithCurrentImage = new Set<string>();
    if (storyIds.length > 0) {
      const { data: currentImageRows } = await supabase
        .from("story_images")
        .select("story_id")
        .in("story_id", storyIds)
        .eq("is_current", true);
      for (const row of currentImageRows ?? []) {
        storiesWithCurrentImage.add(String(row.story_id));
      }
    }

    const missingCoverByStoryId = new Map(
      allCreatorRows.map((story) => [
        story.id,
        !story.cover_url && !storiesWithCurrentImage.has(story.id)
      ])
    );

    const candidateRows = useDbPagination
      ? rows
      : allCreatorRows
          .filter((story) => taxonomyAllowed.has(story.id))
          .filter((story) => matchesSearch(story, activeSearch))
          .filter((story) => {
            const flags = storyMatchesFilter(
              story,
              missingCoverByStoryId.get(story.id) ?? false
            );
            return flags[activeFilter];
          });

    const candidateIds = candidateRows.map((story) => story.id);
    const episodeCountByStory = new Map<string, number>();
    const draftCountByStory = new Map<string, number>();
    const staleDraftCountByStory = new Map<string, number>();
    const readCountByStory = new Map<string, number>();
    const reads7dByStory = new Map<string, number>();
    const saves7dByStory = new Map<string, number>();
    const comments7dByStory = new Map<string, number>();
    const imageByStory = new Map<string, StoryImage>();
    const qualityWarningByStory = new Set<string>();

    if (storyIds.length > 0) {
      const [reads7dRows, attentionEpisodeRows, attentionQualityRows, attentionCommentRows] =
        await Promise.all([
          supabase
            .from("analytics_events")
            .select("target_id")
            .in("target_id", storyIds)
            .in("event_name", [...READ_EVENT_NAMES])
            .gte("created_at", weekAgo),
          supabase
            .from("episodes")
            .select("story_id, status, updated_at")
            .in("story_id", storyIds),
          supabase
            .from("content_quality_reviews")
            .select("story_id, status")
            .in("story_id", storyIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("comments")
            .select("story_id")
            .in("story_id", storyIds)
            .eq("status", "visible")
            .gte("created_at", weekAgo)
        ]);

      if (reads7dRows.error) {
        throw reads7dRows.error;
      }

      for (const [storyId, count] of countByTarget(
        reads7dRows.data as Array<{ target_id: string }> | null
      )) {
        reads7dByStory.set(storyId, count);
      }

      for (const episode of (attentionEpisodeRows.data ?? []) as EpisodeRow[]) {
        episodeCountByStory.set(
          episode.story_id,
          (episodeCountByStory.get(episode.story_id) ?? 0) + 1
        );

        if (episode.status === "draft") {
          draftCountByStory.set(
            episode.story_id,
            (draftCountByStory.get(episode.story_id) ?? 0) + 1
          );

          if (episode.updated_at <= staleBefore) {
            staleDraftCountByStory.set(
              episode.story_id,
              (staleDraftCountByStory.get(episode.story_id) ?? 0) + 1
            );
          }
        }
      }

      for (const row of (attentionQualityRows.data ?? []) as QualityRow[]) {
        if (row.story_id && isNeedsActionStatus(row.status)) {
          qualityWarningByStory.add(row.story_id);
        }
      }

      for (const [storyId, count] of countByStoryId(
        attentionCommentRows.data as Array<{ story_id: string }> | null
      )) {
        comments7dByStory.set(storyId, count);
      }
    }

    if (candidateIds.length > 0) {
      const [readsRows, savesRows, imageRows] = await Promise.all([
        supabase
          .from("analytics_events")
          .select("target_id")
          .in("target_id", candidateIds)
          .eq("event_name", "open_story"),
        supabase
          .from("bookshelf_items")
          .select("story_id")
          .in("story_id", candidateIds)
          .gte("created_at", weekAgo),
        supabase
          .from("story_images")
          .select(STORY_IMAGE_SELECT_COLUMNS)
          .in("story_id", candidateIds)
          .eq("is_current", true)
      ]);

      if (readsRows.error) {
        throw readsRows.error;
      }

      if (savesRows.error) {
        throw savesRows.error;
      }

      if (imageRows.error) {
        throw imageRows.error;
      }

      for (const event of (readsRows.data ?? []) as Array<{ target_id: string }>) {
        readCountByStory.set(
          event.target_id,
          (readCountByStory.get(event.target_id) ?? 0) + 1
        );
      }

      for (const [storyId, count] of countByStoryId(
        savesRows.data as Array<{ story_id: string }> | null
      )) {
        saves7dByStory.set(storyId, count);
      }

      for (const row of (imageRows.data ?? []) as StoryImageRow[]) {
        imageByStory.set(row.story_id, mapStoryImageRow(row));
      }
    }

    const genreMap = new Map<string, string>();
    const [mainGenreIndex, taxonomyByStory] = await Promise.all([
      loadStoryMainGenreTermIndex(supabase, candidateIds),
      loadMainGenreLabelsByStoryIds(supabase, candidateIds)
    ]);

    const enrichedStories = candidateRows.map((story) => {
      const image = imageByStory.get(story.id) ?? null;
      const coverThumbUrl = resolveStoryImageUrl({
        coverUrl: story.cover_url,
        image,
        variant: "thumb"
      });
      const description =
        story.short_description?.trim() || story.hook?.trim() || null;
      const reads = readCountByStory.get(story.id) ?? 0;
      const reads7d = reads7dByStory.get(story.id) ?? 0;
      const saves7d = saves7dByStory.get(story.id) ?? 0;
      const newComments7d = comments7dByStory.get(story.id) ?? 0;
      const episodeCount = episodeCountByStory.get(story.id) ?? 0;
      const draftChapterCount = draftCountByStory.get(story.id) ?? 0;
      const staleDraftCount = staleDraftCountByStory.get(story.id) ?? 0;
      const structure = mapStoryStructureFromRow(story);
      const missingCover = missingCoverByStoryId.get(story.id) ?? false;
      const missingDescription = !description;
      const noChapters = isStandaloneStory(structure)
        ? !hasStandaloneContent(structure)
        : episodeCount === 0;
      const hasQualityWarning = qualityWarningByStory.has(story.id);
      const taxonomy = taxonomyByStory.get(story.id);
      const picked = pickMainGenreFromLabels(taxonomy);
      const mainGenreTermId = mainGenreIndex.get(story.id) ?? null;
      const genreId = mainGenreTermId ?? null;
      const genreName = picked.genreName;

      if (genreId && genreName) {
        genreMap.set(genreId, genreName);
      }

      const attentionScore = computeAttentionScore({
        hasQualityWarning,
        missingCover,
        missingDescription,
        newComments7d,
        noChapters,
        staleDraftCount
      });

      return {
        attentionScore,
        coverThumbUrl,
        createdAt: story.created_at,
        description,
        displayStatus: resolveStoryDisplayStatus({
          isCompleted: story.is_completed,
          status: story.status,
          visibility: story.visibility
        }),
        draftChapterCount,
        episodeCount,
        structureType: structure.structureType,
        standaloneReadingTimeMinutes: structure.standaloneReadingTimeMinutes,
        genreId,
        genreName,
        hasQualityWarning,
        id: story.id,
        isCompleted: story.is_completed,
        missingCover,
        missingDescription,
        newComments7d,
        noChapters,
        readCount: reads > 0 ? reads : null,
        reads7d,
        saves7d,
        publicCode: story.public_code,
        slug: story.slug,
        staleDraftCount,
        status: story.status,
        title: story.title,
        updatedAt: story.updated_at,
        visibility: story.visibility,
        contentTypeName: null,
        taxonomyTagPreview: [] as string[]
      };
    });

    const counts = emptyCounts();
    let totalReads7d = 0;

    for (const story of allCreatorRows) {
      const missingCover = missingCoverByStoryId.get(story.id) ?? false;
      const flags = storyMatchesFilter(story, missingCover);

      for (const key of Object.keys(flags) as StudioStoryListFilter[]) {
        if (flags[key]) {
          counts[key] += 1;
        }
      }

      totalReads7d += reads7dByStory.get(story.id) ?? 0;
    }

    const overview: StudioStoriesOverview = {
      completed: counts.completed,
      draft: counts.draft,
      live: counts.live,
      missingCover: counts.missing_cover,
      reads7d: totalReads7d,
      rejected: counts.rejected,
      scheduled: counts.scheduled,
      total: counts.all
    };

    const taxonomyGenreOptions = await loadCreatorMainGenreFilterOptions(
      supabase,
      creatorProfile.id
    );
    const genres: StudioStoryGenreOption[] = (
      taxonomyGenreOptions.length > 0
        ? taxonomyGenreOptions
        : [...genreMap.entries()].map(([id, name]) => ({ id, name }))
    ).sort((a, b) => a.name.localeCompare(b.name, "vi"));

    const attentionItems = buildAttentionItems(
      allCreatorRows.map((story) =>
        buildAttentionStorySnapshot(story, {
          missingCover: missingCoverByStoryId.get(story.id) ?? false,
          episodeCount: episodeCountByStory.get(story.id) ?? 0,
          staleDraftCount: staleDraftCountByStory.get(story.id) ?? 0,
          newComments7d: comments7dByStory.get(story.id) ?? 0,
          hasQualityWarning: qualityWarningByStory.has(story.id)
        })
      )
    );

    const sorted = useDbPagination
      ? enrichedStories
      : sortStories(enrichedStories, activeSort);
    const paginated = useDbPagination
      ? {
          items: sorted,
          page: activePage,
          pageSize: activePageSize,
          total: dbTotal,
          totalPages: Math.max(1, Math.ceil(dbTotal / activePageSize))
        }
      : paginateList(sorted, activePage, activePageSize);

    const taxonomyLabels = await getStoryTaxonomyLabelsByStoryIds(
      supabase,
      paginated.items.map((s) => s.id)
    );

    const storiesWithTaxonomy = paginated.items.map((story) => {
      const labels = taxonomyLabels.get(story.id);
      const tagPreview = [
        ...(labels?.subgenreNames ?? []).slice(0, 1),
        ...(labels?.tagNames ?? []).slice(0, 2)
      ].slice(0, 3);

      return {
        ...story,
        genreName: labels?.mainGenreName ?? story.genreName,
        contentTypeName: labels?.contentTypeName ?? null,
        taxonomyTagPreview: tagPreview
      };
    });

    return {
      attentionItems,
      counts,
      error: null,
      filteredStoryIds: sorted.map((story) => story.id),
      genres,
      overview,
      page: paginated.page,
      pageSize: activePageSize,
      stories: storiesWithTaxonomy,
      total: paginated.total,
      totalPages: paginated.totalPages
    };
  } catch (caught) {
    return {
      attentionItems: [],
      counts: emptyCounts(),
      error:
        caught instanceof Error
          ? caught.message
          : "Không thể tải danh sách truyện.",
      filteredStoryIds: [],
      genres: [],
      overview: emptyOverview(),
      page: 1,
      pageSize: STUDIO_LIST_PAGE_SIZE_DEFAULT,
      stories: [],
      total: 0,
      totalPages: 1
    };
  }
}
