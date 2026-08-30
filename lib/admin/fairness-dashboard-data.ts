"use server";

import {
  calculateExposureShare,
  topEntitiesFromMap,
  windowStartIso
} from "@/lib/fairness/exposure-share";
import { loadFairnessAlertThresholds } from "@/lib/fairness/thresholds";
import { createAdminClient } from "@/lib/data/admin";
import type { FairnessWarningLevel } from "@/types/fairness";

export type FairnessSurfaceSnapshot = {
  surface: string;
  totalImpressions: number;
  top1AuthorShare: number;
  top10AuthorShare: number;
  top1StoryShare: number;
  top10StoryShare: number;
  giniAuthor: number | null;
  giniStory: number | null;
  newAuthorShare: number;
  underExposedShare: number;
  longTailShare: number;
  warningLevel: FairnessWarningLevel;
};

export type FairnessTopEntityRow = {
  id: string;
  label: string;
  impressions: number;
  sharePercent: number;
};

export type FairnessDashboardData = {
  error: string | null;
  snapshotDate: string;
  thresholds: Awaited<ReturnType<typeof loadFairnessAlertThresholds>>;
  surfaces: FairnessSurfaceSnapshot[];
  topAuthors: FairnessTopEntityRow[];
  topStories: FairnessTopEntityRow[];
  newAuthorsTestedToday: number;
  newStoriesTestedToday: number;
  recentAdjustments: Array<{
    id: string;
    adjustmentType: string;
    surface: string;
    itemType: string;
    reason: string | null;
    oldScore: number;
    newScore: number;
    createdAt: string;
  }>;
  recentFeedMixLogs: Array<{
    requestId: string;
    surface: string;
    algorithmVersion: string;
    originalCount: number;
    translationCount: number;
    notes: string[];
    createdAt: string;
  }>;
};

const SURFACES = ["reels", "discover", "search", "ranking"] as const;

async function countNewEntitiesToday(
  db: ReturnType<typeof createAdminClient>,
  field: "author_user_id" | "story_id"
) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = windowStartIso("7d");

  const { data: todayRows } = await db
    .from("exposure_events")
    .select(field)
    .gte("created_at", todayStart.toISOString())
    .not(field, "is", null)
    .limit(20000);

  const { data: weekRows } = await db
    .from("exposure_events")
    .select(field)
    .gte("created_at", weekStart)
    .lt("created_at", todayStart.toISOString())
    .not(field, "is", null)
    .limit(20000);

  const weekSet = new Set(
    (weekRows ?? []).map((row) => (row as Record<string, string | null>)[field]).filter(Boolean)
  );

  const todaySet = new Set<string>();
  for (const row of todayRows ?? []) {
    const id = (row as Record<string, string | null>)[field];
    if (id && !weekSet.has(id)) todaySet.add(id);
  }
  return todaySet.size;
}

