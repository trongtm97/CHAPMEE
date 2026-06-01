import {
  REELS_LIST_PAGE_SIZE_DEFAULT,
  type ReelsListPageSize,
  type ReelsListSort,
  type ReelsListTab,
  type ReelsSourceFilter,
  type ReelsTimeFilter
} from "@/types/reels";

export function normalizeReelsTab(value?: string): ReelsListTab {
  if (
    value === "draft" ||
    value === "scheduled" ||
    value === "published" ||
    value === "hidden" ||
    value === "needs_fix"
  ) {
    return value;
  }

  return "all";
}

export function normalizeReelsSort(value?: string): ReelsListSort {
  if (
    value === "created" ||
    value === "views" ||
    value === "ctr" ||
    value === "reads" ||
    value === "needs_attention"
  ) {
    return value;
  }

  return "updated";
}

export function normalizeReelsTimeFilter(value?: string): ReelsTimeFilter {
  if (value === "today" || value === "7d" || value === "30d" || value === "custom") {
    return value;
  }

  return "all";
}

export function normalizeReelsSourceFilter(value?: string): ReelsSourceFilter {
  if (value === "manual" || value === "chapter" || value === "import" || value === "ai") {
    return value;
  }

  return "all";
}

export function parseReelsPageSize(value?: string): ReelsListPageSize {
  const parsed = Number.parseInt(value ?? String(REELS_LIST_PAGE_SIZE_DEFAULT), 10);

  if (parsed === 10 || parsed === 50) {
    return parsed;
  }

  return REELS_LIST_PAGE_SIZE_DEFAULT;
}

export function buildReelsQuery(input: {
  tab: ReelsListTab;
  storyId: string;
  genreId: string;
  source: ReelsSourceFilter;
  time: ReelsTimeFilter;
  sort: ReelsListSort;
  page?: string;
  pageSize: ReelsListPageSize;
  search: string;
  from?: string;
  to?: string;
}) {
  return {
    from: input.from || undefined,
    genre: input.genreId || undefined,
    page: input.page,
    q: input.search || undefined,
    size: input.pageSize === REELS_LIST_PAGE_SIZE_DEFAULT ? undefined : String(input.pageSize),
    sort: input.sort === "updated" ? undefined : input.sort,
    source: input.source === "all" ? undefined : input.source,
    story: input.storyId || undefined,
    tab: input.tab === "all" ? undefined : input.tab,
    time: input.time === "all" ? undefined : input.time,
    to: input.to || undefined
  };
}
