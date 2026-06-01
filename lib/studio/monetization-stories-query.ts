"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeStoryStructureType } from "@/lib/stories/story-structure";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { buildStudioMonetizationConfigView } from "@/lib/studio/monetization-config";
import {
  isTaxonomyMainGenreTermId,
  loadCreatorMainGenreFilterOptions,
  loadMainGenreLabelsByStoryIds,
  pickMainGenreFromLabels
} from "@/lib/taxonomy/story-genre-labels";
import { loadStoryIdsMatchingTaxonomyFilters } from "@/lib/studio/filter-stories-taxonomy";
import type { StudioStoryMonetizationRow } from "@/types/studio-monetization";
import type { StoryAdminCompletionStatus } from "@/types/story-completion";
import type {
  StudioMonetizationGenreOption,
  StudioMonetizationPageSize,
  StudioMonetizationStoriesPageResult,
  StudioMonetizationStoriesQuery,
  StudioMonetizationStoryFilter,
  StudioMonetizationStorySort
} from "@/types/studio-monetization-stories";

type StoryMetaRow = {
  id: string;
  title: string;
  slug: string;
  public_code: string;
  status: string;
  visibility: string;
  is_completed: boolean;
  updated_at: string;
  cover_url: string | null;
  admin_completion_status?: string | null;
  structure_type?: string | null;
};

function parseAdminCompletionStatus(value: unknown): StoryAdminCompletionStatus {
  const status = String(value ?? "not_requested");
  if (
    status === "pending_review" ||
    status === "approved" ||
    status === "rejected"
  ) {
    return status;
  }
  return "not_requested";
}

function formatVnd(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}

function normalizePageSize(value: number): StudioMonetizationPageSize {
  if (value === 25 || value === 50 || value === 100) return value;
  return 10;
}

function isPublishedStory(story: StoryMetaRow) {
  return (
    !story.is_completed &&
    story.visibility === "public" &&
    (story.status === "published" || story.status === "approved")
  );
}

function isDraftStory(story: StoryMetaRow) {
  return story.status === "draft" || story.status === "pending";
}

function isHiddenStory(story: StoryMetaRow) {
  return story.visibility !== "public" || story.status === "hidden";
}

function matchesFilter(
  story: StoryMetaRow,
  enriched: {
    monetizationEnabled: boolean;
    revenueVnd: number;
    fullAccessEnabled: boolean;
    paidChapterCount: number;
    autoPricingEnabled: boolean;
    hasStorySettings: boolean;
    adminCompletionStatus: StoryAdminCompletionStatus;
    lockedFullStoryRevenueVnd: number;
  },
  filter: StudioMonetizationStoryFilter
) {
  switch (filter) {
    case "published":
      return isPublishedStory(story);
    case "draft":
      return isDraftStory(story);
    case "completed":
      return story.is_completed;
    case "hidden":
      return isHiddenStory(story);
    case "full_access_on":
      return enriched.fullAccessEnabled;
    case "full_access_off":
      return !enriched.fullAccessEnabled;
    case "has_paid_chapters":
      return enriched.paidChapterCount > 0;
    case "all_free":
      return enriched.paidChapterCount === 0;
    case "unconfigured":
      return !enriched.hasStorySettings && enriched.paidChapterCount === 0;
    case "paid_on":
      return enriched.monetizationEnabled || enriched.autoPricingEnabled;
    case "paid_off":
      return !enriched.monetizationEnabled && !enriched.autoPricingEnabled;
    case "has_revenue":
      return enriched.revenueVnd > 0;
    case "no_revenue":
      return enriched.revenueVnd <= 0;
    case "full_story_escrow":
      return enriched.fullAccessEnabled && enriched.lockedFullStoryRevenueVnd > 0;
    case "pending_admin_completion":
      return (
        enriched.fullAccessEnabled &&
        (enriched.adminCompletionStatus === "pending_review" ||
          (story.is_completed && enriched.adminCompletionStatus !== "approved"))
      );
    case "admin_completion_confirmed":
      return enriched.adminCompletionStatus === "approved";
    default:
      return true;
  }
}

