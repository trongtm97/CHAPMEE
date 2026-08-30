import { resolveTaxonomySurface } from "@/lib/taxonomy-analytics/surface-map";
import { mapFilterSourcePage } from "@/lib/taxonomy-analytics/map-source-surface";
import type { TaxonomyAnalyticsSurface } from "@/types/taxonomy-analytics";
import type { DatabaseClient } from "@/lib/db/types";

type StoryTaxonomyLink = {
  story_id: string;
  term_id: string;
  type: string;
};

type StoryAuthor = {
  id: string;
  author_id: string;
  status: string;
};

type TermAccumulator = {
  termId: string;
  type: string;
  impressions: number;
  clicks: number;
  storyStarts: number;
  chapterCompletes: number;
  saves: number;
  purchases: number;
  revenueCoin: number;
  reportsWrongTag: number;
  reportsMissingWarning: number;
  taxonomyPageViews: number;
  filterApplies: number;
  readerIds: Set<string>;
};

type StoryTermAccumulator = {
  impressions: number;
  clicks: number;
  starts: number;
  completes: number;
  saves: number;
  purchases: number;
  revenueCoin: number;
  reports: number;
};

type CreatorTermAccumulator = {
  impressions: number;
  starts: number;
  completes: number;
  saves: number;
  purchases: number;
  revenueCoin: number;
  reports: number;
  publishedStories: number;
};

type SurfaceBuckets = Map<TaxonomyAnalyticsSurface, Map<string, TermAccumulator>>;

const PAGE_SIZE = 5000;

function dayBounds(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 10000) / 100;
}

function storyTermKey(storyId: string, termId: string) {
  return `${storyId}:${termId}`;
}

function shouldSkipEngagementFromTrackingMetadata(metadata: Record<string, unknown> | null | undefined) {
  const sourceSurface =
    typeof metadata?.source_surface === "string"
      ? metadata.source_surface
      : typeof metadata?.sourceSurface === "string"
        ? metadata.sourceSurface
        : null;
  // Taxonomy landing fires dedicated analytics_events — avoid double count.
  return sourceSurface === "taxonomy_page";
}

function creatorTermKey(creatorId: string, termId: string) {
  return `${creatorId}:${termId}`;
}

function getOrCreateTermAcc(
  buckets: SurfaceBuckets,
  surface: TaxonomyAnalyticsSurface,
  termId: string,
  type: string
): TermAccumulator {
  if (!buckets.has(surface)) {
    buckets.set(surface, new Map());
  }
  const surfaceMap = buckets.get(surface)!;
  const key = termId;
  if (!surfaceMap.has(key)) {
    surfaceMap.set(key, {
      termId,
      type,
      impressions: 0,
      clicks: 0,
      storyStarts: 0,
      chapterCompletes: 0,
      saves: 0,
      purchases: 0,
      revenueCoin: 0,
      reportsWrongTag: 0,
      reportsMissingWarning: 0,
      taxonomyPageViews: 0,
      filterApplies: 0,
      readerIds: new Set()
    });
  }
  return surfaceMap.get(key)!;
}

function distributeToStoryTerms(
  storyTerms: Map<string, string[]>,
  termTypes: Map<string, string>,
  storyId: string | null | undefined,
  fn: (termId: string, type: string) => void
) {
  if (!storyId) {
    return;
  }
  const terms = storyTerms.get(storyId) ?? [];
  for (const termId of terms) {
    fn(termId, termTypes.get(termId) ?? "unknown");
  }
}

async function paginateQuery<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
) {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await fetchPage(offset, offset + PAGE_SIZE - 1);
    if (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }

  return rows;
}

export type AggregateTaxonomyDailyResult = {
  ok: boolean;
  date: string;
  termsProcessed: number;
  error?: string;
};

