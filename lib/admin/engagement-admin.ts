import "server-only";

import { sql } from "drizzle-orm";
import { adminListMeta } from "@/lib/admin/admin-list-params";
import { db } from "@/lib/db";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type { EngagementOverviewStats } from "@/types/admin-engagement";

const EMPTY_OVERVIEW: EngagementOverviewStats = {
  reactionsToday: 0,
  reactions7d: 0,
  reviewsPending: 0,
  reviewsReported: 0,
  inlineCommentsPending: 0,
  inlineCommentsReported: 0,
  inlineThreadsOrphaned: 0,
  boostPointsToday: 0,
  boostPoints7d: 0,
  securityEventsToday: 0,
  topBoostedStories: []
};

export async function getEngagementOverviewStats(): Promise<EngagementOverviewStats> {
  try {
    const [reactions, reviews, inlineStats, boosts, security, topBoosted] = await Promise.all([
      db.execute(sql`
        select
          count(*) filter (
            where created_at >= date_trunc('day', now())
          )::int as today,
          count(*) filter (
            where created_at >= now() - interval '7 days'
          )::int as last_7d
        from public.chapter_reactions
        where origin = 'user'
      `),
      db.execute(sql`
        select
          count(*) filter (where status = 'pending')::int as pending,
          count(*) filter (where report_count > 0 and status <> 'deleted')::int as reported
        from public.story_reviews
      `),
      db.execute(sql`
        select
          count(*) filter (
            where c.status = 'visible' and c.report_count = 0
          )::int as pending_like,
          count(*) filter (where c.report_count > 0)::int as reported,
          count(distinct t.id) filter (where a.status = 'orphaned')::int as orphaned_threads
        from public.inline_comments c
        inner join public.inline_comment_threads t on t.id = c.thread_id
        inner join public.inline_comment_anchors a on a.id = t.anchor_id
        where c.engagement_source = 'user'
          and c.status <> 'deleted'
      `),
      db.execute(sql`
        select
          coalesce(sum(boost_points) filter (
            where created_at >= date_trunc('day', now())
          ), 0)::int as today,
          coalesce(sum(boost_points) filter (
            where created_at >= now() - interval '7 days'
          ), 0)::int as last_7d
        from public.story_boosts
        where engagement_source = 'user'
          and status = 'completed'
      `),
      db.execute(sql`
        select count(*)::int as today
        from public.security_events
        where created_at >= date_trunc('day', now())
      `),
      db.execute(sql`
        select
          s.id as story_id,
          s.title as story_title,
          s.slug as story_slug,
          coalesce(sum(b.boost_points), 0)::int as total_boost_points
        from public.story_boosts b
        inner join public.stories s on s.id = b.story_id
        where b.decay_group >= current_date - interval '7 days'
          and b.engagement_source = 'user'
          and b.status = 'completed'
        group by s.id, s.title, s.slug
        order by total_boost_points desc
        limit 5
      `)
    ]);

    const reactionRow = reactions.rows[0] as { today: number; last_7d: number } | undefined;
    const reviewRow = reviews.rows[0] as { pending: number; reported: number } | undefined;
    const inlineRow = inlineStats.rows[0] as {
      pending_like: number;
      reported: number;
      orphaned_threads: number;
    } | undefined;
    const boostRow = boosts.rows[0] as { today: number; last_7d: number } | undefined;
    const securityRow = security.rows[0] as { today: number } | undefined;

    return {
      reactionsToday: reactionRow?.today ?? 0,
      reactions7d: reactionRow?.last_7d ?? 0,
      reviewsPending: reviewRow?.pending ?? 0,
      reviewsReported: reviewRow?.reported ?? 0,
      inlineCommentsPending: inlineRow?.pending_like ?? 0,
      inlineCommentsReported: inlineRow?.reported ?? 0,
      inlineThreadsOrphaned: inlineRow?.orphaned_threads ?? 0,
      boostPointsToday: boostRow?.today ?? 0,
      boostPoints7d: boostRow?.last_7d ?? 0,
      securityEventsToday: securityRow?.today ?? 0,
      topBoostedStories: (
        topBoosted.rows as Array<{
          story_id: string;
          story_title: string;
          story_slug: string;
          total_boost_points: number;
        }>
      ).map((row) => ({
        storyId: row.story_id,
        storyTitle: row.story_title,
        storySlug: row.story_slug,
        totalBoostPoints: row.total_boost_points
      }))
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return EMPTY_OVERVIEW;
    }
    throw error;
  }
}

export { adminListMeta };