function sortRows(
  rows: StudioStoryMonetizationRow[],
  sort: StudioMonetizationStorySort
) {
  const copy = [...rows];

  copy.sort((a, b) => {
    switch (sort) {
      case "revenue":
        return b.revenueVnd - a.revenueVnd || b.updatedAt.localeCompare(a.updatedAt);
      case "reads":
        return b.readCount - a.readCount || b.updatedAt.localeCompare(a.updatedAt);
      case "title":
        return a.title.localeCompare(b.title, "vi");
      case "chapter_count":
        return b.totalChapterCount - a.totalChapterCount || b.updatedAt.localeCompare(a.updatedAt);
      case "full_access_price":
        return (b.fullAccessPriceCoin ?? 0) - (a.fullAccessPriceCoin ?? 0) ||
          b.updatedAt.localeCompare(a.updatedAt);
      case "paid_first":
        return Number(b.monetizationEnabled) - Number(a.monetizationEnabled) ||
          b.updatedAt.localeCompare(a.updatedAt);
      case "unconfigured_first":
        return Number(a.monetizationEnabled) - Number(b.monetizationEnabled) ||
          b.updatedAt.localeCompare(a.updatedAt);
      case "updated":
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });

  return copy;
}

async function loadAggregateMaps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storyIds: string[],
  creatorUserId: string,
  adminFreeFloor: number,
  defaultCoinPrice: number
) {
  const paidCountByStory = new Map<string, number>();
  const freeChaptersByStory = new Map<string, number>();
  const priceByStory = new Map<string, number | null>();
  const revenueByStory = new Map<string, number>();
  const unlockCountByStory = new Map<string, number>();
  const readCountByStory = new Map<string, number>();
  const chapterCountByStory = new Map<string, number>();
  const storySettingsByStory = new Map<
    string,
    {
      fullAccessEnabled: boolean;
      fullAccessPriceCoin: number | null;
      autoPricingEnabled: boolean;
      freeFirstChaptersCount: number;
      autoPriceCoin: number | null;
    }
  >();
  const lockedFullStoryRevenueByStory = new Map<string, number>();

  if (storyIds.length === 0) {
    return {
      paidCountByStory,
      freeChaptersByStory,
      priceByStory,
      revenueByStory,
      unlockCountByStory,
      readCountByStory,
      chapterCountByStory,
      storySettingsByStory,
      lockedFullStoryRevenueByStory
    };
  }

  const [
    { data: monetizationRows },
    { data: txRows },
    { data: readRows },
    { data: episodes },
    { data: storySettingsRows },
    { data: lockedEarningRows }
  ] = await Promise.all([
      supabase
        .from("chapter_monetization_settings")
        .select("story_id, chapter_id, is_paid, coin_price")
        .in("story_id", storyIds),
      supabase
        .from("transactions")
        .select("story_id, type, source, net_amount_vnd, creator_gross_vnd, status")
        .eq("creator_user_id", creatorUserId)
        .eq("status", "completed")
        .in("story_id", storyIds),
      supabase
        .from("analytics_events")
        .select("target_id")
        .in("target_id", storyIds)
        .in("event_name", ["open_story", "read_chapter", "story_read"]),
      supabase
        .from("episodes")
        .select("id, story_id, episode_number")
        .in("story_id", storyIds)
        .neq("status", "archived"),
      supabase
        .from("story_monetization_settings")
        .select(
          "story_id, full_access_enabled, full_access_price_coin, auto_pricing_enabled, free_first_chapters_count, auto_price_coin"
        )
        .in("story_id", storyIds),
      supabase
        .from("creator_earning_transactions")
        .select("story_id, creator_net_amount_vnd")
        .eq("creator_user_id", creatorUserId)
        .eq("source_type", "story_unlock")
        .eq("release_status", "locked_until_story_completion")
        .eq("status", "settled")
        .in("story_id", storyIds)
    ]);

  const episodeNumber = new Map(
    (episodes ?? []).map((row) => [row.id as string, Number(row.episode_number)])
  );

  for (const row of episodes ?? []) {
    const storyId = row.story_id as string;
    chapterCountByStory.set(storyId, (chapterCountByStory.get(storyId) ?? 0) + 1);
  }

  for (const row of storySettingsRows ?? []) {
    const storyId = row.story_id as string;
    storySettingsByStory.set(storyId, {
      fullAccessEnabled: Boolean(row.full_access_enabled),
      fullAccessPriceCoin:
        row.full_access_price_coin == null ? null : Number(row.full_access_price_coin),
      autoPricingEnabled: Boolean(row.auto_pricing_enabled),
      freeFirstChaptersCount: Number(row.free_first_chapters_count ?? 0),
      autoPriceCoin: row.auto_price_coin == null ? null : Number(row.auto_price_coin)
    });
  }

  for (const row of monetizationRows ?? []) {
    const storyId = row.story_id as string;
    const chapterId = row.chapter_id as string;
    const episodeNum = episodeNumber.get(chapterId) ?? 0;

    if (row.is_paid) {
      paidCountByStory.set(storyId, (paidCountByStory.get(storyId) ?? 0) + 1);
      if (row.coin_price != null && !priceByStory.has(storyId)) {
        priceByStory.set(storyId, Number(row.coin_price));
      }
    } else if (episodeNum > 0) {
      freeChaptersByStory.set(
        storyId,
        Math.max(freeChaptersByStory.get(storyId) ?? 0, episodeNum)
      );
    }
  }

  for (const tx of txRows ?? []) {
    const storyId = tx.story_id as string | null;
    if (!storyId) continue;

    const net = Number(tx.net_amount_vnd ?? tx.creator_gross_vnd ?? 0);
    revenueByStory.set(storyId, (revenueByStory.get(storyId) ?? 0) + net);

    if (tx.type === "chapter_unlock" || tx.type === "story_unlock" || tx.source === "unlock") {
      unlockCountByStory.set(storyId, (unlockCountByStory.get(storyId) ?? 0) + 1);
    }
  }

  for (const row of readRows ?? []) {
    const storyId = row.target_id as string;
    readCountByStory.set(storyId, (readCountByStory.get(storyId) ?? 0) + 1);
  }

  for (const row of lockedEarningRows ?? []) {
    const storyId = row.story_id as string;
    if (!storyId) continue;
    lockedFullStoryRevenueByStory.set(
      storyId,
      (lockedFullStoryRevenueByStory.get(storyId) ?? 0) +
        Number(row.creator_net_amount_vnd ?? 0)
    );
  }

  for (const storyId of storyIds) {
    if (!freeChaptersByStory.has(storyId)) {
      freeChaptersByStory.set(storyId, adminFreeFloor);
    }
    if (!priceByStory.has(storyId)) {
      priceByStory.set(storyId, defaultCoinPrice);
    }
  }

  return {
    paidCountByStory,
    freeChaptersByStory,
    priceByStory,
    revenueByStory,
    unlockCountByStory,
    readCountByStory,
    chapterCountByStory,
    storySettingsByStory,
    lockedFullStoryRevenueByStory
  };
}

