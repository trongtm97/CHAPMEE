import { buildTaxonomyInsights } from "@/lib/taxonomy-analytics/insights";
import {
  loadSeoTopStoriesByTerm,
  loadTaxonomyPageSeoMetrics
} from "@/lib/taxonomy-analytics/load-seo-metrics";
import { resolveTaxonomyCanonicalPath } from "@/lib/seo/taxonomy-seo";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  TaxonomyAnalyticsFilters,
  TaxonomyAnalyticsPageData,
  TaxonomyAnalyticsSurface,
  TaxonomyAnalyticsTermSummary,
  TaxonomyCreatorContribution,
  TaxonomySeoPageMetric,
  TaxonomySurfaceContribution
} from "@/types/taxonomy-analytics";
import type { TaxonomyTerm } from "@/types/taxonomy";

function parseDate(value: string | undefined, fallback: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }
  return value;
}

function defaultFromDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultToDate() {
  return new Date().toISOString().slice(0, 10);
}

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 10000) / 100;
}

function pctNullable(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return pct(numerator, denominator);
}

function deltaPctNullable(current: number, prev: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(prev)) return null;
  if (prev <= 0) return null;
  return Math.round(((current - prev) / prev) * 10000) / 100;
}

function sumRows(rows: Array<Record<string, number>>, field: string) {
  return rows.reduce((acc, row) => acc + Number(row[field] ?? 0), 0);
}

function aggregateTermRows(
  rows: Array<{
    term_id: string;
    impressions: number;
    clicks: number;
    story_starts: number;
    chapter_completes: number;
    saves: number;
    purchases: number;
    revenue_coin: number;
    reports_wrong_tag: number;
    reports_missing_warning: number;
    taxonomy_page_views: number;
    filter_applies: number;
    active_stories: number;
    active_creators: number;
  }>,
  termsById: Map<string, TaxonomyTerm>
): TaxonomyAnalyticsTermSummary[] {
  const grouped = new Map<string, TaxonomyAnalyticsTermSummary>();

  for (const row of rows) {
    const term = termsById.get(row.term_id);
    if (!term) {
      continue;
    }
    const existing = grouped.get(row.term_id) ?? {
      termId: row.term_id,
      termName: term.name,
      termSlug: term.slug,
      type: term.type,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      storyStarts: 0,
      chapterCompletes: 0,
      storyStartsPrev: null,
      chapterCompletesPrev: null,
      completionRatePrev: null,
      storyStartsGrowthPct: null,
      completionRateGrowthPct: null,
      completionRate: 0,
      saves: 0,
      purchases: 0,
      revenueCoin: 0,
      reportsWrongTag: 0,
      reportsMissingWarning: 0,
      taxonomyPageViews: 0,
      filterApplies: 0,
      activeStories: row.active_stories,
      activeCreators: row.active_creators,
      seoIndexable: term.seo_indexable,
      landingUrl: resolveTaxonomyCanonicalPath(term),
      seoTitle: term.seo_title,
      seoDescription: term.seo_description,
      saveRate: null,
      paidUnlocks: 0,
      paidConversionRate: null,
      revenuePerStart: null,
      revenuePer1000Impressions: null
    };

    existing.impressions += row.impressions;
    existing.clicks += row.clicks;
    existing.storyStarts += row.story_starts;
    existing.chapterCompletes += row.chapter_completes;
    existing.saves += row.saves;
    existing.purchases += row.purchases;
    existing.revenueCoin += Number(row.revenue_coin);
    existing.reportsWrongTag += row.reports_wrong_tag;
    existing.reportsMissingWarning += row.reports_missing_warning;
    existing.taxonomyPageViews += row.taxonomy_page_views;
    existing.filterApplies += row.filter_applies ?? 0;
    existing.activeStories = Math.max(existing.activeStories, row.active_stories);
    existing.activeCreators = Math.max(existing.activeCreators, row.active_creators);
    grouped.set(row.term_id, existing);
  }

  return [...grouped.values()].map((row) => ({
    ...row,
    ctr: pct(row.clicks, row.impressions),
    completionRate: pct(row.chapterCompletes, row.storyStarts),
    saveRate: pctNullable(row.saves, row.storyStarts),
    paidUnlocks: row.purchases,
    paidConversionRate: pctNullable(row.purchases, row.storyStarts),
    revenuePerStart:
      row.storyStarts > 0 ? Number(row.revenueCoin) / row.storyStarts : null,
    revenuePer1000Impressions:
      row.impressions > 0 ? Number(row.revenueCoin) / (row.impressions / 1000) : null,
  }));
}

