import { createClient } from "@/lib/data/server";
import { mapReelsListRow } from "@/lib/reels/map-reels-row";
import {
  buildReelsTasks,
  computeReelsStats,
  enrichReelsListItem,
  sortReelsItems
} from "@/lib/reels/reels-studio-utils";
import {
  normalizeReelsSort,
  normalizeReelsSourceFilter,
  normalizeReelsTab,
  normalizeReelsTimeFilter,
  parseReelsPageSize
} from "@/lib/reels/reels-query";
import { paginateList, parseStudioPage } from "@/lib/studio/pagination";
import {
  loadCreatorMainGenreFilterOptions,
  loadMainGenreLabelsByStoryIds,
  pickMainGenreFromLabels
} from "@/lib/taxonomy/story-genre-labels";
import { loadStoryMainGenreTermIndex } from "@/lib/ranking/story-main-genre-index";
import type {
  ReelsListTab,
  ReelsStudioListItem,
  ReelsTaskItem
} from "@/types/reels";
import type { ReelsItemStatus } from "@/types/reels";

const MS_DAY = 24 * 60 * 60 * 1000;

function statusForTab(tab: ReelsListTab): ReelsItemStatus[] | null {
  switch (tab) {
    case "draft":
      return ["draft"];
    case "scheduled":
      return ["scheduled"];
    case "published":
      return ["published"];
    case "hidden":
      return ["hidden"];
    case "needs_fix":
      return ["rejected"];
    default:
      return null;
  }
}

function matchesTime(
  item: ReelsStudioListItem,
  filter: ReturnType<typeof normalizeReelsTimeFilter>,
  from?: string,
  to?: string
) {
  const ref = item.publishedAt ?? item.updatedAt;
  const ts = new Date(ref).getTime();
  const now = Date.now();

  switch (filter) {
    case "today":
      return ts >= now - MS_DAY;
    case "7d":
      return ts >= now - 7 * MS_DAY;
    case "30d":
      return ts >= now - 30 * MS_DAY;
    case "custom":
      if (from) {
        const fromTs = new Date(from).getTime();
        if (ts < fromTs) {
          return false;
        }
      }
      if (to) {
        const toTs = new Date(to).getTime() + MS_DAY;
        if (ts > toTs) {
          return false;
        }
      }
      return true;
    default:
      return true;
  }
}

function matchesSource(
  item: ReelsStudioListItem,
  filter: ReturnType<typeof normalizeReelsSourceFilter>
) {
  switch (filter) {
    case "manual":
      return !item.chapterId;
    case "chapter":
      return Boolean(item.chapterId);
    case "import":
      return false;
    case "ai":
      return false;
    default:
      return true;
  }
}

export type ReelsStoryOption = { id: string; title: string };
export type ReelsGenreOption = { id: string; name: string };

