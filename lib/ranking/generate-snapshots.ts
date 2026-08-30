import type { DatabaseClient } from "@/lib/db/types";
import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import { applyRankingAuthorDiversity } from "@/lib/ranking/diversity";
import {
  fetchEligibleAuthors,
  fetchEligibleChapters,
  fetchEligibleReels,
  fetchEligibleStories,
  type EligibleStory
} from "@/lib/ranking/eligible-content";
import {
  loadAggregatedReelMetrics,
  loadAggregatedStoryMetrics
} from "@/lib/ranking/load-metrics-batch";
import {
  computeRankingScore,
  freshnessFromPublishedAt,
  loadRankingWeights,
  reasonFromBoard
} from "@/lib/ranking/score-formula";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type {
  RankingBoardType,
  RankingItemType,
  RankingScoreBreakdown,
  RankingTimeWindow
} from "@/types/ranking-board";

const SNAPSHOT_LIMIT = 50;
const TIME_WINDOWS: RankingTimeWindow[] = ["day", "week", "month"];

type SnapshotInsert = {
  ranking_type: RankingBoardType;
  time_window: RankingTimeWindow;
  taxonomy_term_id: string | null;
  item_type: RankingItemType;
  item_id: string;
  story_id: string | null;
  author_user_id: string | null;
  rank_position: number;
  score: number;
  score_breakdown: RankingScoreBreakdown;
  snapshot_at: string;
};

