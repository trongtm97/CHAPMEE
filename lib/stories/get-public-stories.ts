import {
  getEpisodeCountByStoryId,
  getFullAccessPriceByStoryId,
  getMinPaidChapterPriceByStoryId,
  getSaveCountByStoryId,
  loadPublicCatalogCandidateIds,
  sortStoryIdsByNullablePrice,
  sortStoryIdsByNumericMap
} from "@/lib/discovery/catalog-metrics";
import { enrichCatalogStories } from "@/lib/discovery/enrich-catalog-stories";
import { resolvePublicCatalogStoryIds } from "@/lib/discovery/resolve-catalog-story-ids";
import type { StoryCatalogFilterParams } from "@/lib/discovery/types";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import { normalizeStoryStructureType } from "@/lib/stories/story-structure";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { searchStoriesForCatalog } from "@/lib/search/catalog-bridge";
import { getStoryRankingScores } from "@/lib/ranking/getTrendingStories";
import { logSlowQuery } from "@/lib/dev/slow-query-log";
import {
  getCatalogStoryIdsByMetricView,
  isCatalogMetricViewSort
} from "@/lib/stories/catalog-metrics-view";
import { createPublicClient } from "@/lib/supabase/public-client";
import { getPublicGenresWithContent } from "@/lib/supabase/public-content";
import {
  CATALOG_STORY_ID_SELECT,
  CATALOG_STORY_SELECT,
  RANKING_CATALOG_LIMIT,
  clampPage,
  clampPageSize,
  escapeIlikePattern,
  getCatalogOffset,
  getTotalPages,
  isMetricSortedCatalog,
  isScoreSortedCatalog,
  type NormalizedCatalogParams
} from "@/lib/stories/story-catalog-query";
import type { StoryCatalogGenre, StoryCatalogSort, StoryCatalogStatus, StoryCatalogStory } from "@/types/story";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StoryCatalogParams = StoryCatalogFilterParams;

