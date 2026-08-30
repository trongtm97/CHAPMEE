import {
  getEpisodeCountByStoryId,
  getFullAccessPriceByStoryId,
  getMinPaidChapterPriceByStoryId,
  getSaveCountByStoryId,
  loadPublicCatalogCandidateIds,
  sortStoryIdsByNullablePrice,
  sortStoryIdsByNumericMap
} from "@/lib/discovery/catalog-metrics";
import { PERMANENTLY_HIDDEN_QUALITY_STATUS } from "@/lib/content-quality/public-visibility";
import { enrichCatalogStories } from "@/lib/discovery/enrich-catalog-stories";
import { resolvePublicCatalogStoryIds } from "@/lib/discovery/resolve-catalog-story-ids";
import type { StoryCatalogFilterParams } from "@/lib/discovery/types";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import { normalizeStoryStructureType } from "@/lib/stories/story-structure";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { searchStoriesForCatalog } from "@/lib/search/catalog-bridge";
import { getStoryRankingScores } from "@/lib/ranking/getTrendingStories";
import { logSlowQuery } from "@/lib/dev/slow-query-log";
import {
  getCatalogStoryIdsByMetricView,
  isCatalogMetricViewSort
} from "@/lib/stories/catalog-metrics-view";
import { createPublicClient } from "@/lib/data/public-client";
import { getPublicGenresWithContent } from "@/lib/data/public-content";
import {
  CATALOG_STORY_ID_SELECT,
  CATALOG_STORY_SELECT,
  RANKING_CATALOG_LIMIT,
  DEFAULT_CATALOG_PAGE_SIZE,
  clampPage,
  clampPageSize,
  escapeIlikePattern,
  getCatalogOffset,
  getTotalPages,
  isMetricSortedCatalog,
  isScoreSortedCatalog,
  type NormalizedCatalogParams
} from "@/lib/stories/story-catalog-query";
import { parseCatalogSortParam } from "@/lib/stories/story-query-params";
import { normalizeDbContentOrigin } from "@/lib/stories/story-origin";
import type { StoryCatalogGenre, StoryCatalogSort, StoryCatalogStatus, StoryCatalogStory } from "@/types/story";
import type { DatabaseClient } from "@/lib/db/types";

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
  content_origin?: string | null;
  rights_status?: string | null;
  original_language?: string | null;
  translated_language?: string | null;
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
  return parseCatalogSortParam(value);
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
    contentOrigin:
      params.contentOrigin === "translation" || params.contentOrigin === "original"
        ? params.contentOrigin
        : undefined,
    sort: normalizeSort(params.sort),
    status: normalizeStatus(params.status),
    page: clampPage(params.page ?? 1),
    pageSize: clampPageSize(params.pageSize ?? DEFAULT_CATALOG_PAGE_SIZE)
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
    contentOrigin:
      params.contentOrigin === "translation" || params.contentOrigin === "original"
        ? params.contentOrigin
        : undefined,
    access: params.access,
    hasWarning: params.hasWarning,
    hasNewChapter: params.hasNewChapter,
    hasAudio: params.hasAudio,
    hasVideo: params.hasVideo,
    sort: normalizeSort(params.sort),
    status: normalizeStatus(params.status),
    page: clampPage(params.page ?? 1),
    pageSize: clampPageSize(params.pageSize ?? DEFAULT_CATALOG_PAGE_SIZE)
  };
}