export async function loadFairnessDashboardData(): Promise<FairnessDashboardData> {
  const snapshotDate = new Date().toISOString().slice(0, 10);

  try {
    const db = createAdminClient();
    const thresholds = await loadFairnessAlertThresholds();

    const { data: storedSnapshots } = await db
      .from("exposure_distribution_snapshots")
      .select("*")
      .eq("snapshot_date", snapshotDate)
      .in("surface", [...SURFACES]);

    const surfaces: FairnessSurfaceSnapshot[] = [];

    for (const surface of SURFACES) {
      const stored = (storedSnapshots ?? []).find((row) => row.surface === surface);
      if (stored) {
        surfaces.push({
          surface,
          totalImpressions: stored.total_impressions ?? 0,
          top1AuthorShare: Number(stored.top_1_percent_author_impression_share ?? 0),
          top10AuthorShare: Number(stored.top_10_percent_author_impression_share ?? 0),
          top1StoryShare: Number(stored.top_1_percent_story_impression_share ?? 0),
          top10StoryShare: Number(stored.top_10_percent_story_impression_share ?? 0),
          giniAuthor: stored.gini_author_exposure ?? null,
          giniStory: stored.gini_story_exposure ?? null,
          newAuthorShare: Number(stored.new_author_impression_share ?? 0),
          underExposedShare: Number(stored.under_exposed_impression_share ?? 0),
          longTailShare: Number(stored.long_tail_impression_share ?? 0),
          warningLevel: (stored.warning_level as FairnessWarningLevel) ?? "ok"
        });
        continue;
      }

      const live = await calculateExposureShare(db, surface, "7d");
      const { resolveWarningLevel } = await import("@/lib/fairness/thresholds");
      surfaces.push({
        surface,
        totalImpressions: live.totalImpressions,
        top1AuthorShare: live.top1PercentAuthorShare,
        top10AuthorShare: live.top10PercentAuthorShare,
        top1StoryShare: live.top1PercentStoryShare,
        top10StoryShare: live.top10PercentStoryShare,
        giniAuthor: live.giniAuthor,
        giniStory: live.giniStory,
        newAuthorShare: live.newAuthorImpressionShare,
        underExposedShare: live.underExposedImpressionShare,
        longTailShare: live.longTailImpressionShare,
        warningLevel: resolveWarningLevel(live, thresholds)
      });
    }

    const reelsShare = await calculateExposureShare(db, "reels", "7d");
    const authorTops = topEntitiesFromMap(
      reelsShare.authorImpressions,
      reelsShare.totalImpressions,
      12
    );
    const storyTops = topEntitiesFromMap(
      reelsShare.storyImpressions,
      reelsShare.totalImpressions,
      12
    );

    const authorIds = authorTops.map((row) => row.id);
    const storyIds = storyTops.map((row) => row.id);

    const [{ data: authorProfiles }, { data: stories }] = await Promise.all([
      authorIds.length > 0
        ? db
            .from("profiles")
            .select("id, username, display_name")
            .in("id", authorIds)
        : Promise.resolve({ data: [] }),
      storyIds.length > 0
        ? db.from("stories").select("id, title, slug").in("id", storyIds)
        : Promise.resolve({ data: [] })
    ]);

    const profileById = new Map(
      (authorProfiles ?? []).map((profile) => [profile.id as string, profile])
    );
    const storyById = new Map((stories ?? []).map((story) => [story.id as string, story]));

    const [newAuthorsTestedToday, newStoriesTestedToday, adjustmentsRes] =
      await Promise.all([
        countNewEntitiesToday(db, "author_user_id"),
        countNewEntitiesToday(db, "story_id"),
        db
          .from("fairness_adjustment_logs")
          .select(
            "id, adjustment_type, surface, item_type, reason, old_score, new_score, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(20)
      ]);
    const { data: feedMixRows } = await db
      .from("algorithm_feed_requests")
      .select("request_id, surface, algorithm_version, pool_counts, selected_items, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    return {
      error: null,
      snapshotDate,
      thresholds,
      surfaces,
      topAuthors: authorTops.map((row) => {
        const profile = profileById.get(row.id);
        const username = profile?.username as string | null | undefined;
        return {
          id: row.id,
          label: username ? `@${username}` : (profile?.display_name as string) ?? row.id.slice(0, 8),
          impressions: row.impressions,
          sharePercent: row.sharePercent
        };
      }),
      topStories: storyTops.map((row) => {
        const story = storyById.get(row.id);
        return {
          id: row.id,
          label: (story?.title as string) ?? row.id.slice(0, 8),
          impressions: row.impressions,
          sharePercent: row.sharePercent
        };
      }),
      newAuthorsTestedToday,
      newStoriesTestedToday,
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
      recentFeedMixLogs: (feedMixRows ?? []).map((row) => {
        const selectedItems: Array<{ content_origin?: string; selection_reason?: string | null }> =
          Array.isArray(row.selected_items)
          ? (row.selected_items as Array<{ content_origin?: string; selection_reason?: string | null }>)
          : [];
        const originalCount = selectedItems.filter(
          (item) => item.content_origin !== "translation"
        ).length;
        const translationCount = selectedItems.filter(
          (item) => item.content_origin === "translation"
        ).length;
        const poolCounts = row.pool_counts as Record<string, number> | null;
        const reasonCounts = new Map<string, number>();
        for (const item of selectedItems) {
          const reason = item.selection_reason;
          if (!reason) continue;
          reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
        }
        const topReasons = [...reasonCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([reason, count]) => `${reason} (${count})`);
        const notes = [
          ...(poolCounts?.origin_mix_notes
            ? [`origin_mix_notes=${poolCounts.origin_mix_notes}`]
            : []),
          ...topReasons
        ];
        return {
          requestId: String(row.request_id),
          surface: String(row.surface),
          algorithmVersion: String(row.algorithm_version),
          originalCount,
          translationCount,
          notes,
          createdAt: String(row.created_at)
        };
      })
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not load fairness dashboard.",
      snapshotDate,
      thresholds: {
        top1AuthorPercent: 50,
        top10StoryPercent: 70,
        minNewAuthorPercent: 5,
        minLongTailPercent: 8,
        minNewAuthorSlotsPercent: 8,
        minUnderExposedSlotsPercent: 10,
        maxAuthorSharePerFeedPercent: 25
      },
      surfaces: [],
      topAuthors: [],
      topStories: [],
      newAuthorsTestedToday: 0,
      newStoriesTestedToday: 0,
      recentAdjustments: [],
      recentFeedMixLogs: []
    };
  }
}
