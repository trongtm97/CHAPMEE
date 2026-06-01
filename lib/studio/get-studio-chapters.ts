import { diagnoseChapterOrder } from "@/lib/studio/chapter-order-diagnostics";
import { normalizeStoryStructureType } from "@/lib/stories/story-structure";
import { createClient } from "@/lib/supabase/server";
import { resolveEffectivePresentationMode } from "@/lib/presentation/resolve-mode";
import { parseStudioPage } from "@/lib/studio/pagination";
import { shouldIndexEpisode } from "@/lib/seo/should-index";
import {
  resolveChapterDisplayStatus,
  resolveStoryDisplayStatus
} from "@/lib/studio/status-labels";
import { getStoryPresentationSettings } from "@/lib/taxonomy/presentation";
import { getStoryMonetizationSettings } from "@/lib/supabase/story-monetization";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type { ContentFormat, PresentationMode } from "@/types/presentation";
import type {
  StudioChapterListFilter,
  StudioChapterPageSize,
  StudioChapterSort,
  StudioDbContentStatus,
  StudioDisplayStatus
} from "@/types/studio";
import {
  STUDIO_CHAPTER_PAGE_SIZE_DEFAULT,
  STUDIO_CHAPTER_PAGE_SIZES
} from "@/types/studio";

export type { StudioChapterListFilter, StudioChapterSort };

export type StudioChapterSeoStatus = "ok" | "warning" | "missing";

export type StudioChapter = {
  id: string;
  slug: string;
  publicCode: string;
  episodeNumber: number;
  title: string;
  excerpt: string | null;
  status: StudioDbContentStatus;
  displayStatus: StudioDisplayStatus;
  contentFormat: ContentFormat | null;
  validationStatus: string | null;
  wordCount: number;
  readingMinutes: number | null;
  updatedAt: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  readCount: number | null;
  commentCount: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoStatus: StudioChapterSeoStatus;
  isIndexable: boolean;
  isPaid: boolean;
  coinPrice: number | null;
};

export type StudioStoryHeader = {
  id: string;
  title: string;
  slug: string;
  publicCode: string;
  status: StudioDbContentStatus;
  displayStatus: StudioDisplayStatus;
  visibility: "public" | "private";
  isCompleted: boolean;
  presentationMode: PresentationMode;
  structureType: "chaptered" | "standalone";
  monetizationEnabled: boolean;
};

export type StudioChapterManagerStats = {
  totalChapters: number;
  publishedCount: number;
  draftCount: number;
  scheduledCount: number;
  totalReads: number;
  totalComments: number;
  lastUpdatedAt: string | null;
  incompleteSeoCount: number;
  invalidComposerCount: number;
  orderDiagnostics: ReturnType<typeof diagnoseChapterOrder>;
};

export type StudioChaptersResult = {
  story: StudioStoryHeader | null;
  chapters: StudioChapter[];
  counts: Record<StudioChapterListFilter, number>;
  stats: StudioChapterManagerStats | null;
  page: number;
  pageSize: StudioChapterPageSize;
  totalPages: number;
  total: number;
  error: string | null;
};

type EpisodeRow = {
  id: string;
  slug: string;
  public_code: string;
  episode_number: number;
  title: string;
  excerpt: string | null;
  status: StudioDbContentStatus;
  content_format: ContentFormat | null;
  validation_status: string | null;
  word_count: number;
  updated_at: string;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  public_code: string;
  status: StudioDbContentStatus;
  visibility: "public" | "private";
  is_completed: boolean;
  structure_type?: string | null;
};

const WORDS_PER_MINUTE = 200;

const statusFilterMap: Record<
  Exclude<StudioChapterListFilter, "all" | "paid" | "free" | "has_comments">,
  StudioDbContentStatus | StudioDbContentStatus[]
> = {
  draft: "draft",
  hidden: "archived",
  published: "published",
  rejected: "rejected",
  scheduled: ["pending", "approved"]
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
    filter === "paid" ||
    filter === "free" ||
    filter === "has_comments" ||
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
    sort === "scheduled" ||
    sort === "published" ||
    sort === "reads" ||
    sort === "comments"
  ) {
    return sort;
  }

  if (sort === "updated") {
    return "updated";
  }

  return "number_asc";
}