export async function getStudioReelsPage(
  ownerId: string,
  creatorProfileId: string,
  options?: {
    tab?: string;
    page?: string;
    pageSize?: string;
    search?: string;
    storyId?: string;
    genreId?: string;
    source?: string;
    time?: string;
    sort?: string;
    from?: string;
    to?: string;
  }
) {
  const tab = normalizeReelsTab(options?.tab);
  const page = parseStudioPage(options?.page);
  const pageSize = parseReelsPageSize(options?.pageSize);
  const sort = normalizeReelsSort(options?.sort);
  const timeFilter = normalizeReelsTimeFilter(options?.time);
  const sourceFilter = normalizeReelsSourceFilter(options?.source);
  const search = (options?.search ?? "").trim().toLowerCase();
  const storyFilter = (options?.storyId ?? "").trim();
  const genreFilter = (options?.genreId ?? "").trim();

  try {
    const db = await createClient();

    const [reelsResult, storiesResult] = await Promise.all([
      db
        .from("reels_items")
        .select(
          "*, stories!inner(id, title, slug), episodes(title, episode_number)"
        )
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false }),
      db
        .from("stories")
        .select("id, title")
        .eq("creator_id", creatorProfileId)
        .order("title", { ascending: true })
    ]);

    if (reelsResult.error) {
      throw reelsResult.error;
    }

    const rawRows = reelsResult.data ?? [];
    const storyIds = [
      ...new Set(
        rawRows
          .map((row) => {
            const story = Array.isArray(row.stories) ? row.stories[0] : row.stories;
            return story?.id as string | undefined;
          })
          .filter(Boolean) as string[]
      ),
      ...(storiesResult.data ?? []).map((story) => story.id as string)
    ];

    const [mainGenreIndex, taxonomyByStory, genreOptionsFromTaxonomy] =
      await Promise.all([
        loadStoryMainGenreTermIndex(db, storyIds),
        loadMainGenreLabelsByStoryIds(db, storyIds),
        loadCreatorMainGenreFilterOptions(db, creatorProfileId)
      ]);

    const allItems = rawRows.map((row) => {
      const story = Array.isArray(row.stories) ? row.stories[0] : row.stories;
      const storyId = story?.id as string | undefined;
      const picked = storyId
        ? pickMainGenreFromLabels(taxonomyByStory.get(storyId))
        : { genreName: null };

      const mapped = mapReelsListRow(
        row as Parameters<typeof mapReelsListRow>[0]
      );

      return enrichReelsListItem({
        ...mapped,
        genreId: storyId ? (mainGenreIndex.get(storyId) ?? null) : null,
        genreName: picked.genreName
      });
    });

    const stats = computeReelsStats(allItems);
    const allTasks = buildReelsTasks(allItems, 50);

    const counts: Record<ReelsListTab, number> = {
      all: allItems.length,
      draft: stats.draft,
      hidden: allItems.filter((item) => item.status === "hidden").length,
      needs_fix: stats.needsFix,
      published: stats.published,
      scheduled: stats.scheduled
    };

    const storyOptions: ReelsStoryOption[] = (storiesResult.data ?? []).map(
      (story) => ({
        id: story.id as string,
        title: story.title as string
      })
    );

    const genreOptions: ReelsGenreOption[] = genreOptionsFromTaxonomy.map(
      (option) => ({ id: option.id, name: option.name })
    );

    const statuses = statusForTab(tab);

    const filtered = allItems
      .filter((item) => (statuses ? statuses.includes(item.status) : true))
      .filter((item) => (storyFilter ? item.storyId === storyFilter : true))
      .filter((item) => (genreFilter ? item.genreId === genreFilter : true))
      .filter((item) => matchesSource(item, sourceFilter))
      .filter((item) =>
        matchesTime(item, timeFilter, options?.from, options?.to)
      )
      .filter((item) => {
        if (!search) {
          return true;
        }

        const haystack = [
          item.displayTitle,
          item.hook,
          item.body,
          item.storyTitle,
          item.chapterTitle,
          item.chapterNumber
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      });

    const sorted = sortReelsItems(filtered, sort);
    const paginated = paginateList(sorted, page, pageSize);

    return {
      allTasks,
      counts,
      error: null as string | null,
      filteredIds: sorted.map((item) => item.id),
      genreOptions,
      items: paginated.items,
      page: paginated.page,
      stats,
      stories: storiesResult.data ?? [],
      storyOptions,
      total: paginated.total,
      totalPages: paginated.totalPages
    };
  } catch (error) {
    return {
      allTasks: [] as ReelsTaskItem[],
      counts: {
        all: 0,
        draft: 0,
        hidden: 0,
        needs_fix: 0,
        published: 0,
        scheduled: 0
      },
      error:
        error instanceof Error ? error.message : "Không tải được danh sách Reels.",
      filteredIds: [] as string[],
      genreOptions: [] as ReelsGenreOption[],
      items: [] as ReelsStudioListItem[],
      page: 1,
      stats: {
        ctr7d: 0,
        draft: 0,
        needsFix: 0,
        published: 0,
        reads7d: 0,
        readsFromReels: 0,
        scheduled: 0,
        total: 0,
        views7d: 0
      },
      stories: [],
      storyOptions: [] as ReelsStoryOption[],
      total: 0,
      totalPages: 1
    };
  }
}