async function attachTaxonomyPreview(
  db: DatabaseClient,
  stories: StoryCatalogStory[]
) {
  if (stories.length === 0) return stories;
  const storyIds = stories.map((story) => story.id);
  const [labels, episodeCounts, saveCounts] = await Promise.all([
    getStoryTaxonomyLabelsByStoryIds(db, storyIds),
    getEpisodeCountByStoryId(db, storyIds),
    getSaveCountByStoryId(db, storyIds)
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
    coverUrl: resolveStoryCoverUrl(row.cover_url),
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
    ,
    contentOrigin: normalizeDbContentOrigin(row.content_origin),
    rightsStatus: row.rights_status ?? null,
    originalLanguage: row.original_language ?? null,
    translatedLanguage: row.translated_language ?? null
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
    is: (column: string, value: boolean | null) => T;
    eq: (column: string, value: unknown) => T;
    in: (column: string, values: unknown[]) => T;
    neq: (column: string, value: unknown) => T;
    or: (filters: string) => T;
    order: (column: string, options?: { ascending?: boolean }) => T;
  }
>(query: T, params: NormalizedCatalogParams, storyIdFilter?: string[] | null) {
  let next = query
    .eq("visibility", "public")
    .in("status", ["published", "approved"])
    .neq("quality_status", PERMANENTLY_HIDDEN_QUALITY_STATUS)
    .is("deleted_at", null);

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
  if (params.contentOrigin) {
    next = next.eq("content_origin", params.contentOrigin);
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
  if (sort === "updated") {
    return query.order("updated_at", { ascending: false });
  }
  return query.order("updated_at", { ascending: false });
}

async function fetchCatalogStoriesByIds(
  db: DatabaseClient,
  storyIds: string[],
  scoreByStory: Map<string, number>
) {
  if (storyIds.length === 0) {
    return [];
  }

  const { data, error } = await db
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
  db: DatabaseClient,
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
        let query = db.from("stories").select(CATALOG_STORY_ID_SELECT).in("id", chunk);
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
    db,
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
  db: DatabaseClient,
  params: NormalizedCatalogParams,
  genres: StoryCatalogGenre[],
  scoreByStory: Map<string, number>,
  storyIdFilter: string[] | null,
  filters: StoryCatalogFilterParams
): Promise<StoryCatalogResult> {
  const baseIds = storyIdFilter
    ? storyIdFilter
    : await loadPublicCatalogCandidateIds(db, params, null);
  const filteredIds = await filterRankedStoryIds(db, baseIds, params, storyIdFilter);
  const totalCount = filteredIds.length;
  const totalPages = getTotalPages(totalCount, params.pageSize);
  const page = Math.min(params.page, totalPages);
  const offset = getCatalogOffset(page, params.pageSize);
  const pageIds = filteredIds.slice(offset, offset + params.pageSize);
  let stories = await fetchCatalogStoriesByIds(db, pageIds, scoreByStory);
  stories = enrichCatalogStories(await attachTaxonomyPreview(db, stories));

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
  db: DatabaseClient,
  params: NormalizedCatalogParams,
  genres: StoryCatalogGenre[],
  scoreByStory: Map<string, number>,
  storyIdFilter: string[] | null,
  filters: StoryCatalogFilterParams
): Promise<StoryCatalogResult> {
  if (params.sort === "hot") {
    let candidateIds = storyIdFilter
      ? storyIdFilter
      : await loadPublicCatalogCandidateIds(db, params, null);
    candidateIds = await filterRankedStoryIds(db, candidateIds, params, storyIdFilter);

    if (candidateIds.length === 0) {
      return emptyCatalogResult(params, genres);
    }

    const viewPage = await getCatalogStoryIdsByMetricView(db, "hot", {
      storyIds: candidateIds,
      page: params.page,
      pageSize: params.pageSize
    });

    if (viewPage) {
      const totalCount = viewPage.totalCount;
      const totalPages = getTotalPages(totalCount, params.pageSize);
      const page = Math.min(params.page, totalPages);
      let stories = await fetchCatalogStoriesByIds(
        db,
        viewPage.storyIds,
        scoreByStory
      );
      stories = enrichCatalogStories(await attachTaxonomyPreview(db, stories));

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
    db,
    rankedIds,
    params,
    storyIdFilter
  );
  const totalCount = filteredIds.length;
  const totalPages = getTotalPages(totalCount, params.pageSize);
  const page = Math.min(params.page, totalPages);
  const offset = getCatalogOffset(page, params.pageSize);
  const pageIds = filteredIds.slice(offset, offset + params.pageSize);
  let stories = await fetchCatalogStoriesByIds(db, pageIds, scoreByStory);
  stories = enrichCatalogStories(await attachTaxonomyPreview(db, stories));

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
  db: DatabaseClient,
  params: NormalizedCatalogParams,
  genres: StoryCatalogGenre[],
  scoreByStory: Map<string, number>,
  storyIdFilter: string[] | null,
  filters: StoryCatalogFilterParams
): Promise<StoryCatalogResult> {
  const startedAt = Date.now();
  let candidateIds = storyIdFilter
    ? storyIdFilter
    : await loadPublicCatalogCandidateIds(db, params, null);

  const needsRowFilter = Boolean(params.q) || params.status !== "all";

  if (needsRowFilter) {
    candidateIds = await filterRankedStoryIds(db, candidateIds, params, storyIdFilter);
  } else if (storyIdFilter) {
    candidateIds = await filterRankedStoryIds(db, candidateIds, params, storyIdFilter);
  }

  if (candidateIds.length === 0) {
    return emptyCatalogResult(params, genres);
  }

  if (isCatalogMetricViewSort(params.sort)) {
    const viewPage = await getCatalogStoryIdsByMetricView(db, params.sort, {
      storyIds: candidateIds,
      page: params.page,
      pageSize: params.pageSize
    });

    if (viewPage) {
      const totalCount = viewPage.totalCount;
      const totalPages = getTotalPages(totalCount, params.pageSize);
      const page = Math.min(params.page, totalPages);
      let stories = await fetchCatalogStoriesByIds(
        db,
        viewPage.storyIds,
        scoreByStory
      );
      stories = enrichCatalogStories(await attachTaxonomyPreview(db, stories));

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
    const saves = await getSaveCountByStoryId(db, candidateIds);
    sortedIds = sortStoryIdsByNumericMap(candidateIds, saves, "desc");
  } else if (params.sort === "chapters") {
    const chapters = await getEpisodeCountByStoryId(db, candidateIds);
    sortedIds = sortStoryIdsByNumericMap(candidateIds, chapters, "desc");
  } else if (params.sort === "price_asc" || params.sort === "price_desc") {
    const prices = await getFullAccessPriceByStoryId(db, candidateIds);
    sortedIds = sortStoryIdsByNullablePrice(
      candidateIds,
      prices,
      params.sort === "price_asc" ? "asc" : "desc"
    );
  } else if (params.sort === "chapter_price_asc" || params.sort === "chapter_price_desc") {
    const chapterPrices = await getMinPaidChapterPriceByStoryId(db, candidateIds);
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
  let stories = await fetchCatalogStoriesByIds(db, pageIds, scoreByStory);
  stories = enrichCatalogStories(await attachTaxonomyPreview(db, stories));

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
  db: DatabaseClient,
  params: NormalizedCatalogParams,
  genres: StoryCatalogGenre[],
  scoreByStory: Map<string, number>,
  storyIdFilter: string[] | null,
  filters: StoryCatalogFilterParams
): Promise<StoryCatalogResult> {
  const offset = getCatalogOffset(params.page, params.pageSize);
  const to = offset + params.pageSize - 1;

  let query = db.from("stories").select(CATALOG_STORY_SELECT, { count: "exact" });
  query = applyBaseStoryFilters(query, params, storyIdFilter);
  query = applyDateSort(query, params.sort);

  const { data, error, count } = await query.range(offset, to);
  if (error) {
    console.warn("[catalog] stories query failed", error);
    return emptyCatalogResult(params, genres);
  }

  const rows = (data ?? []) as StoryRow[];
  let stories = rows.map((row) => mapStoryRow(row, scoreByStory));
  stories = enrichCatalogStories(await attachTaxonomyPreview(db, stories));
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
    const db = createPublicClient();
    const genreRows = await getPublicGenresWithContent();
    const genres = toCatalogGenres(genreRows);
    const storyIdFilter = await resolvePublicCatalogStoryIds(db, filters);

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
        await attachTaxonomyPreview(db, stories)
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

    const needsRankingScores =
      normalized.sort === "quick" ||
      isScoreSortedCatalog(normalized.sort) ||
      isMetricSortedCatalog(normalized.sort);
    const scoreByStory = needsRankingScores
      ? await getStoryRankingScores("7d", RANKING_CATALOG_LIMIT)
      : new Map<string, number>();

    if (normalized.sort === "quick") {
      return getCatalogByQuickSort(
        db,
        normalized,
        genres,
        scoreByStory,
        storyIdFilter,
        filters
      );
    }

    if (isMetricSortedCatalog(normalized.sort)) {
      return getCatalogByMetricSort(
        db,
        normalized,
        genres,
        scoreByStory,
        storyIdFilter,
        filters
      );
    }

    if (isScoreSortedCatalog(normalized.sort)) {
      return getCatalogByScoreSort(
        db,
        normalized,
        genres,
        scoreByStory,
        storyIdFilter,
        filters
      );
    }

    return getCatalogByDateSort(
      db,
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