export function parseTaxonomyAnalyticsFilters(
  raw: Record<string, string | string[] | undefined>
): TaxonomyAnalyticsFilters {
  const toNonNegativeInt = (value: unknown, fallback: number) => {
    const n = typeof value === "string" ? Number(value) : NaN;
    if (!Number.isFinite(n) || n < 0) return fallback;
    return Math.floor(n);
  };

  const surfaceRaw = typeof raw.surface === "string" ? raw.surface : "all";
  const surface = (
    [
      "all",
      "reels",
      "discover",
      "search",
      "catalog",
      "taxonomy_page",
      "profile",
      "community",
      "ranking",
      "other"
    ] as const
  ).includes(surfaceRaw as TaxonomyAnalyticsSurface)
    ? (surfaceRaw as TaxonomyAnalyticsSurface)
    : "all";

  return {
    from: parseDate(typeof raw.from === "string" ? raw.from : undefined, defaultFromDate()),
    to: parseDate(typeof raw.to === "string" ? raw.to : undefined, defaultToDate()),
    type: typeof raw.type === "string" && raw.type !== "all" ? raw.type : null,
    termId: typeof raw.term === "string" && raw.term ? raw.term : null,
    surface,
    mainGenreId:
      typeof raw.mainGenre === "string" && raw.mainGenre ? raw.mainGenre : null,
    creatorId: typeof raw.creator === "string" && raw.creator ? raw.creator : null,
    monetizationType:
      typeof raw.monetization === "string" && raw.monetization ? raw.monetization : null,
    completionMinStarts: toNonNegativeInt(raw.completionMinStarts, 5),
    completionMinImpressions: toNonNegativeInt(raw.completionMinImpressions, 0),
    completionMinStories: toNonNegativeInt(raw.completionMinStories, 0)
  };
}

async function resolveFilteredTermIds(filters: TaxonomyAnalyticsFilters) {
  const supabase = createAdminClient();
  const termIds = new Set<string>();

  if (filters.termId) {
    termIds.add(filters.termId);
    return termIds;
  }

  if (filters.mainGenreId) {
    const { data: storyLinks } = await supabase
      .from("story_taxonomy_terms")
      .select("story_id")
      .eq("term_id", filters.mainGenreId)
      .eq("type", "main_genre");

    const storyIds = (storyLinks ?? []).map((row) => row.story_id);
    if (storyIds.length === 0) {
      return termIds;
    }

    const { data: relatedTerms } = await supabase
      .from("story_taxonomy_terms")
      .select("term_id")
      .in("story_id", storyIds.slice(0, 500));

    for (const row of relatedTerms ?? []) {
      termIds.add(row.term_id);
    }
    termIds.add(filters.mainGenreId);
    return termIds;
  }

  if (filters.monetizationType) {
    const { data: monetizationTerms } = await supabase
      .from("story_taxonomy_terms")
      .select("story_id, term_id")
      .eq("type", "monetization_access");

    const { data: monetizationLabels } = await supabase
      .from("taxonomy_terms")
      .select("id, slug")
      .eq("type", "monetization_access")
      .eq("slug", filters.monetizationType);

    const allowedTermIds = new Set((monetizationLabels ?? []).map((row) => row.id));
    for (const row of monetizationTerms ?? []) {
      if (allowedTermIds.has(row.term_id)) {
        termIds.add(row.term_id);
      }
    }
    return termIds;
  }

  return null;
}

