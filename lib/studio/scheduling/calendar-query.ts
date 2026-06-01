import {
  CALENDAR_PAGE_SIZE_DEFAULT,
  type CalendarContentFilter,
  type CalendarListTab,
  type CalendarPageSize,
  type CalendarTimeFilter,
  type CalendarViewMode
} from "@/types/scheduling";

export function normalizeCalendarTab(tab?: string): CalendarListTab {
  if (
    tab === "today" ||
    tab === "published" ||
    tab === "failed" ||
    tab === "canceled" ||
    tab === "all"
  ) {
    return tab;
  }

  return "upcoming";
}

export function normalizeCalendarContentFilter(value?: string): CalendarContentFilter {
  if (value === "story" || value === "chapter" || value === "reels") {
    return value;
  }

  return "all";
}

export function normalizeCalendarTimeFilter(value?: string): CalendarTimeFilter {
  if (value === "today" || value === "7d" || value === "30d" || value === "month") {
    return value;
  }

  return "all";
}

export function normalizeCalendarView(value?: string): CalendarViewMode {
  if (value === "week" || value === "month") {
    return value;
  }

  return "list";
}

export function parseCalendarPageSize(value?: string): CalendarPageSize {
  const parsed = Number.parseInt(value ?? String(CALENDAR_PAGE_SIZE_DEFAULT), 10);

  if (parsed === 10 || parsed === 20) {
    return parsed;
  }

  return CALENDAR_PAGE_SIZE_DEFAULT;
}

export function buildCalendarQuery(input: {
  tab: CalendarListTab;
  type: CalendarContentFilter;
  time: CalendarTimeFilter;
  view: CalendarViewMode;
  page?: string;
  pageSize: CalendarPageSize;
  search: string;
}) {
  return {
    page: input.page,
    q: input.search || undefined,
    size: input.pageSize === CALENDAR_PAGE_SIZE_DEFAULT ? undefined : String(input.pageSize),
    tab: input.tab === "upcoming" ? undefined : input.tab,
    time: input.time === "all" ? undefined : input.time,
    type: input.type === "all" ? undefined : input.type,
    view: input.view === "list" ? undefined : input.view
  };
}
