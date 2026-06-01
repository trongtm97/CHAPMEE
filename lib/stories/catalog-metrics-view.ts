import type { StoryCatalogSort } from "@/types/story";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CatalogMetricSort =
  | "saved"
  | "chapters"
  | "price_asc"
  | "price_desc"
  | "chapter_price_asc"
  | "chapter_price_desc"
  | "hot";

const METRIC_SORTS = new Set<CatalogMetricSort>([
  "saved",
  "chapters",
  "price_asc",
  "price_desc",
  "chapter_price_asc",
  "chapter_price_desc",
  "hot"
]);

export function isCatalogMetricViewSort(sort: StoryCatalogSort): sort is CatalogMetricSort {
  return METRIC_SORTS.has(sort as CatalogMetricSort);
}

function metricRpcName(sort: CatalogMetricSort): string {
  return sort;
}

export async function isStoryCatalogMetricsViewAvailable(
  supabase: SupabaseClient
): Promise<boolean> {
  const { error } = await supabase.from("story_catalog_metrics").select("story_id").limit(1);
  if (!error) return true;
  return !error.message.includes("story_catalog_metrics");
}

export async function getCatalogStoryIdsByMetricView(
  supabase: SupabaseClient,
  sort: CatalogMetricSort,
  options: {
    storyIds?: string[] | null;
    page: number;
    pageSize: number;
  }
): Promise<{ storyIds: string[]; totalCount: number } | null> {
  const metric = metricRpcName(sort);
  const direction =
    sort === "price_asc" || sort === "chapter_price_asc" ? "asc" : "desc";
  const offset = (Math.max(options.page, 1) - 1) * options.pageSize;

  const { data, error } = await supabase.rpc("get_catalog_story_ids_by_metric", {
    p_metric: metric,
    p_story_ids:
      options.storyIds && options.storyIds.length > 0 ? options.storyIds : null,
    p_direction: direction,
    p_limit: options.pageSize,
    p_offset: offset
  });

  if (error) {
    if (
      error.message.includes("get_catalog_story_ids_by_metric") ||
      error.message.includes("story_catalog_metrics")
    ) {
      return null;
    }
    console.error("[catalog-metrics-view] rpc failed", error);
    return null;
  }

  const rows = (data ?? []) as Array<{ story_id: string; total_count: number | string }>;
  if (rows.length === 0) {
    let countQuery = supabase
      .from("story_catalog_metrics")
      .select("story_id", { count: "exact", head: true });

    if (options.storyIds && options.storyIds.length > 0) {
      countQuery = countQuery.in("story_id", options.storyIds);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      console.error("[catalog-metrics-view] count fallback failed", countError);
      return { storyIds: [], totalCount: 0 };
    }

    return {
      storyIds: [],
      totalCount: count ?? 0
    };
  }

  return {
    storyIds: rows.map((row) => String(row.story_id)),
    totalCount: Number(rows[0]?.total_count ?? rows.length)
  };
}

export async function refreshStoryCatalogMetrics(
  supabase: SupabaseClient
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.rpc("refresh_story_catalog_metrics");
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}
