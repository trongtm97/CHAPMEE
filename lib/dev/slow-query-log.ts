const SLOW_QUERY_MS = Number(process.env.SLOW_QUERY_MS ?? 500);

export function logSlowQuery(label: string, startedAt: number, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed < SLOW_QUERY_MS) {
    return;
  }

  console.warn(`[slow-query] ${label} ${elapsed}ms`, meta ?? {});
}

/** TODO: EXPLAIN ANALYZE in staging for heavy catalog/taxonomy RPCs. */
export const HEAVY_CATALOG_QUERIES = [
  "filter_public_story_ids_by_taxonomy_groups",
  "get_catalog_story_ids_by_metric",
  "refresh_story_catalog_metrics",
  "getCatalogByMetricSort",
  "filterRankedStoryIds",
  "collectSearchCandidates"
] as const;