export async function aggregateTaxonomyDailyMetrics(
  db: DatabaseClient,
  date: string
): Promise<AggregateTaxonomyDailyResult> {
  const { start, end } = dayBounds(date);

  try {
    const [links, stories, termRows] = await Promise.all([
      paginateQuery<StoryTaxonomyLink>((from, to) =>
        db
          .from("story_taxonomy_terms")
          .select("story_id, term_id, type")
          .range(from, to)
          .then(({ data, error }) => ({ data, error: error as Error | null }))
      ),
      paginateQuery<StoryAuthor>((from, to) =>
        db
          .from("stories")
          .select("id, author_id, status")
          .eq("status", "published")
          .range(from, to)
          .then(({ data, error }) => ({ data, error: error as Error | null }))
      ),
      paginateQuery<{ id: string; type: string; slug: string }>((from, to) =>
        db
          .from("taxonomy_terms")
          .select("id, type, slug")
          .range(from, to)
          .then(({ data, error }) => ({ data, error: error as Error | null }))
      )
    ]);

    const storyTerms = new Map<string, string[]>();
    const termTypes = new Map<string, string>();
    const termSlugIndex = new Map<string, string>();
    const storyAuthors = new Map<string, string>();
    const termStoryCounts = new Map<string, Set<string>>();
    const termCreatorCounts = new Map<string, Set<string>>();

    for (const row of termRows) {
      termTypes.set(row.id, row.type);
      termSlugIndex.set(`${row.type}:${row.slug}`, row.id);
    }

    for (const link of links) {
      termTypes.set(link.term_id, link.type);
      const list = storyTerms.get(link.story_id) ?? [];
      list.push(link.term_id);
      storyTerms.set(link.story_id, list);

      const storySet = termStoryCounts.get(link.term_id) ?? new Set<string>();
      storySet.add(link.story_id);
      termStoryCounts.set(link.term_id, storySet);
    }

    for (const story of stories) {
      storyAuthors.set(story.id, story.author_id);
      const terms = storyTerms.get(story.id) ?? [];
      for (const termId of terms) {
        const creatorSet = termCreatorCounts.get(termId) ?? new Set<string>();
        creatorSet.add(story.author_id);
        termCreatorCounts.set(termId, creatorSet);
      }
    }

    const surfaceBuckets: SurfaceBuckets = new Map();
    const storyMetrics = new Map<string, StoryTermAccumulator>();
    const creatorMetrics = new Map<string, CreatorTermAccumulator>();

    const bumpStoryCreator = (
      storyId: string,
      termId: string,
      patch: Partial<StoryTermAccumulator & CreatorTermAccumulator>
    ) => {
      const stKey = storyTermKey(storyId, termId);
      const existing = storyMetrics.get(stKey) ?? {
        impressions: 0,
        clicks: 0,
        starts: 0,
        completes: 0,
        saves: 0,
        purchases: 0,
        revenueCoin: 0,
        reports: 0
      };
      storyMetrics.set(stKey, {
        impressions: existing.impressions + (patch.impressions ?? 0),
        clicks: existing.clicks + (patch.clicks ?? 0),
        starts: existing.starts + (patch.starts ?? 0),
        completes: existing.completes + (patch.completes ?? 0),
        saves: existing.saves + (patch.saves ?? 0),
        purchases: existing.purchases + (patch.purchases ?? 0),
        revenueCoin: existing.revenueCoin + (patch.revenueCoin ?? 0),
        reports: existing.reports + (patch.reports ?? 0)
      });

      const authorId = storyAuthors.get(storyId);
      if (!authorId) {
        return;
      }
      const ctKey = creatorTermKey(authorId, termId);
      const creatorExisting = creatorMetrics.get(ctKey) ?? {
        impressions: 0,
        starts: 0,
        completes: 0,
        saves: 0,
        purchases: 0,
        revenueCoin: 0,
        reports: 0,
        publishedStories: termStoryCounts.get(termId)?.has(storyId) ? 1 : 0
      };
      creatorMetrics.set(ctKey, {
        impressions: creatorExisting.impressions + (patch.impressions ?? 0),
        starts: creatorExisting.starts + (patch.starts ?? 0),
        completes: creatorExisting.completes + (patch.completes ?? 0),
        saves: creatorExisting.saves + (patch.saves ?? 0),
        purchases: creatorExisting.purchases + (patch.purchases ?? 0),
        revenueCoin: creatorExisting.revenueCoin + (patch.revenueCoin ?? 0),
        reports: creatorExisting.reports + (patch.reports ?? 0),
        publishedStories: creatorExisting.publishedStories
      });
    };

    const exposureRows = await paginateQuery<{
      story_id: string | null;
      surface: string;
      metadata: Record<string, unknown> | null;
    }>((from, to) =>
      db
        .from("exposure_events")
        .select("story_id, surface, metadata")
        .gte("created_at", start)
        .lt("created_at", end)
        .eq("item_type", "story")
        .range(from, to)
        .then(({ data, error }) => ({ data, error: error as Error | null }))
    );

    for (const row of exposureRows) {
      if (shouldSkipEngagementFromTrackingMetadata(row.metadata)) {
        continue;
      }
      const surface = resolveTaxonomySurface(row.surface, row.metadata);
      distributeToStoryTerms(storyTerms, termTypes, row.story_id, (termId, type) => {
        const acc = getOrCreateTermAcc(surfaceBuckets, surface, termId, type);
        acc.impressions += 1;
        if (row.story_id) {
          bumpStoryCreator(row.story_id, termId, { impressions: 1 });
        }
      });
    }

    const actionRows = await paginateQuery<{
      story_id: string | null;
      surface: string;
      action_type: string;
      user_id: string | null;
      metadata: Record<string, unknown> | null;
      value_numeric: number | null;
    }>((from, to) =>
      db
        .from("user_action_events")
        .select("story_id, surface, action_type, user_id, metadata, value_numeric")
        .gte("created_at", start)
        .lt("created_at", end)
        .eq("item_type", "story")
        .range(from, to)
        .then(({ data, error }) => ({ data, error: error as Error | null }))
    );

    for (const row of actionRows) {
      if (
        (row.action_type === "impression" || row.action_type === "click") &&
        shouldSkipEngagementFromTrackingMetadata(row.metadata)
      ) {
        continue;
      }
      if (row.action_type === "save" || row.action_type === "unlock_paid") {
        continue;
      }
      const surface = resolveTaxonomySurface(row.surface, row.metadata);
      distributeToStoryTerms(storyTerms, termTypes, row.story_id, (termId, type) => {
        const acc = getOrCreateTermAcc(surfaceBuckets, surface, termId, type);
        const storyId = row.story_id;
        if (row.action_type === "impression") {
          acc.impressions += 1;
          if (storyId) bumpStoryCreator(storyId, termId, { impressions: 1 });
        } else if (row.action_type === "click") {
          acc.clicks += 1;
          if (storyId) bumpStoryCreator(storyId, termId, { clicks: 1 });
        } else if (row.action_type === "read_start") {
          acc.storyStarts += 1;
          if (row.user_id) acc.readerIds.add(row.user_id);
          if (storyId) bumpStoryCreator(storyId, termId, { starts: 1 });
        } else if (row.action_type === "read_complete") {
          acc.chapterCompletes += 1;
          if (storyId) bumpStoryCreator(storyId, termId, { completes: 1 });
        }
      });
    }

    const analyticsRows = await paginateQuery<{
      event_name: string;
      user_id: string | null;
      properties: Record<string, unknown> | null;
    }>((from, to) =>
      db
        .from("analytics_events")
        .select("event_name, user_id, properties")
        .gte("created_at", start)
        .lt("created_at", end)
        .in("event_name", [
          "taxonomy_page_view",
          "taxonomy_filter_apply",
          "story_impression",
          "story_click",
          "chapter_start",
          "chapter_complete",
          "story_save",
          "story_purchase",
          "report_wrong_tag",
          "report_missing_warning"
        ])
        .range(from, to)
        .then(({ data, error }) => ({ data, error: error as Error | null }))
    );

    for (const row of analyticsRows) {
      const props = row.properties ?? {};
      const storyId = typeof props.story_id === "string" ? props.story_id : null;
      const termIdDirect = typeof props.term_id === "string" ? props.term_id : null;
      const surfaceRaw =
        typeof props.source_surface === "string" ? props.source_surface : "other";
      const surface = resolveTaxonomySurface(surfaceRaw, props);

      if (row.event_name === "taxonomy_page_view" && termIdDirect) {
        const type = termTypes.get(termIdDirect) ?? String(props.type ?? "unknown");
        const acc = getOrCreateTermAcc(surfaceBuckets, "taxonomy_page", termIdDirect, type);
        acc.taxonomyPageViews += 1;
        const allAcc = getOrCreateTermAcc(surfaceBuckets, "all", termIdDirect, type);
        allAcc.taxonomyPageViews += 1;
        continue;
      }

      if (row.event_name === "taxonomy_filter_apply") {
        const sourcePage =
          typeof props.source_page === "string" ? props.source_page : "truyen";
        const surface = mapFilterSourcePage(sourcePage);
        const resolvedTermIds = new Set<string>();

        if (Array.isArray(props.term_ids)) {
          for (const id of props.term_ids) {
            if (typeof id === "string") {
              resolvedTermIds.add(id);
            }
          }
        }

        const selectedTerms = props.selected_terms;
        if (Array.isArray(selectedTerms)) {
          for (const item of selectedTerms) {
            if (
              item &&
              typeof item === "object" &&
              "type" in item &&
              "slug" in item &&
              typeof item.type === "string" &&
              typeof item.slug === "string"
            ) {
              const termId = termSlugIndex.get(`${item.type}:${item.slug}`);
              if (termId) {
                resolvedTermIds.add(termId);
              }
            }
          }
        }

        for (const termId of resolvedTermIds) {
          const type = termTypes.get(termId) ?? "unknown";
          const acc = getOrCreateTermAcc(surfaceBuckets, surface, termId, type);
          acc.filterApplies += 1;
          const allAcc = getOrCreateTermAcc(surfaceBuckets, "all", termId, type);
          allAcc.filterApplies += 1;
        }
        continue;
      }

      const applyStoryEvent = (
        patch: Partial<TermAccumulator & StoryTermAccumulator>,
        targetSurface: TaxonomyAnalyticsSurface = surface
      ) => {
        distributeToStoryTerms(storyTerms, termTypes, storyId, (termId, type) => {
          const acc = getOrCreateTermAcc(surfaceBuckets, targetSurface, termId, type);
          const allAcc = getOrCreateTermAcc(surfaceBuckets, "all", termId, type);
          if (patch.impressions) {
            acc.impressions += patch.impressions;
            allAcc.impressions += patch.impressions;
          }
          if (patch.clicks) {
            acc.clicks += patch.clicks;
            allAcc.clicks += patch.clicks;
          }
          if (patch.storyStarts) {
            acc.storyStarts += patch.storyStarts;
            allAcc.storyStarts += patch.storyStarts;
          }
          if (patch.chapterCompletes) {
            acc.chapterCompletes += patch.chapterCompletes;
            allAcc.chapterCompletes += patch.chapterCompletes;
          }
          if (patch.saves) {
            acc.saves += patch.saves;
            allAcc.saves += patch.saves;
          }
          if (patch.purchases) {
            acc.purchases += patch.purchases;
            allAcc.purchases += patch.purchases;
          }
          if (patch.revenueCoin) {
            acc.revenueCoin += patch.revenueCoin;
            allAcc.revenueCoin += patch.revenueCoin;
          }
          if (patch.reportsWrongTag) {
            acc.reportsWrongTag += patch.reportsWrongTag;
            allAcc.reportsWrongTag += patch.reportsWrongTag;
          }
          if (patch.reportsMissingWarning) {
            acc.reportsMissingWarning += patch.reportsMissingWarning;
            allAcc.reportsMissingWarning += patch.reportsMissingWarning;
          }
          if (row.user_id && patch.storyStarts) {
            acc.readerIds.add(row.user_id);
            allAcc.readerIds.add(row.user_id);
          }
          if (storyId) {
            bumpStoryCreator(storyId, termId, {
              impressions: patch.impressions,
              clicks: patch.clicks,
              starts: patch.storyStarts,
              completes: patch.chapterCompletes,
              saves: patch.saves,
              purchases: patch.purchases,
              revenueCoin: patch.revenueCoin,
              reports: (patch.reportsWrongTag ?? 0) + (patch.reports ?? 0)
            });
          }
        });
      };

      if (row.event_name === "story_impression") {
        applyStoryEvent({ impressions: 1 });
      } else if (row.event_name === "story_click") {
        applyStoryEvent({ clicks: 1 });
      } else if (row.event_name === "chapter_start") {
        applyStoryEvent({ storyStarts: 1 });
      } else if (row.event_name === "chapter_complete") {
        applyStoryEvent({ chapterCompletes: 1 });
      } else if (row.event_name === "story_save") {
        applyStoryEvent({ saves: 1 });
      } else if (row.event_name === "story_purchase") {
        const coin = Number(props.revenue_coin ?? 0);
        applyStoryEvent({ purchases: 1, revenueCoin: coin });
      } else if (row.event_name === "report_wrong_tag") {
        applyStoryEvent({ reportsWrongTag: 1, reports: 1 });
      } else if (row.event_name === "report_missing_warning") {
        applyStoryEvent({ reportsMissingWarning: 1, reports: 1 });
      }
    }

    const reportRows = await paginateQuery<{
      target_id: string;
      reason: string;
    }>((from, to) =>
      db
        .from("reports")
        .select("target_id, reason")
        .gte("created_at", start)
        .lt("created_at", end)
        .eq("target_type", "story")
        .in("reason", ["wrong_taxonomy_tag", "missing_content_warning"])
        .range(from, to)
        .then(({ data, error }) => ({ data, error: error as Error | null }))
    );

    for (const row of reportRows) {
      distributeToStoryTerms(storyTerms, termTypes, row.target_id, (termId, type) => {
        const acc = getOrCreateTermAcc(surfaceBuckets, "all", termId, type);
        if (row.reason === "wrong_taxonomy_tag") {
          acc.reportsWrongTag += 1;
          bumpStoryCreator(row.target_id, termId, { reports: 1 });
        } else {
          acc.reportsMissingWarning += 1;
          bumpStoryCreator(row.target_id, termId, { reports: 1 });
        }
      });
    }

    const dailyUpserts: Record<string, unknown>[] = [];
    for (const [surface, termMap] of surfaceBuckets.entries()) {
      for (const acc of termMap.values()) {
        dailyUpserts.push({
          date,
          term_id: acc.termId,
          type: acc.type,
          surface,
          impressions: acc.impressions,
          clicks: acc.clicks,
          ctr: pct(acc.clicks, acc.impressions),
          story_starts: acc.storyStarts,
          chapter_completes: acc.chapterCompletes,
          completion_rate: pct(acc.chapterCompletes, acc.storyStarts),
          saves: acc.saves,
          purchases: acc.purchases,
          revenue_coin: acc.revenueCoin,
          reports_wrong_tag: acc.reportsWrongTag,
          reports_missing_warning: acc.reportsMissingWarning,
          taxonomy_page_views: acc.taxonomyPageViews,
          filter_applies: acc.filterApplies,
          unique_readers: acc.readerIds.size,
          active_stories: termStoryCounts.get(acc.termId)?.size ?? 0,
          active_creators: termCreatorCounts.get(acc.termId)?.size ?? 0,
          updated_at: new Date().toISOString()
        });
      }
    }

    if (dailyUpserts.length > 0) {
      const { error } = await db
        .from("taxonomy_daily_metrics")
        .upsert(dailyUpserts, { onConflict: "date,term_id,surface" });
      if (error) {
        throw error;
      }
    }

    const storyUpserts: Record<string, unknown>[] = [];
    for (const [key, metrics] of storyMetrics.entries()) {
      const [storyId, termId] = key.split(":");
      storyUpserts.push({
        date,
        term_id: termId,
        story_id: storyId,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        starts: metrics.starts,
        completes: metrics.completes,
        saves: metrics.saves,
        purchases: metrics.purchases,
        revenue_coin: metrics.revenueCoin,
        reports: metrics.reports,
        updated_at: new Date().toISOString()
      });
    }

    if (storyUpserts.length > 0) {
      const { error } = await db
        .from("taxonomy_story_metrics")
        .upsert(storyUpserts, { onConflict: "date,term_id,story_id" });
      if (error) {
        throw error;
      }
    }

    const creatorUpserts: Record<string, unknown>[] = [];
    for (const [key, metrics] of creatorMetrics.entries()) {
      const [creatorId, termId] = key.split(":");
      creatorUpserts.push({
        date,
        term_id: termId,
        creator_id: creatorId,
        published_stories: termStoryCounts.get(termId)?.size ?? metrics.publishedStories,
        impressions: metrics.impressions,
        starts: metrics.starts,
        completes: metrics.completes,
        saves: metrics.saves,
        purchases: metrics.purchases,
        revenue_coin: metrics.revenueCoin,
        reports: metrics.reports,
        updated_at: new Date().toISOString()
      });
    }

    if (creatorUpserts.length > 0) {
      const { error } = await db
        .from("taxonomy_creator_metrics")
        .upsert(creatorUpserts, { onConflict: "date,term_id,creator_id" });
      if (error) {
        throw error;
      }
    }

    return {
      ok: true,
      date,
      termsProcessed: dailyUpserts.length
    };
  } catch (error) {
    return {
      ok: false,
      date,
      termsProcessed: 0,
      error: error instanceof Error ? error.message : "Aggregation failed."
    };
  }
}

export function defaultAggregationDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function aggregateTaxonomyDateRange(
  db: DatabaseClient,
  from: string,
  to: string
) {
  const results: AggregateTaxonomyDailyResult[] = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10);
    results.push(await aggregateTaxonomyDailyMetrics(db, date));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return results;
}