export type StoryCatalogResult = {
  stories: StoryCatalogStory[];
  genres: StoryCatalogGenre[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  genre: string;
  sort: StoryCatalogSort;
  status: StoryCatalogStatus;
  filters: StoryCatalogFilterParams;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  public_code: string;
  hook: string | null;
  short_description: string | null;
  cover_url: string | null;
  published_at: string | null;
  is_completed: boolean | null;
  structure_type?: string | null;
  standalone_reading_time_minutes?: number | null;
  creator_profiles:
    | {
        pen_name: string | null;
        profiles?:
          | { display_name: string | null; username: string | null }
          | { display_name: string | null; username: string | null }[]
          | null;
      }
    | {
        pen_name: string | null;
        profiles?:
          | { display_name: string | null; username: string | null }
          | { display_name: string | null; username: string | null }[]
          | null;
      }[]
    | null;
};

type StoryIdRow = {
  id: string;
  hook: string | null;
  title: string;
  short_description: string | null;
  is_completed: boolean | null;
};

type TaxonomyLabelMap = Awaited<
  ReturnType<typeof getStoryTaxonomyLabelsByStoryIds>
>;

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function isQuickRead(row: { genreSlug: string | null; hook: string | null }) {
  return row.genreSlug === "truyen-ngan" || (row.hook?.length ?? 0) <= 100;
}

function normalizeSort(value: string | undefined): StoryCatalogSort {
  if (
    value === "hot" ||
    value === "reads" ||
    value === "new" ||
    value === "completed" ||
    value === "quick" ||
    value === "title" ||
    value === "chapters" ||
    value === "saved" ||
    value === "price_asc" ||
    value === "price_desc" ||
    value === "chapter_price_asc" ||
    value === "chapter_price_desc"
  ) {
    return value;
  }
  return "updated";
}

function normalizeStatus(value: string | undefined): StoryCatalogStatus {
  if (value === "ongoing" || value === "completed") {
    return value;
  }
  return "all";
}

function toCatalogGenres(genreRows: Array<{ slug: string; name: string; story_count: number }>): StoryCatalogGenre[] {
  return genreRows.map((item) => ({
    slug: item.slug,
    name: item.name,
    storyCount: item.story_count
  }));
}

function normalizeParams(params: StoryCatalogParams): NormalizedCatalogParams {
  return {
    q: params.q?.trim() ?? "",
    genre: params.genre?.trim() ?? "",
    sort: normalizeSort(params.sort),
    status: normalizeStatus(params.status),
    page: clampPage(params.page ?? 1),
    pageSize: clampPageSize(params.pageSize ?? 20)
  };
}

function normalizeFilterParams(params: StoryCatalogParams): StoryCatalogFilterParams {
  return {
    q: params.q?.trim() || undefined,
    genre: params.genre?.trim() || undefined,
    subgenre: params.subgenre?.trim() || undefined,
    tag: params.tag?.trim() || undefined,
    character: params.character?.trim() || undefined,
    relationship: params.relationship?.trim() || undefined,
    narrativeStyle: params.narrativeStyle?.trim() || undefined,
    setting: params.setting?.trim() || undefined,
    experience: params.experience?.trim() || undefined,
    presentation: params.presentation?.trim() || undefined,
    contentType: params.contentType?.trim() || undefined,
    ageRating: params.ageRating?.trim() || undefined,
    access: params.access,
    hasWarning: params.hasWarning,
    hasNewChapter: params.hasNewChapter,
    sort: normalizeSort(params.sort),
    status: normalizeStatus(params.status),
    page: clampPage(params.page ?? 1),
    pageSize: clampPageSize(params.pageSize ?? 20)
  };
}

async function attachTaxonomyPreview(
  supabase: SupabaseClient,
  stories: StoryCatalogStory[]
) {
  if (stories.length === 0) return stories;
  const storyIds = stories.map((story) => story.id);
  const [labels, episodeCounts, saveCounts] = await Promise.all([
    getStoryTaxonomyLabelsByStoryIds(supabase, storyIds),
    getEpisodeCountByStoryId(supabase, storyIds),
    getSaveCountByStoryId(supabase, storyIds)
  ]);
  return stories.map((story) => {
    const taxonomy = labels.get(story.id);
    const saves = saveCounts.get(story.id) ?? 0;
    return {
      ...story,
      genreName: taxonomy?.mainGenreName ?? story.genreName,
      genreSlug: taxonomy?.mainGenreSlug ?? story.genreSlug,
      tagPreview: taxonomy?.tagNames.slice(0, 3) ?? story.tagPreview ?? [],
      chapterCount: episodeCounts.get(story.id) ?? 0,
      score: story.score > 0 ? story.score : saves
    };
  });
}

function mapStoryRow(row: StoryRow, scoreByStory: Map<string, number>): StoryCatalogStory {
  const creator = firstRelation(row.creator_profiles);
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    publicCode: row.public_code,
    hook: row.hook,
    shortDescription: row.short_description,
    coverUrl: row.cover_url,
    creatorName: creator
      ? resolvePublicDisplayName(firstRelation(creator.profiles), creator)
      : null,
    creatorUsername:
      firstRelation(creator?.profiles ?? null)?.username?.trim().toLowerCase() ?? null,
    genreName: null,
    genreSlug: null,
    publishedAt: row.published_at,
    isCompleted: Boolean(row.is_completed),
    score: scoreByStory.get(row.id) ?? 0,
    structureType: normalizeStoryStructureType(row.structure_type),
    standaloneReadingTimeMinutes: row.standalone_reading_time_minutes ?? 0
  };
}

function applyCatalogFiltersToIdRow(
  row: StoryIdRow,
  params: NormalizedCatalogParams,
  taxonomyByStory: TaxonomyLabelMap
) {
  const genreSlug = taxonomyByStory.get(row.id)?.mainGenreSlug ?? null;

  if (params.genre && genreSlug !== params.genre) {
    return false;
  }
  if (params.status === "completed" && !row.is_completed) {
    return false;
  }
  if (params.status === "ongoing" && row.is_completed) {
    return false;
  }
  if (params.sort === "quick" && !isQuickRead({ genreSlug, hook: row.hook })) {
    return false;
  }

  if (params.q) {
    const q = params.q.toLowerCase();
    const matches =
      row.title.toLowerCase().includes(q) ||
      (row.hook ?? "").toLowerCase().includes(q) ||
      (row.short_description ?? "").toLowerCase().includes(q);
    if (!matches) {
      return false;
    }
  }

  return true;
}

