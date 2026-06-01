import type { SupabaseClient } from "@supabase/supabase-js";
import { parseMetricsWindowDays, safeRate, windowStartDate } from "@/lib/scoring/math";
import type {
  ExposureStats,
  ReelMetricsAggregate,
  StoryMetricsAggregate
} from "@/types/scoring";

const DEFAULT_STORY_METRICS: StoryMetricsAggregate = {
  impressions: 0,
  storyOpens: 0,
  chapterStarts: 0,
  chapterCompletes: 0,
  nextChapterClicks: 0,
  saves: 0,
  follows: 0,
  hides: 0,
  reports: 0,
  paidUnlocks: 0,
  tips: 0,
  revenueCoin: 0,
  completionRate: 0,
  nextChapterRate: 0,
  saveRate: 0,
  reportRate: 0,
  hideRate: 0,
  clickThroughRate: 0,
  source: "default"
};

const DEFAULT_REEL_METRICS: ReelMetricsAggregate = {
  impressions: 0,
  opens: 0,
  readMoreClicks: 0,
  storyOpens: 0,
  chapterStarts: 0,
  chapterCompletesAfterReel: 0,
  saves: 0,
  follows: 0,
  hides: 0,
  reports: 0,
  reelsToReadRate: 0,
  completionAfterReelRate: 0,
  source: "default"
};