function mapStoryRow(
  story: StoryMetaRow,
  maps: Awaited<ReturnType<typeof loadAggregateMaps>>,
  config: Awaited<ReturnType<typeof buildStudioMonetizationConfigView>>,
  genreDisplay?: { genreName: string | null }
): StudioStoryMonetizationRow {
  const paidChapterCount = maps.paidCountByStory.get(story.id) ?? 0;
  const storySettings = maps.storySettingsByStory.get(story.id);

  return {
    storyId: story.id,
    title: story.title,
    slug: story.slug,
    publicCode: story.public_code,
    structureType: normalizeStoryStructureType(story.structure_type),
    status: String(story.status ?? "draft"),
    visibility: String(story.visibility ?? "private"),
    isCompleted: Boolean(story.is_completed),
    updatedAt: String(story.updated_at ?? new Date().toISOString()),
    coverUrl: story.cover_url ?? null,
    genreName: genreDisplay?.genreName ?? null,
    readCount: maps.readCountByStory.get(story.id) ?? 0,
    monetizationEnabled: paidChapterCount > 0 || Boolean(storySettings?.autoPricingEnabled),
    paidChapterCount,
    totalChapterCount: maps.chapterCountByStory.get(story.id) ?? 0,
    freeChaptersCount: Math.max(
      storySettings?.freeFirstChaptersCount ??
        maps.freeChaptersByStory.get(story.id) ??
        config.paidChapterFreeChaptersRequired,
      config.paidChapterFreeChaptersRequired
    ),
    defaultCoinPrice:
      storySettings?.autoPriceCoin ??
      maps.priceByStory.get(story.id) ??
      config.paidChapterDefaultCoinPrice,
    revenueVnd: formatVnd(maps.revenueByStory.get(story.id) ?? 0),
    unlockCount: maps.unlockCountByStory.get(story.id) ?? 0,
    fullAccessEnabled: Boolean(storySettings?.fullAccessEnabled),
    fullAccessPriceCoin: storySettings?.fullAccessPriceCoin ?? null,
    autoPricingEnabled: Boolean(storySettings?.autoPricingEnabled),
    freeFirstChaptersCount: storySettings?.freeFirstChaptersCount ?? 0,
    autoPriceCoin: storySettings?.autoPriceCoin ?? null,
    adminCompletionStatus: parseAdminCompletionStatus(story.admin_completion_status),
    lockedFullStoryRevenueVnd: formatVnd(
      maps.lockedFullStoryRevenueByStory.get(story.id) ?? 0
    )
  };
}

export async function getMonetizationGenreOptions(
  creatorProfileId: string
): Promise<StudioMonetizationGenreOption[]> {
  const supabase = await createClient();
  return loadCreatorMainGenreFilterOptions(supabase, creatorProfileId);
}