function applyBaseStoryFilters<
  T extends {
    eq: (column: string, value: unknown) => T;
    in: (column: string, values: unknown[]) => T;
    or: (filters: string) => T;
    order: (column: string, options?: { ascending?: boolean }) => T;
  }
>(query: T, params: NormalizedCatalogParams, storyIdFilter?: string[] | null) {
  let next = query.eq("visibility", "public").in("status", ["published", "approved"]);

  if (storyIdFilter && storyIdFilter.length > 0) {
    next = next.in("id", storyIdFilter);
  } else if (storyIdFilter && storyIdFilter.length === 0) {
    next = next.in("id", ["00000000-0000-0000-0000-000000000000"]);
  }

  if (params.status === "completed") {
    next = next.eq("is_completed", true);
  } else if (params.status === "ongoing") {
    next = next.eq("is_completed", false);
  }
  if (params.q) {
    const escaped = escapeIlikePattern(params.q);
    next = next.or(
      `title.ilike.%${escaped}%,hook.ilike.%${escaped}%,short_description.ilike.%${escaped}%`
    );
  }

  return next;
}

function applyDateSort<
  T extends {
    order: (column: string, options?: { ascending?: boolean }) => T;
  }
>(query: T, sort: StoryCatalogSort) {
  if (sort === "completed") {
    return query.order("is_completed", { ascending: false }).order("published_at", { ascending: false });
  }
  if (sort === "title") {
    return query.order("title", { ascending: true });
  }
  if (sort === "new") {
    return query.order("published_at", { ascending: false });
  }
  return query.order("published_at", { ascending: false });
}