export async function getTaxonomyAnalyticsPageData(
  rawFilters: Record<string, string | string[] | undefined>
): Promise<TaxonomyAnalyticsPageData> {
  const filters = parseTaxonomyAnalyticsFilters(rawFilters);
  const supabase = createAdminClient();

  const empty: TaxonomyAnalyticsPageData = {
    filters,
    summary: {
      impressions: 0,
      impressionsPrev: null,
      impressionsDeltaPct: null,
      clicks: 0,
      clicksPrev: null,
      clicksDeltaPct: null,
      ctr: 0,
      ctrPrev: null,
      ctrDeltaPct: null,
      storyStarts: 0,
      storyStartsPrev: null,
      storyStartsDeltaPct: null,
      chapterCompletes: 0,
      chapterCompletesPrev: null,
      completionRate: 0,
      completionRatePrev: null,
      completionRateDeltaPct: null,
      saves: 0,
      savesPrev: null,
      saveRate: null,
      saveRatePrev: null,
      saveRateDeltaPct: null,
      purchases: 0,
      purchasesPrev: null,
      paidConversionRate: null,
      paidConversionRatePrev: null,
      paidConversionRateDeltaPct: null,
      revenueCoin: 0,
      revenueCoinPrev: null,
      revenueCoinDeltaPct: null,
      revenuePerStart: null,
      revenuePerStartPrev: null,
      revenuePerStartDeltaPct: null,
      revenuePer1000Impressions: null,
      revenuePer1000ImpressionsPrev: null,
      revenuePer1000ImpressionsDeltaPct: null,
      reportsWrongTag: 0,
      reportsWrongTagPrev: null,
      reportsWrongTagDeltaPct: null,
      reportsMissingWarning: 0,
      reportsMissingWarningPrev: null,
      reportsMissingWarningDeltaPct: null,
      fastestGrowingTerm: null
    },
    topByReads: [],
    topByCompletion: [],
    topByRevenue: [],
    highSupplyLowDemand: [],
    lowSupplyHighRetention: [],
    topReported: [],
    seoPages: [],
    surfaceContribution: [],
    creatorContribution: [],
    insights: [],
    termOptions: [],
    creatorOptions: [],
    monetizationOptions: [],
    typeOptions: [],
    fairness: {
      topTaxonomyConcentration: [],
      topCreatorConcentration: [],
      newStoryExposureRate: null,
      coldStartExposureRate: null,
      longTailStoryExposureRate: null,
      missingNewContentTaxonomies: null,
      topStoriesDominantCount: null
    },
    recommendedActions: [],
    error: null
  };

  try {
    const filteredTermIds = await resolveFilteredTermIds(filters);

    let dailyQuery = supabase
      .from("taxonomy_daily_metrics")
      .select("*")
      .gte("date", filters.from)
      .lte("date", filters.to)
      .eq("surface", filters.surface);

    if (filters.type) {
      dailyQuery = dailyQuery.eq("type", filters.type);
    }
    if (filteredTermIds) {
      if (filteredTermIds.size === 0) {
        return empty;
      }
      dailyQuery = dailyQuery.in("term_id", [...filteredTermIds]);
    }

    const { data: dailyRows, error: dailyError } = await dailyQuery;
    if (dailyError) {
      return { ...empty, error: dailyError.message };
    }

    const { data: termRows } = await supabase
      .from("taxonomy_terms")
      .select("*")
      .order("name");

    const termsById = new Map<string, TaxonomyTerm>();
    for (const row of termRows ?? []) {
      termsById.set(row.id, row as TaxonomyTerm);
    }

    const termSummaries = aggregateTermRows(dailyRows ?? [], termsById);
    const impressions = sumRows(dailyRows ?? [], "impressions");
    const clicks = sumRows(dailyRows ?? [], "clicks");
    const storyStarts = sumRows(dailyRows ?? [], "story_starts");
    const chapterCompletes = sumRows(dailyRows ?? [], "chapter_completes");
    const saves = sumRows(dailyRows ?? [], "saves");
    const purchases = sumRows(dailyRows ?? [], "purchases");
    const revenueCoin = sumRows(dailyRows ?? [], "revenue_coin");
    const reportsWrongTag = sumRows(dailyRows ?? [], "reports_wrong_tag");
    const reportsMissingWarning = sumRows(dailyRows ?? [], "reports_missing_warning");

    const topByReads = [...termSummaries]
      .sort((a, b) => b.storyStarts - a.storyStarts)
      .slice(0, 50);
    const topByCompletion = [...termSummaries]
      .filter(
        (row) =>
          row.storyStarts >= filters.completionMinStarts &&
          row.impressions >= filters.completionMinImpressions &&
          row.activeStories >= filters.completionMinStories
      )
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 50);
    const topByRevenue = [...termSummaries]
      .sort((a, b) => b.revenueCoin - a.revenueCoin)
      .slice(0, 50);
    const highSupplyLowDemand = [...termSummaries]
      .filter((row) => row.activeStories >= 10 && row.storyStarts <= 10)
      .sort((a, b) => b.activeStories - a.activeStories)
      .slice(0, 50);
    const lowSupplyHighRetention = [...termSummaries]
      .filter((row) => row.activeStories <= 5 && row.completionRate >= 35)
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 50);
    const topReported = [...termSummaries]
      .filter((row) => row.reportsWrongTag > 0 || row.reportsMissingWarning > 0)
      .sort((a, b) => (b.reportsWrongTag + b.reportsMissingWarning) - (a.reportsWrongTag + a.reportsMissingWarning))
      .slice(0, 50);

    let surfaceQuery = supabase
      .from("taxonomy_daily_metrics")
      .select("surface, impressions, clicks, story_starts")
      .gte("date", filters.from)
      .lte("date", filters.to);

    if (filters.surface === "all") surfaceQuery = surfaceQuery.neq("surface", "all");
    else surfaceQuery = surfaceQuery.eq("surface", filters.surface);

    if (filters.type) surfaceQuery = surfaceQuery.eq("type", filters.type);
    if (filteredTermIds) {
      if (filteredTermIds.size === 0) return empty;
      surfaceQuery = surfaceQuery.in("term_id", [...filteredTermIds]);
    }

    const { data: surfaceRows } = await surfaceQuery;

    const surfaceGrouped = new Map<string, TaxonomySurfaceContribution>();
    for (const row of surfaceRows ?? []) {
      const existing = surfaceGrouped.get(row.surface) ?? {
        surface: row.surface as TaxonomyAnalyticsSurface,
        impressions: 0,
        impressionsShare: null,
        clicks: 0,
        storyStarts: 0,
        ctr: 0
      };
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.storyStarts += row.story_starts;
      surfaceGrouped.set(row.surface, existing);
    }
    const totalImpressions = [...surfaceGrouped.values()].reduce(
      (sum, r) => sum + r.impressions,
      0
    );

    const surfaceContribution = [...surfaceGrouped.values()]
      .map((row) => ({
        ...row,
        ctr: pct(row.clicks, row.impressions),
        impressionsShare:
          totalImpressions > 0 ? Math.round((row.impressions / totalImpressions) * 10000) / 100 : null
      }))
      .sort((a, b) => b.impressions - a.impressions);

    const seoPagesBase = termSummaries
      .filter((row) => row.taxonomyPageViews > 0 || row.landingUrl)
      .map((row) => {
        const landingUrl = row.landingUrl ?? "—";
        return {
          termId: row.termId,
          termName: row.termName,
          termSlug: row.termSlug,
          type: row.type,
          landingUrl,
          indexable: row.seoIndexable,
          seoTitlePresent: Boolean(row.seoTitle && row.seoTitle.trim().length > 0),
          seoDescriptionPresent: Boolean(
            row.seoDescription && row.seoDescription.trim().length > 0
          ),
          // Duplicate risk is computed after the full list is built.
          duplicateRisk: false,
          duplicateCount: 1,
          pageViews: row.taxonomyPageViews,
          storyClicks: row.clicks,
          filterApplies: row.filterApplies,
          ctr: pct(row.clicks, row.taxonomyPageViews),
          publishedStoryCount: row.activeStories,
          lowContent: row.activeStories < 3,
          topStories: [] as TaxonomySeoPageMetric["topStories"]
        };
      });

    const landingUrlCounts = seoPagesBase.reduce((acc, row) => {
      acc.set(row.landingUrl, (acc.get(row.landingUrl) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());

    const seoPages: TaxonomySeoPageMetric[] = seoPagesBase
      .map((row) => {
        const count = landingUrlCounts.get(row.landingUrl) ?? 1;
        return {
          ...row,
          duplicateCount: count,
          duplicateRisk: count > 1
        };
      })
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, 50);

    if (seoPages.length > 0) {
      const seoTermIds = seoPages.map((row) => row.termId);
      const [pageSeoMetrics, topStoriesByTerm] = await Promise.all([
        loadTaxonomyPageSeoMetrics({
          from: filters.from,
          to: filters.to,
          termIds: seoTermIds
        }),
        loadSeoTopStoriesByTerm({
          from: filters.from,
          to: filters.to,
          termIds: seoTermIds,
          limitPerTerm: 3
        })
      ]);

      for (const page of seoPages) {
        const seoMetrics = pageSeoMetrics.get(page.termId);
        if (seoMetrics) {
          page.pageViews = seoMetrics.pageViews;
          page.storyClicks = seoMetrics.clicks;
          page.filterApplies = seoMetrics.filterApplies;
          page.ctr = pct(seoMetrics.clicks, seoMetrics.pageViews);
        }
        page.topStories = topStoriesByTerm.get(page.termId) ?? [];
      }
    }

    let creatorQuery = supabase
      .from("taxonomy_creator_metrics")
      .select("*")
      .gte("date", filters.from)
      .lte("date", filters.to);

    if (filters.creatorId) {
      creatorQuery = creatorQuery.eq("creator_id", filters.creatorId);
    }
    if (filteredTermIds && filteredTermIds.size > 0) {
      creatorQuery = creatorQuery.in("term_id", [...filteredTermIds]);
    }

    const { data: creatorRows } = await creatorQuery;

    const creatorGrouped = new Map<string, TaxonomyCreatorContribution>();
    for (const row of creatorRows ?? []) {
      const term = termsById.get(row.term_id);
      const existing: TaxonomyCreatorContribution = creatorGrouped.get(row.creator_id) ?? {
        creatorId: row.creator_id,
        creatorName: row.creator_id.slice(0, 8),
        creatorHandle: null,
        termIds: [],
        termLabels: [],
        impressions: 0,
        publishedStories: 0,
        starts: 0,
        completes: 0,
        completionRate: 0,
        concentrationShare: null,
        coverageTaxonomyCount: 0,
        warning: false,
        revenueCoin: 0,
        reports: 0
      };
      if (term && !existing.termIds.includes(term.id)) {
        existing.termIds.push(term.id);
        existing.termLabels.push(term.name);
      }
      existing.impressions += row.impressions;
      existing.publishedStories += row.published_stories;
      existing.starts += row.starts;
      existing.completes += row.completes;
      existing.revenueCoin += Number(row.revenue_coin);
      existing.reports += row.reports;
      creatorGrouped.set(row.creator_id, existing);
    }

    const creatorIds = [...creatorGrouped.keys()];
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", creatorIds.slice(0, 200));

      for (const profile of profiles ?? []) {
        const row = creatorGrouped.get(profile.id);
        if (row) {
          row.creatorName = profile.display_name ?? profile.username ?? row.creatorName;
          row.creatorHandle = profile.username;
        }
      }
    }

    const totalCreatorImpressions = [...creatorGrouped.values()].reduce(
      (sum, r) => sum + r.impressions,
      0
    );

    const creatorContribution = [...creatorGrouped.values()]
      .map((row) => {
        const concentrationShare =
          totalCreatorImpressions > 0 ? row.impressions / totalCreatorImpressions : null;
        return {
          ...row,
          completionRate: pct(row.completes, row.starts),
          concentrationShare,
          coverageTaxonomyCount: row.termLabels.length,
          warning: concentrationShare !== null && concentrationShare >= 0.2
        };
      })
      .sort((a, b) => b.starts - a.starts)
      .slice(0, 50);

    const periodDays =
      (new Date(`${filters.to}T00:00:00.000Z`).getTime() -
        new Date(`${filters.from}T00:00:00.000Z`).getTime()) /
        (24 * 60 * 60 * 1000) +
      1;
    const prevTo = new Date(`${filters.from}T00:00:00.000Z`);
    prevTo.setUTCDate(prevTo.getUTCDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setUTCDate(prevFrom.getUTCDate() - Math.max(1, Math.floor(periodDays)) + 1);

    let prevQuery = supabase
      .from("taxonomy_daily_metrics")
      .select(
        "term_id, impressions, clicks, story_starts, chapter_completes, saves, purchases, revenue_coin, reports_wrong_tag, reports_missing_warning"
      )
      .gte("date", prevFrom.toISOString().slice(0, 10))
      .lte("date", prevTo.toISOString().slice(0, 10))
      .eq("surface", filters.surface);

    if (filters.type) {
      prevQuery = prevQuery.eq("type", filters.type);
    }

    if (filteredTermIds) {
      if (filteredTermIds.size === 0) return empty;
      prevQuery = prevQuery.in("term_id", [...filteredTermIds]);
    }

    const { data: prevRows } = await prevQuery;

    const prevByTerm = new Map<
      string,
      {
        impressions: number;
        clicks: number;
        storyStarts: number;
        chapterCompletes: number;
        saves: number;
        purchases: number;
        revenueCoin: number;
        reportsWrongTag: number;
        reportsMissingWarning: number;
      }
    >();

    let prevImpressions = 0;
    let prevClicks = 0;
    let prevStoryStarts = 0;
    let prevChapterCompletes = 0;
    let prevSaves = 0;
    let prevPurchases = 0;
    let prevRevenueCoin = 0;
    let prevReportsWrongTag = 0;
    let prevReportsMissingWarning = 0;

    for (const row of prevRows ?? []) {
      const termId = String(row.term_id);
      const existing =
        prevByTerm.get(termId) ?? {
          impressions: 0,
          clicks: 0,
          storyStarts: 0,
          chapterCompletes: 0,
          saves: 0,
          purchases: 0,
          revenueCoin: 0,
          reportsWrongTag: 0,
          reportsMissingWarning: 0
        };

      existing.impressions += Number(row.impressions ?? 0);
      existing.clicks += Number(row.clicks ?? 0);
      existing.storyStarts += Number(row.story_starts ?? 0);
      existing.chapterCompletes += Number(row.chapter_completes ?? 0);
      existing.saves += Number(row.saves ?? 0);
      existing.purchases += Number(row.purchases ?? 0);
      existing.revenueCoin += Number(row.revenue_coin ?? 0);
      existing.reportsWrongTag += Number(row.reports_wrong_tag ?? 0);
      existing.reportsMissingWarning += Number(row.reports_missing_warning ?? 0);

      prevByTerm.set(termId, existing);

      prevImpressions += Number(row.impressions ?? 0);
      prevClicks += Number(row.clicks ?? 0);
      prevStoryStarts += Number(row.story_starts ?? 0);
      prevChapterCompletes += Number(row.chapter_completes ?? 0);
      prevSaves += Number(row.saves ?? 0);
      prevPurchases += Number(row.purchases ?? 0);
      prevRevenueCoin += Number(row.revenue_coin ?? 0);
      prevReportsWrongTag += Number(row.reports_wrong_tag ?? 0);
      prevReportsMissingWarning += Number(row.reports_missing_warning ?? 0);
    }

    // Attach prev/trend to each term summary so tables can show "Trend".
    for (const term of termSummaries) {
      const prev = prevByTerm.get(term.termId);
      term.storyStartsPrev = prev ? prev.storyStarts : null;
      term.chapterCompletesPrev = prev ? prev.chapterCompletes : null;
      term.completionRatePrev =
        prev && prev.storyStarts > 0
          ? pct(prev.chapterCompletes, prev.storyStarts)
          : null;

      if (prev && prev.storyStarts > 0) {
        term.storyStartsGrowthPct = deltaPctNullable(term.storyStarts, prev.storyStarts);
        term.completionRateGrowthPct =
          term.completionRatePrev !== null
            ? deltaPctNullable(term.completionRate, term.completionRatePrev)
            : null;
      } else if (prev) {
        term.storyStartsGrowthPct = term.storyStarts > 0 ? 100 : 0;
        term.completionRateGrowthPct = null;
      }
    }

    let fastestGrowingTerm: TaxonomyAnalyticsPageData["summary"]["fastestGrowingTerm"] = null;
    let bestGrowth = -Infinity;
    for (const term of termSummaries) {
      const prev = prevByTerm.get(term.termId);
      const prevStarts = prev?.storyStarts ?? 0;
      const growthPct =
        prevStarts > 0 ? (term.storyStartsGrowthPct ?? 0) : term.storyStarts > 0 ? 100 : 0;
      if (growthPct > bestGrowth) {
        bestGrowth = growthPct;
        fastestGrowingTerm = {
          termId: term.termId,
          termName: term.termName,
          growthPct
        };
      }
    }

    const insights = buildTaxonomyInsights(termSummaries);

    const typeOptions = [...new Set((termRows ?? []).map((row) => row.type))].sort();
    const termOptions = (termRows ?? [])
      .map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        type: row.type
      }))
      .slice(0, 500);

    const monetizationOptions = (termRows ?? [])
      .filter((row) => row.type === "monetization_access")
      .map((row) => ({ slug: row.slug, name: row.name }))
      .slice(0, 50);

    const { data: creatorMetricCreators } = await supabase
      .from("taxonomy_creator_metrics")
      .select("creator_id")
      .gte("date", filters.from)
      .lte("date", filters.to);

    const creatorIdSet = [...new Set((creatorMetricCreators ?? []).map((row) => row.creator_id))].slice(
      0,
      100
    );
    let creatorOptions: TaxonomyAnalyticsPageData["creatorOptions"] = [];
    if (creatorIdSet.length > 0) {
      const { data: creatorProfiles } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", creatorIdSet);
      creatorOptions = (creatorProfiles ?? []).map((row) => ({
        id: row.id,
        name: row.display_name ?? row.username ?? row.id.slice(0, 8),
        handle: row.username
      }));
    }

    const totalTermImpressions = termSummaries.reduce((sum, t) => sum + t.impressions, 0);

    const topTaxonomyConcentration = [...termSummaries]
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20)
      .map((t) => ({
        termId: t.termId,
        termName: t.termName,
        impressions: t.impressions,
        share: totalTermImpressions > 0 ? Math.round((t.impressions / totalTermImpressions) * 10000) / 100 : 0
      }))
      .slice(0, 5);

    const termTotalImpressionsMap = new Map(
      termSummaries.map((t) => [t.termId, t.impressions] as const)
    );

    const termCreatorImpressions = new Map<
      string,
      Map<string, number>
    >();

    for (const row of creatorRows ?? []) {
      const termId = String(row.term_id);
      const creatorId = String(row.creator_id);
      const map = termCreatorImpressions.get(termId) ?? new Map<string, number>();
      map.set(creatorId, (map.get(creatorId) ?? 0) + Number(row.impressions ?? 0));
      termCreatorImpressions.set(termId, map);
    }

    const topCreatorConcentration = [...termCreatorImpressions.entries()]
      .map(([termId, map]) => {
        const termImpressions = termTotalImpressionsMap.get(termId) ?? 0;
        if (termImpressions <= 0) return null;

        let top: { creatorId: string; impressions: number } | null = null;
        for (const [creatorId, impressions] of map.entries()) {
          if (!top || impressions > top.impressions) {
            top = { creatorId, impressions };
          }
        }

        if (!top) return null;
        const creator = creatorGrouped.get(top.creatorId);
        if (!creator) return null;

        const termName = termSummaries.find((t) => t.termId === termId)?.termName ?? termId.slice(0, 8);
        const share = Math.round((top.impressions / termImpressions) * 10000) / 100;
        return {
          termId,
          termName,
          creatorId: top.creatorId,
          creatorName: creator.creatorName,
          creatorHandle: creator.creatorHandle,
          impressions: top.impressions,
          share
        };
      })
      .filter(Boolean) as Array<{
      termId: string;
      termName: string;
      creatorId: string;
      creatorName: string;
      creatorHandle: string | null;
      impressions: number;
      share: number;
    }>;

    const fairness: TaxonomyAnalyticsPageData["fairness"] = {
      topTaxonomyConcentration,
      topCreatorConcentration: topCreatorConcentration.sort((a, b) => b.share - a.share).slice(0, 5),
      newStoryExposureRate: null,
      coldStartExposureRate: null,
      longTailStoryExposureRate: null,
      missingNewContentTaxonomies: null,
      topStoriesDominantCount: null
    };

    const recommendedActions: TaxonomyAnalyticsPageData["recommendedActions"] = [];

    for (const insight of insights.slice(0, 6)) {
      const base = {
        id: `insight-action:${insight.id}`,
        title: insight.termName,
        description: insight.message
      };

      if (insight.kind === "high_supply_low_demand") {
        recommendedActions.push({
          ...base,
          id: base.id,
          severity: insight.severity === "critical" ? "danger" : insight.severity === "warning" ? "warning" : "info",
          actionLabel: "Rà soát",
          actionHref: "/admin/taxonomy?tab=quality"
        });
      } else if (insight.kind === "low_supply_high_demand") {
        recommendedActions.push({
          ...base,
          id: base.id,
          severity: "good",
          actionLabel: "Xem cơ hội",
          actionHref: "/admin/taxonomy"
        });
      } else if (insight.kind === "quality_concern") {
        recommendedActions.push({
          ...base,
          id: base.id,
          severity: insight.severity === "critical" ? "danger" : "warning",
          actionLabel: "Mở audit",
          actionHref: "/admin/taxonomy?tab=audit"
        });
      } else if (insight.kind === "seo_opportunity") {
        recommendedActions.push({
          ...base,
          id: base.id,
          severity: "info",
          actionLabel: "Chỉnh SEO",
          actionHref: "/admin/seo?tab=metadata"
        });
      } else if (insight.kind === "monetization_opportunity") {
        recommendedActions.push({
          ...base,
          id: base.id,
          severity: "info",
          actionLabel: "Kiểm tra monetization",
          actionHref: "/admin/monetization-settings"
        });
      } else if (insight.kind === "creator_opportunity") {
        recommendedActions.push({
          ...base,
          id: base.id,
          severity: "info",
          actionLabel: "Thu hút creator",
          actionHref: "/admin/users"
        });
      }
    }

    // Fairness-driven warning (purely advisory).
    if (fairness.topTaxonomyConcentration[0]?.share && fairness.topTaxonomyConcentration[0].share >= 30) {
      recommendedActions.push({
        id: "fairness:top-taxonomy-concentration",
        title: "Có dấu hiệu lệch phân phối",
        description:
          "Một vài taxonomy đang chiếm tỷ trọng impression quá cao. Cần kiểm tra cân bằng cung/cầu và tránh overexpose nhóm nội dung quá tập trung.",
        severity: "warning",
        actionLabel: "Xem fairness",
        actionHref: "/admin/taxonomy-analytics"
      });
    }

    const currentCtr = pct(clicks, impressions);
    const completionRate = pct(chapterCompletes, storyStarts);

    const completionRatePrev =
      prevStoryStarts > 0 ? pct(prevChapterCompletes, prevStoryStarts) : null;

    const saveRate = pctNullable(saves, storyStarts);
    const saveRatePrev = pctNullable(prevSaves, prevStoryStarts);

    const paidConversionRate = pctNullable(purchases, storyStarts);
    const paidConversionRatePrev = pctNullable(prevPurchases, prevStoryStarts);

    const revenuePerStart =
      storyStarts > 0 ? Number(revenueCoin) / storyStarts : null;
    const revenuePerStartPrev =
      prevStoryStarts > 0 ? Number(prevRevenueCoin) / prevStoryStarts : null;

    const revenuePer1000Impressions =
      impressions > 0 ? Number(revenueCoin) / (impressions / 1000) : null;
    const revenuePer1000ImpressionsPrev =
      prevImpressions > 0 ? Number(prevRevenueCoin) / (prevImpressions / 1000) : null;

    return {
      filters,
      summary: {
        impressions,
        impressionsPrev: prevImpressions,
        impressionsDeltaPct: deltaPctNullable(impressions, prevImpressions),
        clicks,
        clicksPrev: prevClicks,
        clicksDeltaPct: deltaPctNullable(clicks, prevClicks),
        ctr: currentCtr,
        ctrPrev: prevImpressions > 0 ? pct(prevClicks, prevImpressions) : null,
        ctrDeltaPct:
          prevImpressions > 0 ? deltaPctNullable(currentCtr, pct(prevClicks, prevImpressions)) : null,
        storyStarts,
        storyStartsPrev: prevStoryStarts,
        storyStartsDeltaPct: deltaPctNullable(storyStarts, prevStoryStarts),
        chapterCompletes,
        chapterCompletesPrev: prevChapterCompletes,
        completionRate,
        completionRatePrev,
        completionRateDeltaPct:
          completionRatePrev !== null ? deltaPctNullable(completionRate, completionRatePrev) : null,
        saves,
        savesPrev: prevSaves,
        saveRate,
        saveRatePrev,
        saveRateDeltaPct:
          saveRate !== null && saveRatePrev !== null
            ? deltaPctNullable(saveRate, saveRatePrev)
            : null,
        purchases,
        purchasesPrev: prevPurchases,
        paidConversionRate,
        paidConversionRatePrev,
        paidConversionRateDeltaPct:
          paidConversionRate !== null && paidConversionRatePrev !== null
            ? deltaPctNullable(paidConversionRate, paidConversionRatePrev)
            : null,
        revenueCoin,
        revenueCoinPrev: prevRevenueCoin,
        revenueCoinDeltaPct: deltaPctNullable(revenueCoin, prevRevenueCoin),
        revenuePerStart,
        revenuePerStartPrev,
        revenuePerStartDeltaPct:
          revenuePerStart !== null && revenuePerStartPrev !== null
            ? deltaPctNullable(revenuePerStart, revenuePerStartPrev)
            : null,
        revenuePer1000Impressions,
        revenuePer1000ImpressionsPrev,
        revenuePer1000ImpressionsDeltaPct:
          revenuePer1000Impressions !== null && revenuePer1000ImpressionsPrev !== null
            ? deltaPctNullable(revenuePer1000Impressions, revenuePer1000ImpressionsPrev)
            : null,
        reportsWrongTag,
        reportsWrongTagPrev: prevReportsWrongTag,
        reportsWrongTagDeltaPct: deltaPctNullable(reportsWrongTag, prevReportsWrongTag),
        reportsMissingWarning,
        reportsMissingWarningPrev: prevReportsMissingWarning,
        reportsMissingWarningDeltaPct: deltaPctNullable(reportsMissingWarning, prevReportsMissingWarning),
        fastestGrowingTerm
      },
      topByReads,
      topByCompletion,
      topByRevenue,
      highSupplyLowDemand,
      lowSupplyHighRetention,
      topReported,
      seoPages,
      surfaceContribution,
      creatorContribution,
      insights,
      termOptions,
      creatorOptions,
      monetizationOptions,
      typeOptions,
      fairness,
      recommendedActions,
      error: null
    };
  } catch (error) {
    return {
      ...empty,
      error: error instanceof Error ? error.message : "Không tải được dữ liệu phân tích taxonomy."
    };
  }
}