export function normalizeStudioChapterPageSize(value?: string): StudioChapterPageSize {
  const parsed = Number.parseInt(value ?? "", 10);

  if (STUDIO_CHAPTER_PAGE_SIZES.includes(parsed as StudioChapterPageSize)) {
    return parsed as StudioChapterPageSize;
  }

  return STUDIO_CHAPTER_PAGE_SIZE_DEFAULT;
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

function resolveSeoStatus(input: {
  seoDescription: string | null;
  seoTitle: string | null;
}): StudioChapterSeoStatus {
  if (!input.seoTitle?.trim() || !input.seoDescription?.trim()) {
    return "missing";
  }

  if (input.seoDescription.trim().length < 40) {
    return "warning";
  }

  return "ok";
}

function applyStatusFilter<T extends { eq: Function; in: Function }>(
  query: T,
  filter: StudioChapterListFilter
): T {
  if (filter === "all" || filter === "paid" || filter === "free" || filter === "has_comments") {
    return query;
  }

  const mapped = statusFilterMap[filter];

  if (Array.isArray(mapped)) {
    return query.in("status", mapped);
  }

  return query.eq("status", mapped);
}

function applySort<T extends { order: Function }>(query: T, sort: StudioChapterSort): T {
  switch (sort) {
    case "number_desc":
      return query.order("episode_number", { ascending: false });
    case "updated":
      return query.order("updated_at", { ascending: false });
    case "published":
    case "scheduled":
      return query.order("published_at", { ascending: false, nullsFirst: false });
    case "number_asc":
    default:
      return query.order("episode_number", { ascending: true });
  }
}

async function countEpisodesByStatus(storyId: string) {
  const supabase = await createClient();
  const statuses: StudioDbContentStatus[] = [
    "draft",
    "pending",
    "approved",
    "published",
    "rejected",
    "archived"
  ];

  const results = await Promise.all(
    statuses.map(async (status) => {
      const { count, error } = await supabase
        .from("episodes")
        .select("id", { count: "exact", head: true })
        .eq("story_id", storyId)
        .eq("status", status);

      if (error) {
        throw new Error(error.message);
      }

      return { count: count ?? 0, status };
    })
  );

  const map = Object.fromEntries(results.map((row) => [row.status, row.count])) as Record<
    StudioDbContentStatus,
    number
  >;

  return {
    all: Object.values(map).reduce((sum, value) => sum + value, 0),
    draft: map.draft ?? 0,
    hidden: map.archived ?? 0,
    published: map.published ?? 0,
    rejected: map.rejected ?? 0,
    scheduled: (map.pending ?? 0) + (map.approved ?? 0)
  };
}

export async function getStudioChaptersPage(
  creatorProfile: CreatorProfile,
  storyId: string,
  options?: {
    filter?: string;
    search?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
  }
): Promise<StudioChaptersResult> {
  const activeFilter = normalizeStudioChapterFilter(options?.filter);
  const activeSearch = getStudioChapterSearch(options?.search).toLowerCase();
  const activeSort = normalizeStudioChapterSort(options?.sort);
  const activePage = parseStudioPage(options?.page);
  const activePageSize = normalizeStudioChapterPageSize(options?.pageSize);

  const emptyCounts: Record<StudioChapterListFilter, number> = {
    all: 0,
    draft: 0,
    free: 0,
    has_comments: 0,
    hidden: 0,
    paid: 0,
    published: 0,
    rejected: 0,
    scheduled: 0
  };

  try {
    const supabase = await createClient();

    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("id, title, slug, public_code, status, visibility, is_completed, structure_type")
      .eq("id", storyId)
      .eq("creator_id", creatorProfile.id)
      .maybeSingle();

    if (storyError) {
      throw storyError;
    }

    if (!story) {
      return {
        chapters: [],
        counts: emptyCounts,
        error: null,
        page: 1,
        pageSize: activePageSize,
        stats: null,
        story: null,
        total: 0,
        totalPages: 1
      };
    }

    const storyRow = story as StoryRow;

    const [presentationSettings, monetizationSettings, statusCounts, orderNumbersResult] =
      await Promise.all([
        getStoryPresentationSettings(storyRow.id),
        getStoryMonetizationSettings(storyRow.id),
        countEpisodesByStatus(storyRow.id),
        supabase
          .from("episodes")
          .select("episode_number")
          .eq("story_id", storyRow.id)
          .order("episode_number", { ascending: true })
      ]);

    const presentationMode = resolveEffectivePresentationMode({
      storyMode: presentationSettings.data?.mode ?? null
    });

    const storyHeader: StudioStoryHeader = {
      displayStatus: resolveStoryDisplayStatus({
        isCompleted: storyRow.is_completed,
        status: storyRow.status,
        visibility: storyRow.visibility
      }),
      id: storyRow.id,
      isCompleted: storyRow.is_completed,
      monetizationEnabled: Boolean(monetizationSettings.data?.monetization_enabled),
      presentationMode,
      publicCode: storyRow.public_code,
      slug: storyRow.slug,
      status: storyRow.status,
      structureType: normalizeStoryStructureType(storyRow.structure_type),
      title: storyRow.title,
      visibility: storyRow.visibility
    };

    const orderDiagnostics = diagnoseChapterOrder(
      (orderNumbersResult.data ?? []).map((row) => Number(row.episode_number))
    );

    if (storyHeader.structureType === "standalone") {
      return {
        chapters: [],
        counts: emptyCounts,
        error: null,
        page: 1,
        pageSize: activePageSize,
        stats: null,
        story: storyHeader,
        total: 0,
        totalPages: 1
      };
    }

    let paidEpisodeIds = new Set<string>();
    let freeEpisodeIds = new Set<string>();
    let commentEpisodeIds = new Set<string>();

    if (activeFilter === "paid" || activeFilter === "free") {
      const { data: monetizationRows } = await supabase
        .from("chapter_monetization_settings")
        .select("chapter_id, is_paid")
        .eq("story_id", storyRow.id);

      for (const row of monetizationRows ?? []) {
        if (row.is_paid) {
          paidEpisodeIds.add(String(row.chapter_id));
        } else {
          freeEpisodeIds.add(String(row.chapter_id));
        }
      }
    }

    if (activeFilter === "has_comments") {
      const { data: commentRows } = await supabase
        .from("comments")
        .select("episode_id")
        .eq("story_id", storyRow.id)
        .eq("status", "visible");

      commentEpisodeIds = new Set(
        (commentRows ?? [])
          .map((row) => row.episode_id)
          .filter((value): value is string => Boolean(value))
      );
    }

    let query = supabase
      .from("episodes")
      .select(
        "id, slug, public_code, episode_number, title, excerpt, status, content_format, validation_status, word_count, updated_at, published_at, seo_title, seo_description",
        { count: "exact" }
      )
      .eq("story_id", storyRow.id);

    query = applyStatusFilter(query, activeFilter);

    if (activeSearch) {
      const chapterNumber = Number.parseInt(activeSearch, 10);

      if (Number.isInteger(chapterNumber) && chapterNumber > 0) {
        query = query.eq("episode_number", chapterNumber);
      } else {
        query = query.or(
          `title.ilike.%${activeSearch.replace(/[%_]/g, "")}%,excerpt.ilike.%${activeSearch.replace(/[%_]/g, "")}%`
        );
      }
    }

    if (activeFilter === "paid" && paidEpisodeIds.size > 0) {
      query = query.in("id", [...paidEpisodeIds]);
    } else if (activeFilter === "paid") {
      return buildEmptyPageResult(storyHeader, statusCounts, orderDiagnostics, activePageSize);
    }

    if (activeFilter === "free" && paidEpisodeIds.size > 0) {
      query = query.not("id", "in", `(${[...paidEpisodeIds].join(",")})`);
    }

    if (activeFilter === "has_comments" && commentEpisodeIds.size > 0) {
      query = query.in("id", [...commentEpisodeIds]);
    } else if (activeFilter === "has_comments") {
      return buildEmptyPageResult(storyHeader, statusCounts, orderDiagnostics, activePageSize);
    }

    query = applySort(query, activeSort);

    const from = (activePage - 1) * activePageSize;
    const to = from + activePageSize - 1;

    const { count: filteredTotal, data: episodes, error: episodesError } = await query.range(
      from,
      to
    );

    if (episodesError) {
      throw episodesError;
    }

    const rows = (episodes ?? []) as EpisodeRow[];
    const episodeIds = rows.map((episode) => episode.id);

    const readCountByEpisode = new Map<string, number>();
    const commentCountByEpisode = new Map<string, number>();
    const monetizationByEpisode = new Map<string, { isPaid: boolean; coinPrice: number | null }>();
    const scheduledByEpisode = new Map<string, string>();

    if (episodeIds.length > 0) {
      const [readsResult, commentsResult, monetizationResult, scheduleResult] =
        await Promise.all([
          supabase
            .from("analytics_events")
            .select("target_id")
            .in("target_id", episodeIds)
            .eq("event_name", "chapter_opened"),
          supabase
            .from("comments")
            .select("episode_id")
            .in("episode_id", episodeIds)
            .eq("status", "visible"),
          supabase
            .from("chapter_monetization_settings")
            .select("chapter_id, is_paid, coin_price")
            .eq("story_id", storyRow.id)
            .in("chapter_id", episodeIds),
          supabase
            .from("scheduled_publications")
            .select("target_id, scheduled_at, status")
            .eq("story_id", storyRow.id)
            .eq("target_type", "chapter")
            .in("target_id", episodeIds)
            .eq("status", "scheduled")
        ]);

      for (const event of (readsResult.data ?? []) as Array<{ target_id: string }>) {
        readCountByEpisode.set(
          event.target_id,
          (readCountByEpisode.get(event.target_id) ?? 0) + 1
        );
      }

      for (const comment of (commentsResult.data ?? []) as Array<{ episode_id: string }>) {
        commentCountByEpisode.set(
          comment.episode_id,
          (commentCountByEpisode.get(comment.episode_id) ?? 0) + 1
        );
      }

      for (const row of monetizationResult.data ?? []) {
        monetizationByEpisode.set(String(row.chapter_id), {
          coinPrice: row.coin_price == null ? null : Number(row.coin_price),
          isPaid: Boolean(row.is_paid)
        });
      }

      for (const row of scheduleResult.data ?? []) {
        scheduledByEpisode.set(String(row.target_id), String(row.scheduled_at));
      }
    }

    let chapters: StudioChapter[] = rows.map((episode) => {
      const reads = readCountByEpisode.get(episode.id) ?? 0;
      const comments = commentCountByEpisode.get(episode.id) ?? 0;
      const monetization = monetizationByEpisode.get(episode.id);

      return {
        coinPrice: monetization?.coinPrice ?? null,
        commentCount: comments > 0 ? comments : null,
        contentFormat: episode.content_format,
        displayStatus: resolveChapterDisplayStatus({ status: episode.status }),
        episodeNumber: episode.episode_number,
        excerpt: episode.excerpt,
        id: episode.id,
        isIndexable: shouldIndexEpisode({
          episodeStatus: episode.status,
          storyStatus: storyRow.status,
          storyVisibility: storyRow.visibility
        }),
        isPaid: monetization?.isPaid ?? false,
        publicCode: episode.public_code,
        publishedAt: episode.published_at,
        readCount: reads > 0 ? reads : null,
        readingMinutes: estimateReadingMinutes(episode.word_count),
        scheduledAt: scheduledByEpisode.get(episode.id) ?? null,
        seoDescription: episode.seo_description,
        seoStatus: resolveSeoStatus({
          seoDescription: episode.seo_description,
          seoTitle: episode.seo_title
        }),
        seoTitle: episode.seo_title,
        slug: episode.slug,
        status: episode.status,
        title: episode.title,
        updatedAt: episode.updated_at,
        validationStatus: episode.validation_status ?? null,
        wordCount: episode.word_count
      };
    });

    if (activeSort === "reads") {
      chapters = [...chapters].sort((a, b) => (b.readCount ?? 0) - (a.readCount ?? 0));
    }

    if (activeSort === "comments") {
      chapters = [...chapters].sort(
        (a, b) => (b.commentCount ?? 0) - (a.commentCount ?? 0)
      );
    }

    const total = filteredTotal ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / activePageSize));

    const [{ data: seoRows }, { data: invalidComposerRows }, { data: allEpisodeIdRows }, commentsTotal, lastUpdated] =
      await Promise.all([
        supabase
          .from("episodes")
          .select("id")
          .eq("story_id", storyRow.id)
          .or("seo_title.is.null,seo_title.eq.,seo_description.is.null,seo_description.eq."),
        supabase
          .from("episodes")
          .select("id")
          .eq("story_id", storyRow.id)
          .eq("content_format", "structured_blocks")
          .in("validation_status", ["invalid", "warning"]),
        supabase.from("episodes").select("id").eq("story_id", storyRow.id),
        supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("story_id", storyRow.id)
          .eq("status", "visible"),
        supabase
          .from("episodes")
          .select("updated_at")
          .eq("story_id", storyRow.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

    const allEpisodeIds = (allEpisodeIdRows ?? []).map((row) => String(row.id));
    let totalReads = 0;

    if (allEpisodeIds.length > 0) {
      const { count: readsCount } = await supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_name", "chapter_opened")
        .in("target_id", allEpisodeIds.slice(0, 500));

      totalReads = readsCount ?? 0;
    }

    const paidCount = paidEpisodeIds.size || 0;

    const counts: Record<StudioChapterListFilter, number> = {
      ...emptyCounts,
      all: statusCounts.all,
      draft: statusCounts.draft,
      free: Math.max(0, statusCounts.all - paidCount),
      has_comments: commentEpisodeIds.size,
      hidden: statusCounts.hidden,
      paid: paidCount,
      published: statusCounts.published,
      rejected: statusCounts.rejected,
      scheduled: statusCounts.scheduled
    };

    if (activeFilter === "has_comments" && counts.has_comments === 0) {
      const { count: commentEpisodeCount } = await supabase
        .from("comments")
        .select("episode_id", { count: "exact", head: true })
        .eq("story_id", storyRow.id)
        .eq("status", "visible");

      counts.has_comments = commentEpisodeCount ?? 0;
    }

    if (counts.paid === 0 && storyHeader.monetizationEnabled) {
      const { count: paidCountExact } = await supabase
        .from("chapter_monetization_settings")
        .select("chapter_id", { count: "exact", head: true })
        .eq("story_id", storyRow.id)
        .eq("is_paid", true);

      counts.paid = paidCountExact ?? 0;
      counts.free = Math.max(0, counts.all - counts.paid);
    }

    const stats: StudioChapterManagerStats = {
      draftCount: statusCounts.draft,
      incompleteSeoCount: seoRows?.length ?? 0,
      invalidComposerCount: invalidComposerRows?.length ?? 0,
      lastUpdatedAt: lastUpdated.data?.updated_at ?? null,
      orderDiagnostics,
      publishedCount: statusCounts.published,
      scheduledCount: statusCounts.scheduled,
      totalChapters: statusCounts.all,
      totalComments: commentsTotal.count ?? 0,
      totalReads
    };

    return {
      chapters,
      counts,
      error: null,
      page: Math.min(activePage, totalPages),
      pageSize: activePageSize,
      stats,
      story: storyHeader,
      total,
      totalPages
    };
  } catch (error) {
    return {
      chapters: [],
      counts: emptyCounts,
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách chương.",
      page: 1,
      pageSize: activePageSize,
      stats: null,
      story: null,
      total: 0,
      totalPages: 1
    };
  }
}

function buildEmptyPageResult(
  story: StudioStoryHeader,
  statusCounts: Awaited<ReturnType<typeof countEpisodesByStatus>>,
  orderDiagnostics: ReturnType<typeof diagnoseChapterOrder>,
  pageSize: StudioChapterPageSize
): StudioChaptersResult {
  return {
    chapters: [],
    counts: {
      all: statusCounts.all,
      draft: statusCounts.draft,
      free: statusCounts.all,
      has_comments: 0,
      hidden: statusCounts.hidden,
      paid: 0,
      published: statusCounts.published,
      rejected: statusCounts.rejected,
      scheduled: statusCounts.scheduled
    },
    error: null,
    page: 1,
    pageSize,
    stats: {
      draftCount: statusCounts.draft,
      incompleteSeoCount: 0,
      invalidComposerCount: 0,
      lastUpdatedAt: null,
      orderDiagnostics,
      publishedCount: statusCounts.published,
      scheduledCount: statusCounts.scheduled,
      totalChapters: statusCounts.all,
      totalComments: 0,
      totalReads: 0
    },
    story,
    total: 0,
    totalPages: 1
  };
}