export async function getMonetizationStoriesPage(
  creatorProfile: CreatorProfile,
  creatorUserId: string,
  query: StudioMonetizationStoriesQuery
): Promise<StudioMonetizationStoriesPageResult> {
  const config = await buildStudioMonetizationConfigView({ includePrivate: true });
  const pageSize = normalizePageSize(query.pageSize);
  const page = Math.max(1, query.page);
  const search = query.search.trim().toLowerCase();

  const supabase = await createClient();

  let storiesQuery = supabase
    .from("stories")
    .select(
      "id, title, slug, public_code, status, visibility, is_completed, cover_url, updated_at, admin_completion_status, structure_type"
    )
    .eq("creator_id", creatorProfile.id);

  const genreFilter = query.genreId?.trim() ?? "";
  const useTaxonomyGenreFilter =
    genreFilter.length > 0 &&
    (await isTaxonomyMainGenreTermId(supabase, genreFilter));

  if (genreFilter && !useTaxonomyGenreFilter) {
    return {
      rows: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 1,
      error: "Bộ lọc thể loại không hợp lệ — dùng taxonomy main_genre."
    };
  }

  const { data: stories, error } = await storiesQuery.order("updated_at", { ascending: false });

  if (error) {
    return {
      rows: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 1,
      error: error.message
    };
  }

  let metaRows = (stories ?? []) as unknown as StoryMetaRow[];

  if (useTaxonomyGenreFilter) {
    const allowed = await loadStoryIdsMatchingTaxonomyFilters(
      supabase,
      metaRows.map((story) => story.id),
      { mainGenreTermId: genreFilter }
    );
    metaRows = metaRows.filter((story) => allowed.has(story.id));
  }

  const taxonomyByStory = await loadMainGenreLabelsByStoryIds(
    supabase,
    metaRows.map((story) => story.id)
  );
  const filteredMeta = search
    ? metaRows.filter((story) => story.title.toLowerCase().includes(search))
    : metaRows;

  const storyIds = filteredMeta.map((story) => story.id);
  const maps = await loadAggregateMaps(
    supabase,
    storyIds,
    creatorUserId,
    config.paidChapterFreeChaptersRequired,
    config.paidChapterDefaultCoinPrice
  );

  let enriched = filteredMeta
    .map((story) => {
      const picked = pickMainGenreFromLabels(taxonomyByStory.get(story.id));
      return mapStoryRow(story, maps, config, { genreName: picked.genreName });
    })
    .filter((story, index) => {
      const settings = maps.storySettingsByStory.get(filteredMeta[index].id);
      return matchesFilter(filteredMeta[index], {
        monetizationEnabled: story.monetizationEnabled,
        revenueVnd: story.revenueVnd,
        fullAccessEnabled: story.fullAccessEnabled,
        paidChapterCount: story.paidChapterCount,
        autoPricingEnabled: story.autoPricingEnabled,
        hasStorySettings: Boolean(settings),
        adminCompletionStatus: story.adminCompletionStatus ?? "not_requested",
        lockedFullStoryRevenueVnd: story.lockedFullStoryRevenueVnd ?? 0
      }, query.filter);
    });

  enriched = sortRows(enriched, query.sort);

  const totalCount = enriched.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const rows = enriched.slice(start, start + pageSize);

  return {
    rows,
    totalCount,
    page: safePage,
    pageSize,
    totalPages,
    error: null
  };
}

export async function resolveMonetizationBulkStoryIds(
  creatorProfile: CreatorProfile,
  scope: import("@/types/studio-monetization-stories").StudioMonetizationBulkScope,
  selectedIds: string[]
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select("id, status, visibility, is_completed")
    .eq("creator_id", creatorProfile.id);

  if (error || !data) {
    return selectedIds;
  }

  const rows = data as StoryMetaRow[];

  if (scope === "selected") {
    const allowed = new Set(rows.map((row) => row.id));
    return selectedIds.filter((id) => allowed.has(id));
  }

  if (scope === "completed") {
    return rows.filter((row) => row.is_completed).map((row) => row.id);
  }

  if (scope === "published") {
    return rows.filter((row) => isPublishedStory(row)).map((row) => row.id);
  }

  return rows.map((row) => row.id);
}

export async function countCreatorStories(creatorProfileId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", creatorProfileId);

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count ?? 0, error: null };
}

export async function countPaidStories(creatorProfileId: string) {
  const supabase = await createClient();
  const { data: stories, error: storiesError } = await supabase
    .from("stories")
    .select("id")
    .eq("creator_id", creatorProfileId);

  if (storiesError || !stories?.length) {
    return 0;
  }

  const storyIds = stories.map((row) => row.id);
  const { data: paidRows, error } = await supabase
    .from("chapter_monetization_settings")
    .select("story_id")
    .in("story_id", storyIds)
    .eq("is_paid", true);

  if (error) {
    return 0;
  }

  return new Set((paidRows ?? []).map((row) => row.story_id as string)).size;
}
