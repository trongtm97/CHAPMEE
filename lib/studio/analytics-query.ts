import type {
  StudioAnalyticsContentFilter,
  StudioAnalyticsRange
} from "@/types/studio-analytics";

export function normalizeAnalyticsRange(
  value: string | undefined
): StudioAnalyticsRange {
  const allowed: StudioAnalyticsRange[] = [
    "today",
    "7d",
    "30d",
    "month",
    "all"
  ];

  if (value && allowed.includes(value as StudioAnalyticsRange)) {
    return value as StudioAnalyticsRange;
  }

  if (value === "90d") {
    return "30d";
  }

  return "30d";
}

export function normalizeAnalyticsContentFilter(
  value: string | undefined
): StudioAnalyticsContentFilter {
  const allowed: StudioAnalyticsContentFilter[] = [
    "all",
    "story",
    "chapter",
    "reels",
    "comments"
  ];

  if (value && allowed.includes(value as StudioAnalyticsContentFilter)) {
    return value as StudioAnalyticsContentFilter;
  }

  return "all";
}

export function buildAnalyticsQuery(input: {
  content?: StudioAnalyticsContentFilter;
  range?: StudioAnalyticsRange;
  search?: string;
  story?: string;
}): Record<string, string | undefined> {
  return {
    content: input.content && input.content !== "all" ? input.content : undefined,
    q: input.search?.trim() || undefined,
    range: input.range && input.range !== "30d" ? input.range : undefined,
    story: input.story || undefined
  };
}

export const ANALYTICS_TOP_DEFAULT = 5;
export const ANALYTICS_TOP_MAX = 10;
