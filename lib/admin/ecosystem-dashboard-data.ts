import { buildScoringConfig } from "@/lib/scoring/config";
import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import {
  calculateExposureShareFiltered,
  topEntitiesFromMap,
  windowStartIso
} from "@/lib/fairness/exposure-share";
import { loadFairnessAlertThresholds } from "@/lib/fairness/thresholds";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { getProfileUrlOrFallback } from "@/lib/profile/profile-url";
import { createAdminClient } from "@/lib/data/admin";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type {
  EcosystemDashboardData,
  EcosystemGenreRow,
  EcosystemNewAuthorRow,
  EcosystemOverview,
  EcosystemSurfaceFilter,
  EcosystemTimeWindow,
  EcosystemTopAuthorRow,
  EcosystemTopStoryRow,
  EcosystemUnderExposedRow,
  EcosystemWarning
} from "@/types/ecosystem-dashboard";
import {
  ECOSYSTEM_SURFACE_LABELS,
  ECOSYSTEM_WINDOW_LABELS,
  mapEcosystemWindowToFairness
} from "@/types/ecosystem-dashboard";

type CreatorProfileJoin =
  | {
      pen_name: string;
      profiles: { display_name: string | null; username: string | null } | null;
    }
  | Array<{
      pen_name: string;
      profiles: { display_name: string | null; username: string | null } | null;
    }>
  | null;