function daysSince(iso: string | null) {
  if (!iso) return 999;
  return (Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000);
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function fairnessFromImpressions(impressions: number, medianImpressions: number) {
  if (medianImpressions <= 0) return 0.7;
  if (impressions <= medianImpressions * 0.35) return 0.88;
  if (impressions >= medianImpressions * 2.5) return 0.52;
  return 0.68;
}

async function scoreStoryCandidates(
  db: DatabaseClient,
  stories: EligibleStory[],
  window: RankingTimeWindow,
  boardType: RankingBoardType,
  filter?: (story: EligibleStory) => boolean,
  dayMetricsMap?: Awaited<ReturnType<typeof loadAggregatedStoryMetrics>>
) {
  const weights = await loadRankingWeights();
  const metricsMap = await loadAggregatedStoryMetrics(db, window);
  const impressions = stories.map((s) => metricsMap.get(s.id)?.impressions ?? 0);
  const medianImpressions = median(impressions);

  const scored: Array<{
    item_id: string;
    story_id: string;
    author_user_id: string;
    score: number;
    score_breakdown: RankingScoreBreakdown;
  }> = [];

  for (const story of stories) {
    if (filter && !filter(story)) continue;

    const metrics = metricsMap.get(story.id);
    const completionRate = metrics?.completionRate ?? 0;
    const nextChapterRate = metrics?.nextChapterRate ?? 0;
    const fairness = fairnessFromImpressions(metrics?.impressions ?? 0, medianImpressions);

    let freshness = freshnessFromPublishedAt(story.publishedAt);
    if (boardType === "new_stories" && daysSince(story.publishedAt) > 45) continue;
    if (boardType === "new_stories") freshness = Math.max(freshness, 0.85);

    if (boardType === "long_tail_quality") {
      const imp = metrics?.impressions ?? 0;
      if (imp > medianImpressions * 0.6) continue;
      if (completionRate < 0.4 && nextChapterRate < 0.4) continue;
    }

    if (boardType === "most_saved" && (metrics?.saveRate ?? 0) < 0.05) continue;
    if (boardType === "completed_stories" && !story.isCompleted) continue;

    const { score, breakdown } = computeRankingScore(
      {
        completionRate,
        nextChapterRate,
        saveRate: metrics?.saveRate ?? 0,
        followRate: metrics?.followRate ?? 0,
        unlockRate: metrics?.unlockRate ?? 0,
        freshness,
        fairness,
        reportRate: metrics?.reportRate ?? 0,
        hideRate: metrics?.hideRate ?? 0
      },
      weights
    );

    let adjustedScore = score;
    if (boardType === "most_saved") {
      adjustedScore = score * 0.4 + (metrics?.saveRate ?? 0) * 0.6;
    }
    if (boardType === "rising_stories") {
      const weekImp = metrics?.impressions ?? 0;
      const dayImp = dayMetricsMap?.get(story.id)?.impressions ?? 0;
      const growth = weekImp > 0 ? (dayImp * 7) / weekImp : 0;
      adjustedScore = score * 0.55 + Math.min(growth, 1.5) * 0.45;
    }

    const reason = reasonFromBoard(boardType, breakdown);
    scored.push({
      item_id: story.id,
      story_id: story.id,
      author_user_id: story.authorUserId,
      score: adjustedScore,
      score_breakdown: { ...breakdown, reason }
    });
  }

  return scored;
}

async function scoreAuthorCandidates(
  db: DatabaseClient,
  stories: EligibleStory[],
  window: RankingTimeWindow
) {
  const weights = await loadRankingWeights();
  const metricsMap = await loadAggregatedStoryMetrics(db, window);
  const authors = await fetchEligibleAuthors(db, stories);

  const byAuthor = new Map<string, EligibleStory[]>();
  for (const story of stories) {
    byAuthor.set(story.authorUserId, [...(byAuthor.get(story.authorUserId) ?? []), story]);
  }

  const scored: Array<{
    item_id: string;
    story_id: null;
    author_user_id: string;
    score: number;
    score_breakdown: RankingScoreBreakdown;
  }> = [];

  for (const author of authors) {
    if (daysSince(author.firstPublishedAt) > 90) continue;

    const authorStories = byAuthor.get(author.userId) ?? [];
    if (authorStories.length === 0) continue;

    let completion = 0;
    let nextChapter = 0;
    let save = 0;
    let follow = 0;
    let unlock = 0;
    let report = 0;
    let hide = 0;

    for (const story of authorStories) {
      const m = metricsMap.get(story.id);
      completion += m?.completionRate ?? 0;
      nextChapter += m?.nextChapterRate ?? 0;
      save += m?.saveRate ?? 0;
      follow += m?.followRate ?? 0;
      unlock += m?.unlockRate ?? 0;
      report += m?.reportRate ?? 0;
      hide += m?.hideRate ?? 0;
    }

    const count = authorStories.length;
    const freshness = freshnessFromPublishedAt(author.firstPublishedAt);
    const { score, breakdown } = computeRankingScore(
      {
        completionRate: completion / count,
        nextChapterRate: nextChapter / count,
        saveRate: save / count,
        followRate: follow / count,
        unlockRate: unlock / count,
        freshness: Math.max(freshness, 0.8),
        fairness: 0.75,
        reportRate: report / count,
        hideRate: hide / count
      },
      weights
    );

    scored.push({
      item_id: author.userId,
      story_id: null,
      author_user_id: author.userId,
      score,
      score_breakdown: { ...breakdown, reason: "Tác giả mới" }
    });
  }

  return scored;
}

async function scoreReelCandidates(db: DatabaseClient, window: RankingTimeWindow) {
  const reels = await fetchEligibleReels(db);
  const metricsMap = await loadAggregatedReelMetrics(db, window);
  const weights = await loadRankingWeights();

  return reels
    .map((reel) => {
      const metrics = metricsMap.get(reel.id);
      const rate = metrics?.reelsToReadRate ?? 0;
      const { score, breakdown } = computeRankingScore(
        {
          completionRate: rate,
          nextChapterRate: rate,
          saveRate: 0,
          followRate: 0,
          unlockRate: 0,
          freshness: freshnessFromPublishedAt(reel.publishedAt),
          fairness: 0.7,
          reportRate: 0,
          hideRate: 0
        },
        weights
      );
      return {
        item_id: reel.id,
        story_id: reel.storyId,
        author_user_id: reel.authorUserId,
        score: score * 0.3 + rate * 0.7,
        score_breakdown: { ...breakdown, reason: "Reels kéo đọc" }
      };
    })
    .filter((row) => row.score > 0);
}

async function scoreChapterCandidates(
  db: DatabaseClient,
  stories: EligibleStory[],
  window: RankingTimeWindow
) {
  const chapters = await fetchEligibleChapters(db);
  const metricsMap = await loadAggregatedStoryMetrics(db, window);
  const storyMap = new Map(stories.map((s) => [s.id, s]));
  const weights = await loadRankingWeights();

  return chapters
    .map((chapter) => {
      const story = storyMap.get(chapter.storyId);
      if (!story) return null;

      const metrics = metricsMap.get(chapter.storyId);
      const nextRate = metrics?.nextChapterRate ?? 0;
      if (nextRate < 0.35) return null;

      const { score, breakdown } = computeRankingScore(
        {
          completionRate: metrics?.completionRate ?? 0,
          nextChapterRate: nextRate,
          saveRate: metrics?.saveRate ?? 0,
          followRate: 0,
          unlockRate: 0,
          freshness: freshnessFromPublishedAt(chapter.publishedAt),
          fairness: 0.65,
          reportRate: metrics?.reportRate ?? 0,
          hideRate: metrics?.hideRate ?? 0
        },
        weights
      );

      return {
        item_id: chapter.id,
        story_id: chapter.storyId,
        author_user_id: chapter.authorUserId,
        score,
        score_breakdown: { ...breakdown, reason: "Đọc tiếp cao" }
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

async function scoreBoostedStoryCandidates(
  stories: EligibleStory[],
  halfLifeDays: number
) {
  const { loadBoostedStoryScores } = await import("@/lib/boost/refresh-boost-daily-stats");
  const boosted = await loadBoostedStoryScores(halfLifeDays);
  const storyMap = new Map(stories.map((story) => [story.id, story]));

  return boosted
    .filter((row) => storyMap.has(row.storyId))
    .map((row) => {
      const story = storyMap.get(row.storyId)!;
      const breakdown: RankingScoreBreakdown = {
        completion_rate: 0,
        next_chapter_rate: 0,
        save_rate: 0,
        follow_rate: 0,
        unlock_rate: 0,
        freshness: 0,
        fairness: 0,
        report_penalty: 0,
        hide_penalty: 0,
        raw_score: row.score,
        reason: "Được đề cử"
      };

      return {
        item_id: story.id,
        story_id: story.id,
        author_user_id: story.authorUserId,
        score: row.score,
        score_breakdown: breakdown
      };
    });
}

function finalizeRows(
  boardType: RankingBoardType,
  window: RankingTimeWindow,
  taxonomyTermId: string | null,
  itemType: RankingItemType,
  candidates: Array<{
    item_id: string;
    story_id: string | null;
    author_user_id: string;
    score: number;
    score_breakdown: RankingScoreBreakdown;
  }>,
  snapshotAt: string,
  maxSameAuthor: number,
  applyDiversity: boolean
): SnapshotInsert[] {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const diversified = applyDiversity
    ? applyRankingAuthorDiversity(
        sorted.map((row, index) => ({
          item_id: row.item_id,
          author_user_id: row.author_user_id,
          rank_position: index + 1,
          score: row.score
        })),
        maxSameAuthor
      )
    : sorted.map((row, index) => ({
        item_id: row.item_id,
        author_user_id: row.author_user_id,
        rank_position: index + 1,
        score: row.score
      }));

  const rankByItem = new Map(diversified.map((row) => [row.item_id, row]));
  const ordered = sorted
    .filter((row) => rankByItem.has(row.item_id))
    .sort(
      (a, b) =>
        (rankByItem.get(a.item_id)?.rank_position ?? 999) -
        (rankByItem.get(b.item_id)?.rank_position ?? 999)
    )
    .slice(0, SNAPSHOT_LIMIT);

  return ordered.map((row, index) => ({
    ranking_type: boardType,
    time_window: window,
    taxonomy_term_id: taxonomyTermId,
    item_type: itemType,
    item_id: row.item_id,
    story_id: row.story_id,
    author_user_id: row.author_user_id,
    rank_position: index + 1,
    score: row.score,
    score_breakdown: row.score_breakdown,
    snapshot_at: snapshotAt
  }));
}

async function insertSnapshots(
  db: DatabaseClient,
  rows: SnapshotInsert[]
) {
  if (rows.length === 0) return 0;

  const { error } = await db.from("ranking_snapshots").insert(rows);
  if (error) {
    if (isMissingSchemaError(error)) return 0;
    throw error;
  }
  return rows.length;
}

async function purgeOldSnapshots(
  db: DatabaseClient,
  retentionDays: number
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  await db
    .from("ranking_snapshots")
    .delete()
    .lt("snapshot_at", cutoff.toISOString());
}

export type GenerateRankingSnapshotsResult = {
  inserted: number;
  boards: Array<{ type: string; window: string; genreId: string | null; count: number }>;
  snapshotAt: string;
  error: string | null;
};

export async function generateRankingSnapshots(
  db: DatabaseClient
): Promise<GenerateRankingSnapshotsResult> {
  const config = await getAlgorithmConfig();
  const maxSameAuthor = Number(config["ranking.max_same_author_top_slots"] ?? 2);
  const retentionDays = Number(config["ranking.snapshot_retention_days"] ?? 14);
  const snapshotAt = new Date().toISOString();

  const stories = await fetchEligibleStories(db);
  const { getBoostSettings } = await import("@/lib/boost/boost-settings");
  const boostSettings = await getBoostSettings();
  const { listTaxonomyMainGenresForRanking } = await import(
    "@/lib/taxonomy/ranking-bridge"
  );
  const taxonomyGenres = await listTaxonomyMainGenresForRanking(db);

  let inserted = 0;
  const boards: GenerateRankingSnapshotsResult["boards"] = [];

  const storyBoards: Array<{
    type: RankingBoardType;
    filter?: (story: EligibleStory) => boolean;
    diversity?: boolean;
  }> = [
    { type: "top_stories", diversity: true },
    { type: "new_stories", diversity: true },
    { type: "completed_stories", diversity: true },
    { type: "rising_stories", diversity: true },
    { type: "most_saved", diversity: true },
    { type: "long_tail_quality", diversity: true }
  ];

  for (const window of TIME_WINDOWS) {
    const dayMetricsMap =
      window === "week" ? await loadAggregatedStoryMetrics(db, "day") : undefined;

    for (const board of storyBoards) {
      const candidates = await scoreStoryCandidates(
        db,
        stories,
        window,
        board.type,
        board.filter,
        board.type === "rising_stories" ? dayMetricsMap : undefined
      );
      const rows = finalizeRows(
        board.type,
        window,
        null,
        "story",
        candidates,
        snapshotAt,
        maxSameAuthor,
        board.diversity ?? false
      );
      inserted += await insertSnapshots(db, rows);
      boards.push({ type: board.type, window, genreId: null, count: rows.length });
    }

    if (boostSettings.enabled) {
      for (const window of ["day", "week", "month", "all_time"] as RankingTimeWindow[]) {
        const candidates = await scoreBoostedStoryCandidates(
          stories,
          boostSettings.decayHalfLifeDays
        );
        const rows = finalizeRows(
          "boosted_stories",
          window,
          null,
          "story",
          candidates,
          snapshotAt,
          maxSameAuthor,
          true
        );
        inserted += await insertSnapshots(db, rows);
        boards.push({
          type: "boosted_stories",
          window,
          genreId: null,
          count: rows.length
        });
      }
    }

    const authorCandidates = await scoreAuthorCandidates(db, stories, window);
    const authorRows = finalizeRows(
      "new_authors",
      window,
      null,
      "author",
      authorCandidates,
      snapshotAt,
      maxSameAuthor,
      true
    );
    inserted += await insertSnapshots(db, authorRows);
    boards.push({ type: "new_authors", window, genreId: null, count: authorRows.length });

    const reelCandidates = await scoreReelCandidates(db, window);
    const reelRows = finalizeRows(
      "reels_read_through",
      window,
      null,
      "reel",
      reelCandidates,
      snapshotAt,
      maxSameAuthor,
      false
    );
    inserted += await insertSnapshots(db, reelRows);
    boards.push({
      type: "reels_read_through",
      window,
      genreId: null,
      count: reelRows.length
    });

    const chapterCandidates = await scoreChapterCandidates(db, stories, window);
    const chapterRows = finalizeRows(
      "chapter_next_rate",
      window,
      null,
      "chapter",
      chapterCandidates,
      snapshotAt,
      maxSameAuthor,
      false
    );
    inserted += await insertSnapshots(db, chapterRows);
    boards.push({
      type: "chapter_next_rate",
      window,
      genreId: null,
      count: chapterRows.length
    });
  }

  const genreBoardTargets = taxonomyGenres.map((genre) => ({
    termId: genre.termId,
    matches: (story: EligibleStory) => story.mainGenreTermId === genre.termId
  }));

  for (const target of genreBoardTargets) {
    for (const window of ["week", "month"] as RankingTimeWindow[]) {
      const candidates = await scoreStoryCandidates(
        db,
        stories,
        window,
        "genre_stories",
        target.matches
      );
      if (candidates.length === 0) continue;

      const rows = finalizeRows(
        "genre_stories",
        window,
        target.termId,
        "story",
        candidates,
        snapshotAt,
        maxSameAuthor,
        true
      );
      inserted += await insertSnapshots(db, rows);
      boards.push({
        type: "genre_stories",
        window,
        genreId: target.termId,
        count: rows.length
      });
    }
  }

  await purgeOldSnapshots(db, retentionDays);

  return { inserted, boards, snapshotAt, error: null };
}
