import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getBoostSettings } from "@/lib/boost/boost-settings";
import { isMissingSchemaError } from "@/lib/data/schema-errors";

export async function refreshStoryBoostDailyStats(storyId: string, statDate?: string) {
  const dateExpr = statDate ? sql`${statDate}::date` : sql`current_date`;
  const settings = await getBoostSettings();

  try {
    await db.execute(sql`
      insert into public.story_boost_daily_stats (
        story_id,
        stat_date,
        total_boost_points,
        unique_boosters,
        decayed_score,
        boost_count
      )
      select
        ${storyId}::uuid,
        ${dateExpr},
        coalesce(sum(boost_points), 0),
        count(distinct user_id)::int,
        coalesce(sum(boost_points), 0) * ${settings.rankingWeight},
        count(*)::int
      from public.story_boosts
      where story_id = ${storyId}::uuid
        and decay_group = ${dateExpr}
        and engagement_source = 'user'
        and is_counted_in_ranking = true
        and status = 'completed'
      on conflict (story_id, stat_date) do update set
        total_boost_points = excluded.total_boost_points,
        unique_boosters = excluded.unique_boosters,
        decayed_score = excluded.decayed_score,
        boost_count = excluded.boost_count
    `);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return;
    }
    throw error;
  }
}

export async function getStoryBoostSummary(storyId: string) {
  try {
    const settings = await getBoostSettings();
    const halfLife = Math.max(1, settings.decayHalfLifeDays);

    const result = await db.execute(sql`
      select
        coalesce(sum(
          s.total_boost_points * exp(-ln(2) * (current_date - s.stat_date)::numeric / ${halfLife})
        ), 0)::numeric as decayed_total,
        coalesce(max(s.unique_boosters), 0)::int as latest_boosters
      from public.story_boost_daily_stats s
      where s.story_id = ${storyId}::uuid
        and s.stat_date >= current_date - interval '7 days'
    `);

    const row = result.rows[0] as { decayed_total?: string; latest_boosters?: number } | undefined;
    return {
      storyId,
      totalBoostPointsWeek: Number(row?.decayed_total ?? 0),
      uniqueBoostersWeek: Number(row?.latest_boosters ?? 0)
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { storyId, totalBoostPointsWeek: 0, uniqueBoostersWeek: 0 };
    }
    throw error;
  }
}

export async function loadBoostedStoryScores(halfLifeDays: number) {
  const halfLife = Math.max(1, halfLifeDays);

  try {
    const result = await db.execute(sql`
      select
        s.story_id,
        coalesce(sum(
          s.total_boost_points * exp(-ln(2) * (current_date - s.stat_date)::numeric / ${halfLife})
        ), 0)::numeric as decayed_score
      from public.story_boost_daily_stats s
      where s.stat_date >= current_date - interval '30 days'
      group by s.story_id
      having coalesce(sum(
        s.total_boost_points * exp(-ln(2) * (current_date - s.stat_date)::numeric / ${halfLife})
      ), 0) > 0
      order by decayed_score desc
      limit 100
    `);

    return (result.rows as Array<{ story_id: string; decayed_score: string }>).map((row) => ({
      storyId: row.story_id,
      score: Number(row.decayed_score)
    }));
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    throw error;
  }
}
