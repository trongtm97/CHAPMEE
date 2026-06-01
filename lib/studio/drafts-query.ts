import {
  DRAFT_LIST_PAGE_SIZE_DEFAULT,
  type DraftListPageSize,
  type DraftSort,
  type DraftStatusFilter,
  type DraftTimeFilter,
  type StudioDraftListFilter
} from "@/types/drafts";

export function normalizeDraftStatusFilter(value?: string): DraftStatusFilter {
  if (
    value === "writing" ||
    value === "incomplete" ||
    value === "ready" ||
    value === "has_errors" ||
    value === "stale"
  ) {
    return value;
  }

  return "all";
}

export function normalizeDraftTimeFilter(value?: string): DraftTimeFilter {
  if (
    value === "recent" ||
    value === "today" ||
    value === "7d" ||
    value === "30d" ||
    value === "older"
  ) {
    return value;
  }

  return "all";
}

export function normalizeDraftSort(value?: string): DraftSort {
  if (
    value === "updated_asc" ||
    value === "title" ||
    value === "type" ||
    value === "priority"
  ) {
    return value;
  }

  return "updated";
}

export function parseDraftPageSize(value?: string): DraftListPageSize {
  const parsed = Number.parseInt(value ?? String(DRAFT_LIST_PAGE_SIZE_DEFAULT), 10);

  if (parsed === 25 || parsed === 50) {
    return parsed;
  }

  return DRAFT_LIST_PAGE_SIZE_DEFAULT;
}

export function buildDraftsQuery(input: {
  filter: StudioDraftListFilter;
  status: DraftStatusFilter;
  time: DraftTimeFilter;
  sort: DraftSort;
  page?: string;
  pageSize: DraftListPageSize;
  search: string;
}) {
  return {
    page: input.page,
    q: input.search || undefined,
    size: input.pageSize === DRAFT_LIST_PAGE_SIZE_DEFAULT ? undefined : String(input.pageSize),
    sort: input.sort === "updated" ? undefined : input.sort,
    status: input.status === "all" ? undefined : input.status,
    time: input.time === "all" ? undefined : input.time,
    type: input.filter === "all" ? undefined : input.filter
  };
}
