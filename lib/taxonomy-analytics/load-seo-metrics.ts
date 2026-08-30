import { createAdminClient } from "@/lib/data/admin";

export type TaxonomySeoTopStory = {
  storyId: string;
  title: string;
  slug: string;
  clicks: number;
};

export async function loadSeoTopStoriesByTerm(input: {
  from: string;
  to: string;
  termIds: string[];
  limitPerTerm?: number;
}): Promise<Map<string, TaxonomySeoTopStory[]>> {
  const result = new Map<string, TaxonomySeoTopStory[]>();
  if (input.termIds.length === 0) {
    return result;
  }

  const db = createAdminClient();
  const { data: metricRows } = await db
    .from("taxonomy_story_metrics")
    .select("term_id, story_id, clicks")
    .gte("date", input.from)
    .lte("date", input.to)
    .in("term_id", input.termIds.slice(0, 100));

  const grouped = new Map<string, Map<string, number>>();
  for (const row of metricRows ?? []) {
    const termId = String(row.term_id);
    const storyId = String(row.story_id);
    const termMap = grouped.get(termId) ?? new Map<string, number>();
    termMap.set(storyId, (termMap.get(storyId) ?? 0) + Number(row.clicks ?? 0));
    grouped.set(termId, termMap);
  }

  const storyIds = [
    ...new Set(
      [...grouped.values()].flatMap((termMap) => [...termMap.keys()])
    )
  ].slice(0, 200);

  const storyMeta = new Map<string, { title: string; slug: string }>();
  if (storyIds.length > 0) {
    const { data: stories } = await db
      .from("stories")
      .select("id, title, slug")
      .in("id", storyIds);
    for (const story of stories ?? []) {
      storyMeta.set(String(story.id), {
        title: String(story.title),
        slug: String(story.slug)
      });
    }
  }

  const limit = input.limitPerTerm ?? 3;
  for (const [termId, storyMap] of grouped.entries()) {
    const top = [...storyMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([storyId, clicks]) => {
        const meta = storyMeta.get(storyId);
        return {
          storyId,
          title: meta?.title ?? storyId.slice(0, 8),
          slug: meta?.slug ?? "",
          clicks
        };
      });
    result.set(termId, top);
  }

  return result;
}

export async function loadTaxonomyPageSeoMetrics(input: {
  from: string;
  to: string;
  termIds?: string[];
}): Promise<
  Map<
    string,
    {
      pageViews: number;
      clicks: number;
      filterApplies: number;
    }
  >
> {
  const db = createAdminClient();
  let query = db
    .from("taxonomy_daily_metrics")
    .select("term_id, taxonomy_page_views, clicks, filter_applies")
    .gte("date", input.from)
    .lte("date", input.to)
    .eq("surface", "taxonomy_page");

  if (input.termIds && input.termIds.length > 0) {
    query = query.in("term_id", input.termIds.slice(0, 100));
  }

  const { data: rows } = await query;
  const grouped = new Map<
    string,
    { pageViews: number; clicks: number; filterApplies: number }
  >();

  for (const row of rows ?? []) {
    const termId = String(row.term_id);
    const existing = grouped.get(termId) ?? { pageViews: 0, clicks: 0, filterApplies: 0 };
    existing.pageViews += Number(row.taxonomy_page_views ?? 0);
    existing.clicks += Number(row.clicks ?? 0);
    existing.filterApplies += Number(row.filter_applies ?? 0);
    grouped.set(termId, existing);
  }

  return grouped;
}