function startDateForWindow(window: string) {
  const days = parseMetricsWindowDays(window);
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function buildStoryAggregateFromRows(
  rows: {
    impressions: number;
    story_opens: number;
    chapter_starts: number;
    chapter_completes: number;
    next_chapter_clicks: number;
    saves: number;
    follows_generated: number;
    hides: number;
    reports: number;
    paid_unlocks: number;
    tips: number;
    revenue_coin: number;
    completion_rate: number;
    next_chapter_rate: number;
    save_rate: number;
    report_rate: number;
    hide_rate: number;
    click_through_rate: number;
  }[]
): StoryMetricsAggregate {
  if (rows.length === 0) return { ...DEFAULT_STORY_METRICS };

  const impressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const storyOpens = rows.reduce((s, r) => s + (r.story_opens ?? 0), 0);
  const chapterStarts = rows.reduce((s, r) => s + (r.chapter_starts ?? 0), 0);
  const chapterCompletes = rows.reduce((s, r) => s + (r.chapter_completes ?? 0), 0);
  const nextChapterClicks = rows.reduce((s, r) => s + (r.next_chapter_clicks ?? 0), 0);
  const saves = rows.reduce((s, r) => s + (r.saves ?? 0), 0);
  const follows = rows.reduce((s, r) => s + (r.follows_generated ?? 0), 0);
  const hides = rows.reduce((s, r) => s + (r.hides ?? 0), 0);
  const reports = rows.reduce((s, r) => s + (r.reports ?? 0), 0);
  const paidUnlocks = rows.reduce((s, r) => s + (r.paid_unlocks ?? 0), 0);
  const tips = rows.reduce((s, r) => s + (r.tips ?? 0), 0);
  const revenueCoin = rows.reduce((s, r) => s + Number(r.revenue_coin ?? 0), 0);

  const completionRate =
    impressions > 0
      ? safeRate(chapterCompletes, chapterStarts, 0)
      : safeRate(
          rows.reduce((s, r) => s + Number(r.completion_rate ?? 0), 0),
          rows.length,
          0
        );

  const nextChapterRate =
    chapterCompletes > 0
      ? safeRate(nextChapterClicks, chapterCompletes, 0)
      : safeRate(
          rows.reduce((s, r) => s + Number(r.next_chapter_rate ?? 0), 0),
          rows.length,
          0
        );

  const saveRate =
    impressions > 0 ? safeRate(saves, impressions, 0) : safeRate(rows.reduce((s, r) => s + Number(r.save_rate ?? 0), 0), rows.length, 0);

  const reportRate =
    impressions > 0 ? safeRate(reports, impressions, 0) : safeRate(rows.reduce((s, r) => s + Number(r.report_rate ?? 0), 0), rows.length, 0);

  const hideRate =
    impressions > 0 ? safeRate(hides, impressions, 0) : safeRate(rows.reduce((s, r) => s + Number(r.hide_rate ?? 0), 0), rows.length, 0);

  const clickThroughRate =
    impressions > 0
      ? safeRate(storyOpens, impressions, 0)
      : safeRate(
          rows.reduce((s, r) => s + Number(r.click_through_rate ?? 0), 0),
          rows.length,
          0
        );

  return {
    impressions,
    storyOpens,
    chapterStarts,
    chapterCompletes,
    nextChapterClicks,
    saves,
    follows,
    hides,
    reports,
    paidUnlocks,
    tips,
    revenueCoin,
    completionRate,
    nextChapterRate,
    saveRate,
    reportRate,
    hideRate,
    clickThroughRate,
    source: "daily"
  };
}

export async function loadStoryMetricsAggregate(
  supabase: SupabaseClient,
  storyId: string,
  window: string
): Promise<StoryMetricsAggregate> {
  const since = startDateForWindow(window);
  const { data, error } = await supabase
    .from("story_metrics_daily")
    .select(
      "impressions, story_opens, chapter_starts, chapter_completes, next_chapter_clicks, saves, follows_generated, hides, reports, paid_unlocks, tips, revenue_coin, completion_rate, next_chapter_rate, save_rate, report_rate, hide_rate, click_through_rate"
    )
    .eq("story_id", storyId)
    .gte("metric_date", since);

  if (!error && data && data.length > 0) {
    return buildStoryAggregateFromRows(data);
  }

  return loadStoryMetricsFromEvents(supabase, storyId, window);
}

async function loadStoryMetricsFromEvents(
  supabase: SupabaseClient,
  storyId: string,
  window: string
): Promise<StoryMetricsAggregate> {
  const since = windowStartDate(window);

  const [exposureRes, actionsRes] = await Promise.all([
    supabase
      .from("exposure_events")
      .select("id", { count: "exact", head: true })
      .eq("story_id", storyId)
      .gte("created_at", since),
    supabase
      .from("user_action_events")
      .select("action_type")
      .eq("story_id", storyId)
      .gte("created_at", since)
  ]);

  const impressions = exposureRes.count ?? 0;
  if (impressions === 0 && (!actionsRes.data || actionsRes.data.length === 0)) {
    return { ...DEFAULT_STORY_METRICS };
  }

  const counts = new Map<string, number>();
  for (const row of actionsRes.data ?? []) {
    counts.set(row.action_type, (counts.get(row.action_type) ?? 0) + 1);
  }

  const storyOpens = counts.get("open_story") ?? 0;
  const chapterStarts = counts.get("read_start") ?? 0;
  const chapterCompletes = counts.get("read_complete") ?? 0;
  const nextChapterClicks = counts.get("next_chapter_click") ?? 0;
  const saves = (counts.get("save") ?? 0) - (counts.get("unsave") ?? 0);
  const follows = (counts.get("follow_author") ?? 0) - (counts.get("unfollow_author") ?? 0);
  const hides = counts.get("hide") ?? 0;
  const reports = counts.get("report") ?? 0;

  return {
    impressions,
    storyOpens,
    chapterStarts,
    chapterCompletes,
    nextChapterClicks,
    saves: Math.max(0, saves),
    follows: Math.max(0, follows),
    hides,
    reports,
    paidUnlocks: counts.get("unlock_paid") ?? 0,
    tips: counts.get("tip") ?? 0,
    revenueCoin: 0,
    completionRate: safeRate(chapterCompletes, chapterStarts, 0),
    nextChapterRate: safeRate(nextChapterClicks, chapterCompletes, 0),
    saveRate: safeRate(Math.max(0, saves), impressions, 0),
    reportRate: safeRate(reports, impressions, 0),
    hideRate: safeRate(hides, impressions, 0),
    clickThroughRate: safeRate(storyOpens, impressions, 0),
    source: "events"
  };
}

export async function loadReelMetricsAggregate(
  supabase: SupabaseClient,
  reelId: string,
  window: string
): Promise<ReelMetricsAggregate> {
  const since = startDateForWindow(window);
  const { data, error } = await supabase
    .from("reel_metrics_daily")
    .select(
      "impressions, opens, read_more_clicks, story_opens, chapter_starts, chapter_completes_after_reel, saves, follows_generated, hides, reports, reels_to_read_rate, completion_after_reel_rate"
    )
    .eq("reel_id", reelId)
    .gte("metric_date", since);

  if (!error && data && data.length > 0) {
    const impressions = data.reduce((s, r) => s + (r.impressions ?? 0), 0);
    const opens = data.reduce((s, r) => s + (r.opens ?? 0), 0);
    const readMoreClicks = data.reduce((s, r) => s + (r.read_more_clicks ?? 0), 0);
    const storyOpens = data.reduce((s, r) => s + (r.story_opens ?? 0), 0);
    const chapterStarts = data.reduce((s, r) => s + (r.chapter_starts ?? 0), 0);
    const chapterCompletesAfterReel = data.reduce(
      (s, r) => s + (r.chapter_completes_after_reel ?? 0),
      0
    );
    const saves = data.reduce((s, r) => s + (r.saves ?? 0), 0);
    const follows = data.reduce((s, r) => s + (r.follows_generated ?? 0), 0);
    const hides = data.reduce((s, r) => s + (r.hides ?? 0), 0);
    const reports = data.reduce((s, r) => s + (r.reports ?? 0), 0);

    const reelsToReadRate =
      impressions > 0
        ? safeRate(storyOpens + readMoreClicks, impressions, 0)
        : safeRate(
            data.reduce((s, r) => s + Number(r.reels_to_read_rate ?? 0), 0),
            data.length,
            0
          );

    const completionAfterReelRate =
      chapterStarts > 0
        ? safeRate(chapterCompletesAfterReel, chapterStarts, 0)
        : safeRate(
            data.reduce((s, r) => s + Number(r.completion_after_reel_rate ?? 0), 0),
            data.length,
            0
          );

    return {
      impressions,
      opens,
      readMoreClicks,
      storyOpens,
      chapterStarts,
      chapterCompletesAfterReel,
      saves,
      follows,
      hides,
      reports,
      reelsToReadRate,
      completionAfterReelRate,
      source: "daily"
    };
  }

  return loadReelMetricsFromEvents(supabase, reelId, window);
}

async function loadReelMetricsFromEvents(
  supabase: SupabaseClient,
  reelId: string,
  window: string
): Promise<ReelMetricsAggregate> {
  const since = windowStartDate(window);

  const [exposureRes, actionsRes] = await Promise.all([
    supabase
      .from("exposure_events")
      .select("id", { count: "exact", head: true })
      .eq("reel_id", reelId)
      .gte("created_at", since),
    supabase
      .from("user_action_events")
      .select("action_type, value_text")
      .eq("reel_id", reelId)
      .gte("created_at", since)
  ]);

  const impressions = exposureRes.count ?? 0;
  if (impressions === 0 && (!actionsRes.data || actionsRes.data.length === 0)) {
    return { ...DEFAULT_REEL_METRICS };
  }

  let readMore = 0;
  let storyOpens = 0;
  let chapterStarts = 0;
  let chapterCompletes = 0;
  let saves = 0;
  let follows = 0;
  let hides = 0;
  let reports = 0;

  for (const row of actionsRes.data ?? []) {
    switch (row.action_type) {
      case "click":
        if (row.value_text === "read_more") readMore += 1;
        break;
      case "open_story":
        storyOpens += 1;
        break;
      case "read_start":
        chapterStarts += 1;
        break;
      case "read_complete":
        chapterCompletes += 1;
        break;
      case "save":
        saves += 1;
        break;
      case "follow_author":
        follows += 1;
        break;
      case "hide":
        hides += 1;
        break;
      case "report":
        reports += 1;
        break;
      default:
        break;
    }
  }

  const saveOrFollowRate = safeRate(saves + follows, impressions, 0);

  return {
    impressions,
    opens: impressions,
    readMoreClicks: readMore,
    storyOpens,
    chapterStarts,
    chapterCompletesAfterReel: chapterCompletes,
    saves,
    follows,
    hides,
    reports,
    reelsToReadRate: safeRate(storyOpens + readMore, impressions, 0),
    completionAfterReelRate: safeRate(chapterCompletes, chapterStarts, 0),
    source: "events"
  };
}

export async function loadExposureStats(
  supabase: SupabaseClient,
  input: {
    authorUserId: string;
    storyId: string | null;
    itemId: string;
    itemType: string;
    windowDays?: number;
  }
): Promise<ExposureStats> {
  const windowDays = input.windowDays ?? 7;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - windowDays);
  const sinceIso = since.toISOString();

  const { data: allExposures } = await supabase
    .from("exposure_events")
    .select("author_user_id, story_id, item_id")
    .gte("created_at", sinceIso)
    .limit(10000);

  const rows = allExposures ?? [];
  const totalImpressions = rows.length;

  if (totalImpressions === 0) {
    return {
      windowDays,
      totalImpressions: 0,
      authorImpressions: 0,
      storyImpressions: 0,
      itemImpressions: 0,
      authorSharePercent: 0,
      storySharePercent: 0,
      itemSharePercent: 0
    };
  }

  const authorImpressions = rows.filter(
    (r) => r.author_user_id === input.authorUserId
  ).length;
  const storyImpressions = input.storyId
    ? rows.filter((r) => r.story_id === input.storyId).length
    : 0;
  const itemImpressions = rows.filter(
    (r) => r.item_id === input.itemId
  ).length;

  return {
    windowDays,
    totalImpressions,
    authorImpressions,
    storyImpressions,
    itemImpressions,
    authorSharePercent: (authorImpressions / totalImpressions) * 100,
    storySharePercent: (storyImpressions / totalImpressions) * 100,
    itemSharePercent: (itemImpressions / totalImpressions) * 100
  };
}