async function fetchCatalogStoriesByIds(
  supabase: SupabaseClient,
  storyIds: string[],
  scoreByStory: Map<string, number>
) {
  if (storyIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("stories")
    .select(CATALOG_STORY_SELECT)
    .in("id", storyIds)
    .eq("visibility", "public")
    .in("status", ["published", "approved"]);

  if (error) {
    console.error("[catalog] hydrate stories failed", error);
    return [];
  }

  const rows = (data ?? []) as StoryRow[];
  const byId = new Map(rows.map((row) => [row.id, mapStoryRow(row, scoreByStory)]));
  return storyIds.map((id) => byId.get(id)).filter((story): story is StoryCatalogStory => Boolean(story));
}

async function filterRankedStoryIds(
  supabase: SupabaseClient,
  rankedIds: string[],
  params: NormalizedCatalogParams,
  storyIdFilter?: string[] | null
) {
  if (storyIdFilter && storyIdFilter.length === 0) {
    return [];
  }

  const allowed = storyIdFilter ? new Set(storyIdFilter) : null;
  const sourceIds = allowed
    ? rankedIds.filter((id) => allowed.has(id))
    : rankedIds;

  if (sourceIds.length === 0) {
    return [];
  }

  const startedAt = Date.now();
  const chunkSize = 500;
  const chunks: string[][] = [];
  for (let index = 0; index < sourceIds.length; index += chunkSize) {
    chunks.push(sourceIds.slice(index, index + chunkSize));
  }

  const chunkRows = (
    await Promise.all(
      chunks.map(async (chunk) => {
        let query = supabase.from("stories").select(CATALOG_STORY_ID_SELECT).in("id", chunk);
        query = applyBaseStoryFilters(query, params, null);
        const { data, error } = await query;
        if (error) {
          console.error("[catalog] ranked id filter failed", error);
          return [] as StoryIdRow[];
        }
        return (data ?? []) as StoryIdRow[];
      })
    )
  ).flat();

  const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(
    supabase,
    chunkRows.map((row) => row.id)
  );

  const matched = new Set<string>();
  for (const row of chunkRows) {
    if (applyCatalogFiltersToIdRow(row, params, taxonomyByStory)) {
      matched.add(row.id);
    }
  }

  logSlowQuery("filterRankedStoryIds", startedAt, {
    sourceCount: sourceIds.length,
    matchedCount: matched.size
  });

  return sourceIds.filter((id) => matched.has(id));
}

async function getCatalogByQuickSort(
  supabase: SupabaseClient,
  params: NormalizedCatalogParams,
  genres: StoryCatalogGenre[],
  scoreByStory: Map<string, number>,
  storyIdFilter: string[] | null,
  filters: StoryCatalogFilterParams
): Promise<StoryCatalogResult> {
  const baseIds = storyIdFilter
    ? storyIdFilter
    : await loadPublicCatalogCandidateIds(supabase, params, null);
  const filteredIds = await filterRankedStoryIds(supabase, baseIds, params, storyIdFilter);
  const totalCount = filteredIds.length;
  const totalPages = getTotalPages(totalCount, params.pageSize);
  const page = Math.min(params.page, totalPages);
  const offset = getCatalogOffset(page, params.pageSize);
  const pageIds = filteredIds.slice(offset, offset + params.pageSize);
  let stories = await fetchCatalogStoriesByIds(supabase, pageIds, scoreByStory);
  stories = enrichCatalogStories(await attachTaxonomyPreview(supabase, stories));

  return {
    stories,
    genres,
    totalCount,
    page,
    pageSize: params.pageSize,
    totalPages,
    query: params.q,
    genre: params.genre,
    sort: params.sort,
    status: params.status,
    filters
  };
}

async function getCatalogByScoreSort(
  supabase: SupabaseClient,
  params: NormalizedCatalogParams,
  genres: StoryCatalogGenre[],
  scoreByStory: Map<string, number>,
  storyIdFilter: string[] | null,
  filters: StoryCatalogFilterParams
): Promise<StoryCatalogResult> {
  if (params.sort === "hot") {
    let candidateIds = storyIdFilter
      ? storyIdFilter
      : await loadPublicCatalogCandidateIds(supabase, params, null);
    candidateIds = await filterRankedStoryIds(supabase, candidateIds, params, storyIdFilter);

    if (candidateIds.length === 0) {
      return emptyCatalogResult(params, genres);
    }

    const viewPage = await getCatalogStoryIdsByMetricView(supabase, "hot", {
      storyIds: candidateIds,
      page: params.page,
      pageSize: params.pageSize
    });

    if (viewPage) {
      const totalCount = viewPage.totalCount;
      const totalPages = getTotalPages(totalCount, params.pageSize);
      const page = Math.min(params.page, totalPages);
      let stories = await fetchCatalogStoriesByIds(
        supabase,
        viewPage.storyIds,
        scoreByStory
      );
      stories = enrichCatalogStories(await attachTaxonomyPreview(supabase, stories));

      return {
        stories,
        genres,
        totalCount,
        page,
        pageSize: params.pageSize,
        totalPages,
        query: params.q,
        genre: params.genre,
        sort: params.sort,
        status: params.status,
        filters
      };
    }
  }

  const rankedIds = [...scoreByStory.entries()]
    .sort((first, second) => second[1] - first[1])
    .map(([storyId]) => storyId);

  const filteredIds = await filterRankedStoryIds(
    supabase,
    rankedIds,
    params,
    storyIdFilter
  );
  const totalCount = filteredIds.length;
  const totalPages = getTotalPages(totalCount, params.pageSize);
  const page = Math.min(params.page, totalPages);
  const offset = getCatalogOffset(page, params.pageSize);
  const pageIds = filteredIds.slice(offset, offset + params.pageSize);
  let stories = await fetchCatalogStoriesByIds(supabase, pageIds, scoreByStory);
  stories = enrichCatalogStories(await attachTaxonomyPreview(supabase, stories));

  return {
    stories,
    genres,
    totalCount,
    page,
    pageSize: params.pageSize,
    totalPages,
    query: params.q,
    genre: params.genre,
    sort: params.sort,
    status: params.status,
    filters
  };
}

async function getCatalogByMetricSort(
  supabase: SupabaseClient,
  params: NormalizedCatalogParams,
  genres: StoryCatalogGenre[],
  scoreByStory: Map<string, number>,
  storyIdFilter: string[] | null,
  filters: StoryCatalogFilterParams
): Promise<StoryCatalogResult> {
  const startedAt = Date.now();
  let candidateIds = storyIdFilter
    ? storyIdFilter
    : await loadPublicCatalogCandidateIds(supabase, params, null);

  const needsRowFilter = Boolean(params.q) || params.status !== "all";

  if (needsRowFilter) {
    candidateIds = await filterRankedStoryIds(supabase, candidateIds, params, storyIdFilter);
  } else if (storyIdFilter) {
    candidateIds = await filterRankedStoryIds(supabase, candidateIds, params, storyIdFilter);
  }

  if (candidateIds.length === 0) {
    return emptyCatalogResult(params, genres);
  }

  if (isCatalogMetricViewSort(params.sort)) {
    const viewPage = await getCatalogStoryIdsByMetricView(supabase, params.sort, {
      storyIds: candidateIds,
      page: params.page,
      pageSize: params.pageSize
    });

    if (viewPage) {
      const totalCount = viewPage.totalCount;
      const totalPages = getTotalPages(totalCount, params.pageSize);
      const page = Math.min(params.page, totalPages);
      let stories = await fetchCatalogStoriesByIds(
        supabase,
        viewPage.storyIds,
        scoreByStory
      );
      stories = enrichCatalogStories(await attachTaxonomyPreview(supabase, stories));

      logSlowQuery("getCatalogByMetricSort.view", startedAt, {
        sort: params.sort,
        totalCount
      });

      return {
        stories,
        genres,
        totalCount,
        page,
        pageSize: params.pageSize,
        totalPages,
        query: params.q,
        genre: params.genre,
        sort: params.sort,
        status: params.status,
        filters
      };
    }
  }

  let sortedIds = candidateIds;

  if (params.sort === "saved") {
    const saves = await getSaveCountByStoryId(supabase, candidateIds);
    sortedIds = sortStoryIdsByNumericMap(candidateIds, saves, "desc");
  } else if (params.sort === "chapters") {
    const chapters = await getEpisodeCountByStoryId(supabase, candidateIds);
    sortedIds = sortStoryIdsByNumericMap(candidateIds, chapters, "desc");
  } else if (params.sort === "price_asc" || params.sort === "price_desc") {
    const prices = await getFullAccessPriceByStoryId(supabase, candidateIds);
    sortedIds = sortStoryIdsByNullablePrice(
      candidateIds,
      prices,
      params.sort === "price_asc" ? "asc" : "desc"
    );
  } else if (params.sort === "chapter_price_asc" || params.sort === "chapter_price_desc") {
    const chapterPrices = await getMinPaidChapterPriceByStoryId(supabase, candidateIds);
    sortedIds = sortStoryIdsByNullablePrice(
      candidateIds,
      chapterPrices,
      params.sort === "chapter_price_asc" ? "asc" : "desc"
    );
  }

  const totalCount = sortedIds.length;
  const totalPages = getTotalPages(totalCount, params.pageSize);
  const page = Math.min(params.page, totalPages);
  const offset = getCatalogOffset(page, params.pageSize);
  const pageIds = sortedIds.slice(offset, offset + params.pageSize);
  let stories = await fetchCatalogStoriesByIds(supabase, pageIds, scoreByStory);
  stories = enrichCatalogStories(await attachTaxonomyPreview(supabase, stories));

  return {
    stories,
    genres,
    totalCount,
    page,
    pageSize: params.pageSize,
    totalPages,
    query: params.q,
    genre: params.genre,
    sort: params.sort,
    status: params.status,
    filters
  };
}

async function getCatalogByDateSort(
  supabase: SupabaseClient,
  params: NormalizedCatalogParams,
  genres: StoryCatalogGenre[],
  scoreByStory: Map<string, number>,
  storyIdFilter: string[] | null,
  filters: StoryCatalogFilterParams
): Promise<StoryCatalogResult> {
  const offset = getCatalogOffset(params.page, params.pageSize);
  const to = offset + params.pageSize - 1;

  let query = supabase.from("stories").select(CATALOG_STORY_SELECT, { count: "exact" });
  query = applyBaseStoryFilters(query, params, storyIdFilter);
  query = applyDateSort(query, params.sort);

  const { data, error, count } = await query.range(offset, to);
  if (error) {
    console.error("[catalog] stories query failed", error);
    return emptyCatalogResult(params, genres);
  }

  const rows = (data ?? []) as StoryRow[];
  let stories = rows.map((row) => mapStoryRow(row, scoreByStory));
  stories = enrichCatalogStories(await attachTaxonomyPreview(supabase, stories));
  const totalCount = count ?? stories.length;
  const totalPages = getTotalPages(totalCount, params.pageSize);
  const page = Math.min(params.page, totalPages);

  return {
    stories,
    genres,
    totalCount,
    page,
    pageSize: params.pageSize,
    totalPages,
    query: params.q,
    genre: params.genre,
    sort: params.sort,
    status: params.status,
    filters
  };
}

const emptyCatalogResult = (
  params: StoryCatalogParams,
  genres: StoryCatalogGenre[] = []
): StoryCatalogResult => {
  const normalized = normalizeParams(params);
  const filters = normalizeFilterParams(params);
  return {
    stories: [],
    genres,
    totalCount: 0,
    page: normalized.page,
    pageSize: normalized.pageSize,
    totalPages: 1,
    query: normalized.q,
    genre: normalized.genre,
    sort: normalized.sort,
    status: normalized.status,
    filters
  };
};

export async function getStoryCatalog(
  params: StoryCatalogParams = {}
): Promise<StoryCatalogResult> {
  return getPublicStoriesCatalog(params);
}

export async function getPublicStoriesCatalog(params: StoryCatalogParams = {}): Promise<StoryCatalogResult> {
  const normalized = normalizeParams(params);
  const filters = normalizeFilterParams(params);

  try {
    const supabase = createPublicClient();
    const genreRows = await getPublicGenresWithContent();
    const genres = toCatalogGenres(genreRows);
    const storyIdFilter = await resolvePublicCatalogStoryIds(supabase, filters);

    if (storyIdFilter && storyIdFilter.length === 0) {
      return emptyCatalogResult(params, genres);
    }

    if (normalized.q) {
      const ranked = await searchStoriesForCatalog({
        q: normalized.q,
        genre: normalized.genre || undefined,
        page: normalized.page,
        pageSize: normalized.pageSize
      });
      let stories = ranked.stories;
      if (storyIdFilter) {
        const allowed = new Set(storyIdFilter);
        stories = stories.filter((story) => allowed.has(story.id));
      }
      stories = enrichCatalogStories(
        await attachTaxonomyPreview(supabase, stories)
      );
      return {
        stories,
        genres,
        totalCount: ranked.totalCount,
        page: ranked.page,
        pageSize: ranked.pageSize,
        totalPages: ranked.totalPages,
        query: normalized.q,
        genre: normalized.genre,
        sort: normalized.sort,
        status: normalized.status,
        filters
      };
    }

    const scoreByStory = await getStoryRankingScores("7d", RANKING_CATALOG_LIMIT);

    if (normalized.sort === "quick") {
      return getCatalogByQuickSort(
        supabase,
        normalized,
        genres,
        scoreByStory,
        storyIdFilter,
        filters
      );
    }

    if (isMetricSortedCatalog(normalized.sort)) {
      return getCatalogByMetricSort(
        supabase,
        normalized,
        genres,
        scoreByStory,
        storyIdFilter,
        filters
      );
    }

    if (isScoreSortedCatalog(normalized.sort)) {
      return getCatalogByScoreSort(
        supabase,
        normalized,
        genres,
        scoreByStory,
        storyIdFilter,
        filters
      );
    }

    return getCatalogByDateSort(
      supabase,
      normalized,
      genres,
      scoreByStory,
      storyIdFilter,
      filters
    );
  } catch (error) {
    console.error("[catalog] getPublicStoriesCatalog failed", error);
    const genreRows = await getPublicGenresWithContent().catch(() => []);
    return emptyCatalogResult(params, toCatalogGenres(genreRows));
  }
}
