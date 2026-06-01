import type {
  CommentListPageSize,
  StudioCommentFilter,
  StudioCommentInboxItem,
  StudioCommentSort,
  StudioCommentStats,
  StudioCommentTimeFilter
} from "@/types/comments";
import {
  COMMENT_LIST_PAGE_SIZE_DEFAULT,
  COMMENT_LIST_PAGE_SIZES
} from "@/types/comments";

const MS_DAY = 24 * 60 * 60 * 1000;

export function normalizeStudioCommentFilter(
  value: string | undefined
): StudioCommentFilter {
  const allowed: StudioCommentFilter[] = [
    "all",
    "unreplied",
    "replied",
    "pinned",
    "reported",
    "hidden"
  ];

  if (value && allowed.includes(value as StudioCommentFilter)) {
    return value as StudioCommentFilter;
  }

  return "all";
}

export function normalizeStudioCommentTimeFilter(
  value: string | undefined
): StudioCommentTimeFilter {
  const allowed: StudioCommentTimeFilter[] = ["today", "7d", "30d", "all"];

  if (value && allowed.includes(value as StudioCommentTimeFilter)) {
    return value as StudioCommentTimeFilter;
  }

  return "all";
}

export function normalizeStudioCommentSort(
  value: string | undefined
): StudioCommentSort {
  const allowed: StudioCommentSort[] = [
    "newest",
    "oldest",
    "unreplied_first",
    "reported_first"
  ];

  if (value && allowed.includes(value as StudioCommentSort)) {
    return value as StudioCommentSort;
  }

  return "newest";
}

export function parseCommentPageSize(value?: string): CommentListPageSize {
  const parsed = Number.parseInt(value ?? "", 10);

  if (COMMENT_LIST_PAGE_SIZES.includes(parsed as CommentListPageSize)) {
    return parsed as CommentListPageSize;
  }

  return COMMENT_LIST_PAGE_SIZE_DEFAULT;
}

export function buildCommentsQuery(input: {
  filter?: StudioCommentFilter;
  page?: string;
  pageSize?: CommentListPageSize;
  q?: string;
  sort?: StudioCommentSort;
  story?: string;
  time?: StudioCommentTimeFilter;
}): Record<string, string | undefined> {
  return {
    filter: input.filter && input.filter !== "all" ? input.filter : undefined,
    page: input.page && input.page !== "1" ? input.page : undefined,
    q: input.q?.trim() || undefined,
    size:
      input.pageSize && input.pageSize !== COMMENT_LIST_PAGE_SIZE_DEFAULT
        ? String(input.pageSize)
        : undefined,
    sort: input.sort && input.sort !== "newest" ? input.sort : undefined,
    story: input.story || undefined,
    time: input.time && input.time !== "all" ? input.time : undefined
  };
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function matchesCommentTimeFilter(
  createdAt: string,
  time: StudioCommentTimeFilter
) {
  if (time === "all") {
    return true;
  }

  const created = new Date(createdAt).getTime();
  const now = Date.now();

  if (time === "today") {
    return created >= startOfToday();
  }

  if (time === "7d") {
    return created >= now - 7 * MS_DAY;
  }

  return created >= now - 30 * MS_DAY;
}

export function filterCommentsByTab(
  items: StudioCommentInboxItem[],
  filter: StudioCommentFilter
) {
  if (filter === "all") {
    return items;
  }

  if (filter === "unreplied") {
    return items.filter((item) => item.status === "new" && !item.isHidden);
  }

  if (filter === "replied") {
    return items.filter((item) => item.status === "replied");
  }

  if (filter === "pinned") {
    return items.filter((item) => item.isPinned && !item.isHidden);
  }

  if (filter === "reported") {
    return items.filter((item) => item.hasOpenReport);
  }

  return items.filter((item) => item.isHidden);
}

export function filterCommentsBySearch(
  items: StudioCommentInboxItem[],
  search: string
) {
  const q = search.trim().toLowerCase();

  if (!q) {
    return items;
  }

  return items.filter((item) => {
    return (
      item.content.toLowerCase().includes(q) ||
      item.authorDisplayName?.toLowerCase().includes(q) ||
      item.contextLabel.toLowerCase().includes(q) ||
      item.storyTitle?.toLowerCase().includes(q) ||
      item.communityPostTitle?.toLowerCase().includes(q)
    );
  });
}

export function sortStudioComments(
  items: StudioCommentInboxItem[],
  sort: StudioCommentSort
) {
  const copy = [...items];

  copy.sort((a, b) => {
    if (sort === "reported_first") {
      if (a.hasOpenReport !== b.hasOpenReport) {
        return a.hasOpenReport ? -1 : 1;
      }
    }

    if (sort === "unreplied_first") {
      const aUnreplied = a.status === "new" && !a.isHidden ? 1 : 0;
      const bUnreplied = b.status === "new" && !b.isHidden ? 1 : 0;

      if (aUnreplied !== bUnreplied) {
        return bUnreplied - aUnreplied;
      }
    }

    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();

    return sort === "oldest" ? aTime - bTime : bTime - aTime;
  });

  return copy;
}

export function computeCommentTabCounts(
  items: StudioCommentInboxItem[]
): Record<StudioCommentFilter, number> {
  return {
    all: items.length,
    unreplied: items.filter((i) => i.status === "new" && !i.isHidden).length,
    replied: items.filter((i) => i.status === "replied").length,
    pinned: items.filter((i) => i.isPinned && !i.isHidden).length,
    reported: items.filter((i) => i.hasOpenReport).length,
    hidden: items.filter((i) => i.isHidden).length
  };
}

export function computeCommentStats(
  items: StudioCommentInboxItem[]
): StudioCommentStats {
  const now = Date.now();
  const weekAgo = now - 7 * MS_DAY;

  return {
    newRecent: items.filter((item) => {
      return (
        new Date(item.createdAt).getTime() >= weekAgo &&
        item.status === "new" &&
        !item.isHidden
      );
    }).length,
    unreplied: items.filter((item) => item.status === "new" && !item.isHidden)
      .length,
    reported: items.filter((item) => item.hasOpenReport).length,
    pinned: items.filter((item) => item.isPinned && !item.isHidden).length
  };
}

export function hasActiveCommentFilters(input: {
  filter: StudioCommentFilter;
  q: string;
  sort: StudioCommentSort;
  storyId?: string;
  time: StudioCommentTimeFilter;
}) {
  return (
    input.filter !== "all" ||
    Boolean(input.storyId) ||
    Boolean(input.q.trim()) ||
    input.time !== "all" ||
    input.sort !== "newest"
  );
}
