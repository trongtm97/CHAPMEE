import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type { AdminBoostInsightRow, AdminTopBooster, AdminTopBoostedStory } from "@/types/story-boost";

export async function getRecentStoryBoosts(limit = 20): Promise<AdminBoostInsightRow[]> {
  try {
    const result = await db.execute(sql`
      select
        b.id,
        b.story_id,
        s.title as story_title,
        b.user_id,
        p.display_name,
        p.username,
        b.boost_points,
        b.amount_spent,
        b.message,
        b.created_at
      from public.story_boosts b
      inner join public.stories s on s.id = b.story_id
      inner join public.profiles p on p.id = b.user_id
      where b.engagement_source = 'user'
        and b.status = 'completed'
      order by b.created_at desc
      limit ${limit}
    `);

    return (result.rows as Array<{
      id: string;
      story_id: string;
      story_title: string;
      user_id: string;
      display_name: string | null;
      username: string | null;
      boost_points: number;
      amount_spent: number;
      message: string | null;
      created_at: string;
    }>).map((row) => ({
      id: row.id,
      storyId: row.story_id,
      storyTitle: row.story_title,
      userId: row.user_id,
      displayName: row.display_name,
      username: row.username,
      boostPoints: row.boost_points,
      amountSpent: row.amount_spent,
      message: row.message,
      createdAt: row.created_at
    }));
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getTopBoostedStories(limit = 10): Promise<AdminTopBoostedStory[]> {
  try {
    const result = await db.execute(sql`
      select
        s.id as story_id,
        s.title as story_title,
        s.slug as story_slug,
        coalesce(sum(b.boost_points), 0)::int as total_boost_points,
        count(distinct b.user_id)::int as unique_boosters
      from public.story_boosts b
      inner join public.stories s on s.id = b.story_id
      where b.decay_group >= current_date - interval '7 days'
        and b.engagement_source = 'user'
        and b.status = 'completed'
      group by s.id, s.title, s.slug
      order by total_boost_points desc
      limit ${limit}
    `);

    return (result.rows as Array<{
      story_id: string;
      story_title: string;
      story_slug: string;
      total_boost_points: number;
      unique_boosters: number;
    }>).map((row) => ({
      storyId: row.story_id,
      storyTitle: row.story_title,
      storySlug: row.story_slug,
      totalBoostPoints: row.total_boost_points,
      uniqueBoosters: row.unique_boosters
    }));
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getTopBoosters(limit = 10): Promise<AdminTopBooster[]> {
  try {
    const result = await db.execute(sql`
      select
        b.user_id,
        p.display_name,
        p.username,
        coalesce(sum(b.boost_points), 0)::int as total_boost_points,
        count(*)::int as boost_count
      from public.story_boosts b
      inner join public.profiles p on p.id = b.user_id
      where b.decay_group >= current_date - interval '7 days'
        and b.engagement_source = 'user'
        and b.status = 'completed'
      group by b.user_id, p.display_name, p.username
      order by total_boost_points desc
      limit ${limit}
    `);

    return (result.rows as Array<{
      user_id: string;
      display_name: string | null;
      username: string | null;
      total_boost_points: number;
      boost_count: number;
    }>).map((row) => ({
      userId: row.user_id,
      displayName: row.display_name,
      username: row.username,
      totalBoostPoints: row.total_boost_points,
      boostCount: row.boost_count
    }));
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getSuspiciousHighVolumeBoosters(limit = 5): Promise<AdminTopBooster[]> {
  try {
    const result = await db.execute(sql`
      select
        b.user_id,
        p.display_name,
        p.username,
        coalesce(sum(b.boost_points), 0)::int as total_boost_points,
        count(*)::int as boost_count
      from public.story_boosts b
      inner join public.profiles p on p.id = b.user_id
      where b.decay_group = current_date
        and b.engagement_source = 'user'
        and b.status = 'completed'
      group by b.user_id, p.display_name, p.username
      having count(*) >= 5
      order by boost_count desc, total_boost_points desc
      limit ${limit}
    `);

    return (result.rows as Array<{
      user_id: string;
      display_name: string | null;
      username: string | null;
      total_boost_points: number;
      boost_count: number;
    }>).map((row) => ({
      userId: row.user_id,
      displayName: row.display_name,
      username: row.username,
      totalBoostPoints: row.total_boost_points,
      boostCount: row.boost_count
    }));
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    throw error;
  }
}