function asCreatorJoin(value: unknown): CreatorProfileJoin {
  return value as CreatorProfileJoin;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function buildWarnings(input: {
  surfaceLabel: string;
  windowLabel: string;
  overview: EcosystemOverview;
  thresholds: EcosystemDashboardData["thresholds"];
}): EcosystemWarning[] {
  const warnings: EcosystemWarning[] = [];
  const { overview, thresholds, surfaceLabel, windowLabel } = input;

  if (overview.top1AuthorSharePercent > thresholds.top1AuthorPercent) {
    warnings.push({
      id: "top1-author",
      level:
        overview.top1AuthorSharePercent > thresholds.top1AuthorPercent * 1.2
          ? "critical"
          : "warn",
      message: `Top 1% tác giả đang chiếm ${overview.top1AuthorSharePercent.toFixed(1)}% impression ${surfaceLabel} trong ${windowLabel}, vượt ngưỡng ${thresholds.top1AuthorPercent}%.`
    });
  }

  if (overview.top10StorySharePercent > thresholds.top10StoryPercent) {
    warnings.push({
      id: "top10-story",
      level:
        overview.top10StorySharePercent > thresholds.top10StoryPercent * 1.15
          ? "critical"
          : "warn",
      message: `Top 10% truyện đang chiếm ${overview.top10StorySharePercent.toFixed(1)}% impression ${surfaceLabel} trong ${windowLabel}, vượt ngưỡng ${thresholds.top10StoryPercent}%.`
    });
  }

  if (
    overview.totalImpressions > 50 &&
    overview.newAuthorExposureShare < thresholds.minNewAuthorPercent
  ) {
    warnings.push({
      id: "new-author-low",
      level: "warn",
      message: `Tác giả mới chỉ nhận ${overview.newAuthorExposureShare.toFixed(1)}% impression, thấp hơn ngưỡng ${thresholds.minNewAuthorPercent}%.`
    });
  }

  if (
    overview.totalImpressions > 50 &&
    overview.longTailExposureShare < thresholds.minLongTailPercent
  ) {
    warnings.push({
      id: "long-tail-low",
      level: "warn",
      message: `Long-tail quality chỉ nhận ${overview.longTailExposureShare.toFixed(1)}% impression, thấp hơn ngưỡng ${thresholds.minLongTailPercent}%.`
    });
  }

  if (overview.untestedNewStoriesCount > thresholds.untestedStoriesThreshold) {
    warnings.push({
      id: "untested-stories",
      level: "warn",
      message: `Có ${overview.untestedNewStoriesCount} truyện mới chưa đạt quota test impression.`
    });
  }

  if (overview.underExposedQualityCount > 15) {
    warnings.push({
      id: "under-exposed-quality",
      level: "warn",
      message: `Có ${overview.underExposedQualityCount} truyện chất lượng cao nhưng impression thấp — cần boost/test.`
    });
  }

  return warnings;
}

async function countUntestedNewStories(db: ReturnType<typeof createAdminClient>) {
  const { data: activeTests } = await db
    .from("cold_start_tests")
    .select("item_id, item_type, target_impressions, delivered_impressions, status")
    .eq("item_type", "story")
    .in("status", ["active", "paused"])
    .limit(500);

  let count = 0;
  for (const test of activeTests ?? []) {
    const delivered = Number(test.delivered_impressions ?? 0);
    const target = Number(test.target_impressions ?? 0);
    if (target > 0 && delivered < target * 0.25) count += 1;
  }
  return count;
}

async function loadUnderExposedQuality(
  db: ReturnType<typeof createAdminClient>,
  storyImpressions: Map<string, number>,
  limit = 15
): Promise<{ rows: EcosystemUnderExposedRow[]; count: number }> {
  const since = windowStartIso("7d");

  const { data: stories } = await db
    .from("stories")
    .select(
      "id, title, slug, status, creator_profiles(pen_name, profiles(display_name, username))"
    )
    .in("status", ["published", "approved"])
    .eq("visibility", "public")
    .gte("published_at", since)
    .limit(120);

  if (!stories?.length) return { rows: [], count: 0 };

  const storyIds = stories.map((s) => s.id as string);
  const impressionValues = storyIds.map((id) => storyImpressions.get(id) ?? 0);
  const medianImp = median(impressionValues);

  const { data: scores } = await db
    .from("content_score_snapshots")
    .select("item_id, quality_score, snapshot_at")
    .eq("item_type", "story")
    .in("item_id", storyIds)
    .order("snapshot_at", { ascending: false })
    .limit(300);

  const qualityByStory = new Map<string, number>();
  for (const row of scores ?? []) {
    if (!qualityByStory.has(row.item_id as string)) {
      qualityByStory.set(row.item_id as string, Number(row.quality_score ?? 0));
    }
  }

  const { data: metrics } = await db
    .from("story_metrics_daily")
    .select("story_id, completion_rate")
    .in("story_id", storyIds)
    .gte("metric_date", since.slice(0, 10))
    .limit(500);

  const completionByStory = new Map<string, number[]>();
  for (const row of metrics ?? []) {
    const id = row.story_id as string;
    completionByStory.set(id, [
      ...(completionByStory.get(id) ?? []),
      Number(row.completion_rate ?? 0)
    ]);
  }

  const candidates: EcosystemUnderExposedRow[] = [];

  for (const story of stories) {
    const id = story.id as string;
    const impressions = storyImpressions.get(id) ?? 0;
    const quality = qualityByStory.get(id) ?? 0.35;
    const completions = completionByStory.get(id) ?? [];
    const completionRate =
      completions.length > 0
        ? completions.reduce((s, v) => s + v, 0) / completions.length
        : 0;

    if (impressions > medianImp * 0.65) continue;
    if (quality < 0.42 && completionRate < 0.4) continue;

    const creator = firstRelation(asCreatorJoin(story.creator_profiles));
    const profile = firstRelation(creator?.profiles ?? null);

    candidates.push({
      storyId: id,
      title: story.title as string,
      slug: story.slug as string,
      authorDisplayName: creator
        ? resolvePublicDisplayName(profile, creator)
        : "Tác giả",
      authorUsername: profile?.username ?? null,
      impressions,
      completionRate,
      qualityScore: quality,
      recommendedAction:
        impressions === 0 ? "Tạo cold start test" : "Boost under-exposed pool"
    });
  }

  candidates.sort((a, b) => b.qualityScore - a.qualityScore || a.impressions - b.impressions);

  return { rows: candidates.slice(0, limit), count: candidates.length };
}

async function loadGenreDistribution(
  db: ReturnType<typeof createAdminClient>,
  since: string,
  surface: EcosystemSurfaceFilter
): Promise<EcosystemGenreRow[]> {
  let query = db
    .from("exposure_events")
    .select("story_id")
    .gte("created_at", since)
    .not("story_id", "is", null)
    .limit(25000);

  if (surface !== "all") {
    query = query.eq("surface", surface);
  }

  const { data: exposures } = await query;
  const storyCounts = new Map<string, number>();
  for (const row of exposures ?? []) {
    const id = row.story_id as string;
    storyCounts.set(id, (storyCounts.get(id) ?? 0) + 1);
  }

  const storyIds = [...storyCounts.keys()].slice(0, 400);
  if (storyIds.length === 0) return [];

  const { loadStoryMainGenreTermIndex } = await import("@/lib/ranking/story-main-genre-index");
  const mainGenreIndex = await loadStoryMainGenreTermIndex(db, storyIds);
  const termIds = [...new Set([...mainGenreIndex.values()])];

  const termMeta = new Map<string, { name: string; slug: string }>();
  if (termIds.length > 0) {
    const { data: terms } = await db
      .from("taxonomy_terms")
      .select("id, name, slug")
      .in("id", termIds);
    for (const term of terms ?? []) {
      termMeta.set(String(term.id), {
        name: String(term.name),
        slug: String(term.slug)
      });
    }
  }

  const { data: stories } = await db
    .from("stories")
    .select("id")
    .in("id", storyIds);

  const storyGenreKey = new Map<
    string,
    { genreId: string; name: string; slug: string }
  >();

  for (const story of stories ?? []) {
    const taxonomyTermId = mainGenreIndex.get(story.id as string);
    if (!taxonomyTermId) {
      continue;
    }

    const meta = termMeta.get(taxonomyTermId);
    if (meta) {
      storyGenreKey.set(story.id as string, {
        genreId: taxonomyTermId,
        name: meta.name,
        slug: meta.slug
      });
    }
  }

  const genreImpressions = new Map<string, { name: string; slug: string; impressions: number }>();

  for (const [storyId, imp] of storyCounts) {
    const genre = storyGenreKey.get(storyId);
    if (!genre) continue;
    const prev = genreImpressions.get(genre.genreId) ?? {
      name: genre.name,
      slug: genre.slug,
      impressions: 0
    };
    genreImpressions.set(genre.genreId, {
      ...prev,
      impressions: prev.impressions + imp
    });
  }

  const totalImp = [...genreImpressions.values()].reduce((s, g) => s + g.impressions, 0);
  const genreIds = [...genreImpressions.keys()];

  const { data: metrics } = await db
    .from("story_metrics_daily")
    .select("story_id, chapter_starts, chapter_completes")
    .in(
      "story_id",
      (stories ?? []).filter((s) => genreIds.length).map((s) => s.id as string)
    )
    .gte("metric_date", since.slice(0, 10))
    .limit(3000);

  const readsByGenre = new Map<string, number>();
  const completesByGenre = new Map<string, number>();

  for (const row of metrics ?? []) {
    const genre = storyGenreKey.get(row.story_id as string);
    if (!genre) continue;
    readsByGenre.set(
      genre.genreId,
      (readsByGenre.get(genre.genreId) ?? 0) + Number(row.chapter_starts ?? 0)
    );
    completesByGenre.set(
      genre.genreId,
      (completesByGenre.get(genre.genreId) ?? 0) + Number(row.chapter_completes ?? 0)
    );
  }

  const totalReads = [...readsByGenre.values()].reduce((s, v) => s + v, 0);

  const rows: EcosystemGenreRow[] = [...genreImpressions.entries()].map(([genreId, g]) => {
    const reads = readsByGenre.get(genreId) ?? 0;
    const completes = completesByGenre.get(genreId) ?? 0;
    const impressionShare = totalImp > 0 ? (g.impressions / totalImp) * 100 : 0;
    const readShare = totalReads > 0 ? (reads / totalReads) * 100 : 0;
    const completionRate = reads > 0 ? completes / reads : 0;
    const skew = Math.abs(impressionShare - readShare) > 12 && impressionShare > 18;

    return {
      genreId,
      genreName: g.name,
      genreSlug: g.slug,
      impressionSharePercent: impressionShare,
      readSharePercent: readShare,
      completionRate,
      skewWarning: skew
    };
  });

  return rows.sort((a, b) => b.impressionSharePercent - a.impressionSharePercent).slice(0, 12);
}

async function loadNewAuthorsTable(
  db: ReturnType<typeof createAdminClient>,
  authorImpressions: Map<string, number>,
  since: string
): Promise<EcosystemNewAuthorRow[]> {
  const { data: recentStories } = await db
    .from("stories")
    .select("id, creator_profiles(user_id, pen_name, profiles(display_name, username))")
    .in("status", ["published", "approved"])
    .eq("visibility", "public")
    .gte("published_at", since)
    .limit(200);

  const authorStoryCount = new Map<string, number>();
  const authorMeta = new Map<
    string,
    { penName: string; displayName: string; username: string | null }
  >();

  for (const story of recentStories ?? []) {
    const creator = firstRelation(
      asCreatorJoin(story.creator_profiles) as
        | { user_id: string; pen_name: string; profiles: { display_name: string | null; username: string | null } | null }
        | Array<{ user_id: string; pen_name: string; profiles: { display_name: string | null; username: string | null } | null }>
        | null
    );
    if (!creator?.user_id) continue;
    authorStoryCount.set(creator.user_id, (authorStoryCount.get(creator.user_id) ?? 0) + 1);
    if (!authorMeta.has(creator.user_id)) {
      const profile = firstRelation(creator.profiles);
      authorMeta.set(creator.user_id, {
        penName: creator.pen_name,
        displayName: resolvePublicDisplayName(profile, creator),
        username: profile?.username ?? null
      });
    }
  }

  const authorIds = [...authorMeta.keys()].slice(0, 25);
  if (authorIds.length === 0) return [];

  const { data: coldTests } = await db
    .from("cold_start_tests")
    .select("author_user_id, status")
    .eq("item_type", "author")
    .in("author_user_id", authorIds)
    .order("created_at", { ascending: false })
    .limit(50);

  const coldStatus = new Map<string, string>();
  for (const row of coldTests ?? []) {
    if (!coldStatus.has(row.author_user_id as string)) {
      coldStatus.set(row.author_user_id as string, row.status as string);
    }
  }

  return authorIds
    .map((userId) => {
      const meta = authorMeta.get(userId)!;
      return {
        userId,
        username: meta.username,
        displayName: meta.displayName,
        profileUrl: getProfileUrlOrFallback(meta.username),
        publishedStories: authorStoryCount.get(userId) ?? 0,
        impressionsReceived: authorImpressions.get(userId) ?? 0,
        coldStartStatus: coldStatus.get(userId) ?? null
      };
    })
    .sort((a, b) => a.impressionsReceived - b.impressionsReceived)
    .slice(0, 15);
}

export async function loadEcosystemDashboardData(options: {
  surface?: EcosystemSurfaceFilter;
  timeWindow?: EcosystemTimeWindow;
}): Promise<EcosystemDashboardData> {
  const surface = options.surface ?? "all";
  const timeWindow = options.timeWindow ?? "7d";
  const fairnessWindow = mapEcosystemWindowToFairness(timeWindow);
  const surfaceLabel = ECOSYSTEM_SURFACE_LABELS[surface];
  const windowLabel = ECOSYSTEM_WINDOW_LABELS[timeWindow];
  const since = windowStartIso(fairnessWindow);

  const emptyOverview: EcosystemOverview = {
    totalImpressions: 0,
    authorsWithImpressions: 0,
    storiesWithImpressions: 0,
    top1AuthorSharePercent: 0,
    top10StorySharePercent: 0,
    newAuthorExposureShare: 0,
    longTailExposureShare: 0,
    underExposedQualityCount: 0,
    untestedNewStoriesCount: 0
  };

  try {
    const db = createAdminClient();
    const [alertThresholds, rawConfig] = await Promise.all([
      loadFairnessAlertThresholds(),
      getAlgorithmConfig()
    ]);
    const scoring = buildScoringConfig(rawConfig);

    const thresholds = {
      top1AuthorPercent: alertThresholds.top1AuthorPercent,
      top10StoryPercent: alertThresholds.top10StoryPercent,
      minNewAuthorPercent: Math.max(alertThresholds.minNewAuthorPercent, 10),
      minLongTailPercent: Math.max(alertThresholds.minLongTailPercent, 10),
      authorExposureCapPercent: scoring.fairness.authorExposureCap7dPercent,
      storyExposureCapPercent: scoring.fairness.storyExposureCap7dPercent,
      untestedStoriesThreshold: 10
    };

    const share = await calculateExposureShareFiltered(db, {
      surface: surface === "all" ? null : surface,
      window: fairnessWindow
    });

    const [underExposedResult, untestedNewStoriesCount, genreRows, adjustmentsRes] =
      await Promise.all([
        loadUnderExposedQuality(db, share.storyImpressions),
        countUntestedNewStories(db),
        loadGenreDistribution(db, since, surface),
        db
          .from("fairness_adjustment_logs")
          .select(
            "id, adjustment_type, surface, item_type, reason, old_score, new_score, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(15)
      ]);

    const overview: EcosystemOverview = {
      totalImpressions: share.totalImpressions,
      authorsWithImpressions: share.authorImpressions.size,
      storiesWithImpressions: share.storyImpressions.size,
      top1AuthorSharePercent: share.top1PercentAuthorShare,
      top10StorySharePercent: share.top10PercentStoryShare,
      newAuthorExposureShare: share.newAuthorImpressionShare,
      longTailExposureShare: share.longTailImpressionShare,
      underExposedQualityCount: underExposedResult.count,
      untestedNewStoriesCount
    };

    const warnings = buildWarnings({ surfaceLabel, windowLabel, overview, thresholds });

    const authorTops = topEntitiesFromMap(
      share.authorImpressions,
      share.totalImpressions,
      15
    );
    const storyTops = topEntitiesFromMap(
      share.storyImpressions,
      share.totalImpressions,
      15
    );

    const authorIds = authorTops.map((r) => r.id);
    const storyIds = storyTops.map((r) => r.id);

    const [{ data: profiles }, { data: stories }, { data: authorMetrics }] =
      await Promise.all([
        authorIds.length
          ? db
              .from("profiles")
              .select("id, username, display_name")
              .in("id", authorIds)
          : Promise.resolve({ data: [] }),
        storyIds.length
          ? db
              .from("stories")
              .select(
                "id, title, slug, status, creator_profiles(pen_name, profiles(display_name, username))"
              )
              .in("id", storyIds)
          : Promise.resolve({ data: [] }),
        authorIds.length
          ? db
              .from("author_metrics_daily")
              .select("author_user_id, revenue_coin")
              .in("author_user_id", authorIds)
              .gte("metric_date", since.slice(0, 10))
              .limit(500)
          : Promise.resolve({ data: [] })
      ]);

    const { data: storyMetrics } = storyIds.length
      ? await db
          .from("story_metrics_daily")
          .select("story_id, completion_rate, report_rate")
          .in("story_id", storyIds)
          .gte("metric_date", since.slice(0, 10))
          .limit(500)
      : { data: [] };

    const { data: creators } = authorIds.length
      ? await db
          .from("creator_profiles")
          .select("id, user_id")
          .in("user_id", authorIds)
      : { data: [] };

    const creatorIdToUser = new Map(
      (creators ?? []).map((c) => [c.id as string, c.user_id as string])
    );

    const { data: creatorStories } = creatorIdToUser.size
      ? await db
          .from("stories")
          .select("creator_id")
          .in("creator_id", [...creatorIdToUser.keys()])
          .in("status", ["published", "approved"])
      : { data: [] };

    const storyCountByAuthor = new Map<string, number>();
    for (const row of creatorStories ?? []) {
      const userId = creatorIdToUser.get(row.creator_id as string);
      if (!userId) continue;
      storyCountByAuthor.set(userId, (storyCountByAuthor.get(userId) ?? 0) + 1);
    }

    const revenueByAuthor = new Map<string, number>();
    for (const row of authorMetrics ?? []) {
      const id = row.author_user_id as string;
      revenueByAuthor.set(id, (revenueByAuthor.get(id) ?? 0) + Number(row.revenue_coin ?? 0));
    }

    const metricsByStory = new Map<string, { completion: number[]; report: number[] }>();
    for (const row of storyMetrics ?? []) {
      const id = row.story_id as string;
      const bucket = metricsByStory.get(id) ?? { completion: [], report: [] };
      bucket.completion.push(Number(row.completion_rate ?? 0));
      bucket.report.push(Number(row.report_rate ?? 0));
      metricsByStory.set(id, bucket);
    }

    const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));
    const storyById = new Map((stories ?? []).map((s) => [s.id as string, s]));

    const topAuthors: EcosystemTopAuthorRow[] = authorTops.map((row) => {
      const profile = profileById.get(row.id);
      const username = (profile?.username as string | null) ?? null;
      const sharePercent = row.sharePercent;
      return {
        userId: row.id,
        username,
        displayName: (profile?.display_name as string) ?? username ?? row.id.slice(0, 8),
        profileUrl: getProfileUrlOrFallback(username),
        impressions: row.impressions,
        sharePercent,
        storyCount: storyCountByAuthor.get(row.id) ?? 0,
        qualityAvg: 0.45,
        revenueCoin: revenueByAuthor.get(row.id) ?? 0,
        overCap: sharePercent > thresholds.authorExposureCapPercent
      };
    });

    const topStories: EcosystemTopStoryRow[] = storyTops.map((row) => {
      const story = storyById.get(row.id);
      const creator = firstRelation(asCreatorJoin(story?.creator_profiles));
      const profile = firstRelation(creator?.profiles ?? null);
      const m = metricsByStory.get(row.id);
      const completionRate = m?.completion.length
        ? m.completion.reduce((s, v) => s + v, 0) / m.completion.length
        : 0;
      const reportRate = m?.report.length
        ? m.report.reduce((s, v) => s + v, 0) / m.report.length
        : 0;

      return {
        storyId: row.id,
        title: (story?.title as string) ?? row.id.slice(0, 8),
        slug: (story?.slug as string) ?? "",
        authorDisplayName: creator
          ? resolvePublicDisplayName(profile, creator)
          : "—",
        authorUsername: profile?.username ?? null,
        impressions: row.impressions,
        sharePercent: row.sharePercent,
        completionRate,
        reportRate,
        status: (story?.status as string) ?? "unknown",
        overCap: row.sharePercent > thresholds.storyExposureCapPercent
      };
    });

    const newAuthors = await loadNewAuthorsTable(
      db,
      share.authorImpressions,
      since
    );

    return {
      error: null,
      surface,
      timeWindow,
      surfaceLabel,
      windowLabel,
      overview,
      warnings,
      topAuthors,
      topStories,
      underExposed: underExposedResult.rows,
      newAuthors,
      genres: genreRows,
      recentAdjustments: (adjustmentsRes.data ?? []).map((row) => ({
        id: row.id as string,
        adjustmentType: row.adjustment_type as string,
        surface: row.surface as string,
        itemType: row.item_type as string,
        reason: row.reason as string | null,
        oldScore: Number(row.old_score),
        newScore: Number(row.new_score),
        createdAt: row.created_at as string
      })),
      thresholds
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        error: "Thiếu bảng tracking/fairness — chạy migrations 147–153.",
        surface,
        timeWindow,
        surfaceLabel,
        windowLabel,
        overview: emptyOverview,
        warnings: [],
        topAuthors: [],
        topStories: [],
        underExposed: [],
        newAuthors: [],
        genres: [],
        recentAdjustments: [],
        thresholds: {
          top1AuthorPercent: 50,
          top10StoryPercent: 70,
          minNewAuthorPercent: 10,
          minLongTailPercent: 10,
          authorExposureCapPercent: 10,
          storyExposureCapPercent: 8,
          untestedStoriesThreshold: 10
        }
      };
    }

    return {
      error: error instanceof Error ? error.message : "Không tải được ecosystem dashboard.",
      surface,
      timeWindow,
      surfaceLabel,
      windowLabel,
      overview: emptyOverview,
      warnings: [],
      topAuthors: [],
      topStories: [],
      underExposed: [],
      newAuthors: [],
      genres: [],
      recentAdjustments: [],
      thresholds: {
        top1AuthorPercent: 50,
        top10StoryPercent: 70,
        minNewAuthorPercent: 10,
        minLongTailPercent: 10,
        authorExposureCapPercent: 10,
        storyExposureCapPercent: 8,
        untestedStoriesThreshold: 10
      }
    };
  }
}
