import { and, eq, gte, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groupFeedItems,
  interactionEvents
} from "@/lib/db/schema/story-community-sync";
import {
  GROUP_FEED_ITEM_TYPES,
  INTERACTION_EVENT_TYPES
} from "@/lib/community-sync/constants";
import type { AggregationBucket } from "@/lib/community-sync/projection/types";

const SURFACED_EVENT_TYPES = [
  INTERACTION_EVENT_TYPES.commentCreated,
  INTERACTION_EVENT_TYPES.commentReply,
  INTERACTION_EVENT_TYPES.authorReply
] as const;

const BLOCKED_MODERATION = new Set(["hidden", "rejected"]);

export function buildAggregationBucket(input: AggregationBucket) {
  return input;
}

export function windowStart(windowMinutes: number) {
  return new Date(Date.now() - windowMinutes * 60_000);
}

/** Count interaction events in the collapse bucket (includes event_type). */
export async function countEventsInAggregationBucket(
  bucket: AggregationBucket,
  windowMinutes: number
) {
  const since = windowStart(windowMinutes);

  const rows = await db
    .select({ id: interactionEvents.id })
    .from(interactionEvents)
    .where(
      and(
        eq(interactionEvents.storyId, bucket.storyId),
        eq(interactionEvents.groupId, bucket.groupId),
        eq(interactionEvents.sourceEntityType, bucket.sourceEntityType),
        eq(interactionEvents.sourceEntityId, bucket.sourceEntityId),
        eq(interactionEvents.eventType, bucket.eventType),
        gte(interactionEvents.createdAt, since),
        notInArray(interactionEvents.moderationStatus, ["hidden", "rejected"])
      )
    );

  return rows.length;
}

/** Individual (non-aggregated) feed cards already shown for this source in the window. */
export async function countIndividualFeedItemsForSource(
  groupId: string,
  sourceEntityType: string,
  sourceEntityId: string,
  windowMinutes: number
) {
  const since = windowStart(windowMinutes);

  const rows = await db
    .select({ id: groupFeedItems.id })
    .from(groupFeedItems)
    .where(
      and(
        eq(groupFeedItems.groupId, groupId),
        eq(groupFeedItems.sourceEntityType, sourceEntityType),
        eq(groupFeedItems.sourceEntityId, sourceEntityId),
        inArray(groupFeedItems.itemType, [
          GROUP_FEED_ITEM_TYPES.comment,
          GROUP_FEED_ITEM_TYPES.authorReply
        ]),
        eq(groupFeedItems.visibility, "visible"),
        gte(groupFeedItems.createdAt, since)
      )
    );

  return rows.length;
}

/** Latest surfaced event in bucket for aggregation metadata. */
export async function getLatestEventInBucket(
  bucket: AggregationBucket,
  windowMinutes: number
) {
  const since = windowStart(windowMinutes);

  const rows = await db.execute(sql`
    select
      id,
      actor_user_id,
      source_comment_id,
      target_url,
      metadata_json,
      spoiler_level,
      moderation_status,
      created_at
    from public.interaction_events
    where story_id = ${bucket.storyId}::uuid
      and group_id = ${bucket.groupId}::uuid
      and source_entity_type = ${bucket.sourceEntityType}
      and source_entity_id = ${bucket.sourceEntityId}::uuid
      and event_type = ${bucket.eventType}
      and created_at >= ${since.toISOString()}::timestamptz
      and moderation_status not in ('hidden', 'rejected')
    order by created_at desc
    limit 1
  `);

  return (rows.rows[0] as {
    id: string;
    actor_user_id: string | null;
    source_comment_id: string | null;
    target_url: string | null;
    metadata_json: Record<string, unknown> | null;
    spoiler_level: string;
    moderation_status: string;
    created_at: string;
  } | undefined) ?? null;
}

export function isSurfacedEventType(eventType: string) {
  return SURFACED_EVENT_TYPES.includes(
    eventType as (typeof SURFACED_EVENT_TYPES)[number]
  );
}

export function isBlockedModeration(status: string) {
  return BLOCKED_MODERATION.has(status);
}

export function shouldUseAggregation(input: {
  eventCountInWindow: number;
  maxIndividualItemsPerWindow: number;
  isAuthorReply: boolean;
  syncAuthorReplies: boolean;
}) {
  if (input.isAuthorReply && input.syncAuthorReplies) {
    return false;
  }

  if (input.eventCountInWindow <= 1) {
    return false;
  }

  return input.eventCountInWindow > input.maxIndividualItemsPerWindow;
}

export function buildAggregatedExcerpt(count: number, windowMinutes: number) {
  return `${count} bình luận mới trong ${windowMinutes} phút qua`;
}

export function pickSafeLatestExcerpt(input: {
  excerpt: string | null;
  spoilerLevel: string;
  moderationStatus: string;
}) {
  if (
    !input.excerpt ||
    input.spoilerLevel !== "none" ||
    input.moderationStatus === "flagged" ||
    input.moderationStatus === "pending"
  ) {
    return null;
  }

  return input.excerpt;
}
