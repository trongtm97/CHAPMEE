import { sql } from "drizzle-orm";
import {
  GROUP_FEED_ITEM_TYPES,
  INTERACTION_EVENT_TYPES,
  SOURCE_ENTITY_TYPES
} from "@/lib/community-sync/constants";
import { getCommunitySyncSettings } from "@/lib/community-sync/sync-settings";
import {
  buildAggregationBucket,
  isBlockedModeration,
  isSurfacedEventType
} from "@/lib/community-sync/projection/aggregation-bucket";
import { projectCommentToGroupFeed } from "@/lib/community-sync/projection/project-from-event";
import { db } from "@/lib/db";
import type {
  RebuildProgress,
  RebuildProjectionOptions,
  RebuildProjectionResult
} from "@/lib/community-sync/projection/types";

type RebuildEventRow = {
  id: string;
  actor_user_id: string | null;
  group_id: string;
  story_id: string;
  event_type: string;
  source_entity_type: string;
  source_entity_id: string;
  source_comment_id: string | null;
  target_url: string | null;
  metadata_json: Record<string, unknown> | null;
  moderation_status: string;
  spoiler_level: string;
  source_chapter_order: number | null;
};

function mapEventToFeedItemType(eventType: string) {
  if (eventType === INTERACTION_EVENT_TYPES.authorReply) {
    return GROUP_FEED_ITEM_TYPES.authorReply;
  }
  if (eventType === INTERACTION_EVENT_TYPES.reviewCreated) {
    return GROUP_FEED_ITEM_TYPES.review;
  }
  return GROUP_FEED_ITEM_TYPES.comment;
}

function mapEventToScore(eventType: string) {
  if (eventType === INTERACTION_EVENT_TYPES.authorReply) {
    return 40;
  }
  if (eventType === INTERACTION_EVENT_TYPES.commentReply) {
    return 18;
  }
  return 10;
}

function resolveFeedVisibility(moderationStatus: string) {
  if (moderationStatus === "hidden" || moderationStatus === "rejected") {
    return "hidden" as const;
  }
  if (moderationStatus === "pending" || moderationStatus === "flagged") {
    return "moderated" as const;
  }
  return "visible" as const;
}

async function fetchEventBatch(offset: number, batchSize: number) {
  const { rows } = await db.execute(sql`
    select
      id,
      actor_user_id,
      group_id,
      story_id,
      event_type,
      source_entity_type,
      source_entity_id,
      source_comment_id,
      target_url,
      metadata_json,
      moderation_status,
      spoiler_level,
      source_chapter_order
    from public.interaction_events
    order by created_at asc, id asc
    offset ${offset}
    limit ${batchSize}
  `);

  return rows as RebuildEventRow[];
}

export async function rebuildGroupFeedProjection(
  options?: RebuildProjectionOptions
): Promise<RebuildProjectionResult> {
  const dryRun = options?.dryRun ?? true;
  const batchSize = options?.batchSize ?? 500;
  const startOffset = options?.offset ?? 0;
  const maxBatches = options?.maxBatches ?? 20;
  const settings = await getCommunitySyncSettings();

  let offset = startOffset;
  let eventsScanned = 0;
  let projected = 0;
  let aggregated = 0;
  let individual = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let hasMore = false;
  let batch = 0;

  while (batch < maxBatches) {
    const events = await fetchEventBatch(offset, batchSize);
    if (!events.length) {
      hasMore = false;
      break;
    }

    batch += 1;
    eventsScanned += events.length;

    for (const row of events) {
      if (!isSurfacedEventType(row.event_type)) {
        skipped += 1;
        continue;
      }

      if (!row.source_comment_id && row.event_type !== INTERACTION_EVENT_TYPES.reviewCreated) {
        skipped += 1;
        continue;
      }

      if (isBlockedModeration(row.moderation_status)) {
        skipped += 1;
        continue;
      }

      projected += 1;

      if (dryRun) {
        continue;
      }

      try {
        const content =
          typeof row.metadata_json?.excerpt === "string" ? row.metadata_json.excerpt : "";
        const isAuthorReply = row.event_type === INTERACTION_EVENT_TYPES.authorReply;
        const visibility = resolveFeedVisibility(row.moderation_status);

        const result = await projectCommentToGroupFeed({
          eventId: row.id,
          eventCreated: false,
          groupId: row.group_id,
          storyId: row.story_id,
          commentId: row.source_comment_id ?? row.source_entity_id,
          actorUserId: row.actor_user_id ?? "",
          content,
          eventType: row.event_type as typeof INTERACTION_EVENT_TYPES.commentCreated,
          itemType: mapEventToFeedItemType(row.event_type),
          sourceEntityType: row.source_entity_type as typeof SOURCE_ENTITY_TYPES.chapter,
          sourceEntityId: row.source_entity_id,
          targetUrl: row.target_url,
          sourceChapterOrder: row.source_chapter_order,
          spoilerLevel: row.spoiler_level as "none" | "mild" | "major",
          moderationStatus: row.moderation_status as "pending" | "approved" | "flagged",
          visibility,
          score: mapEventToScore(row.event_type),
          isAuthorReply,
          excerptMax: settings.paidChapterCommentPreview,
          collapseWindowMinutes: settings.collapseWindowMinutes,
          maxIndividualItemsPerWindow: settings.maxActivityItemsPerSourcePerHour,
          syncAuthorReplies: settings.syncAuthorReplies
        });

        if (result.skipped) {
          skipped += 1;
        } else if (result.aggregated) {
          aggregated += 1;
          updated += 1;
        } else if (result.individual) {
          individual += 1;
          created += 1;
        }
      } catch (error) {
        errors += 1;
        console.error("[rebuild-projection] event failed", row.id, error);
      }
    }

    options?.onProgress?.({
      batch,
      offset,
      eventsInBatch: events.length,
      totalScanned: eventsScanned,
      projected,
      aggregated,
      individual,
      skipped,
      errors
    });

    if (events.length < batchSize) {
      hasMore = false;
      break;
    }

    hasMore = true;
    offset += batchSize;
  }

  return {
    dryRun,
    eventsScanned,
    projected,
    aggregated,
    individual,
    created,
    updated,
    skipped,
    errors,
    hasMore,
    nextOffset: hasMore ? offset : offset
  };
}

/** Replay projection for a single bucket (optional cron helper). */
export async function replayAggregationBucketProjection(input: {
  storyId: string;
  groupId: string;
  sourceEntityType: string;
  sourceEntityId: string;
  eventType: string;
}) {
  const settings = await getCommunitySyncSettings();
  const bucket = buildAggregationBucket({
    storyId: input.storyId,
    groupId: input.groupId,
    sourceEntityType: input.sourceEntityType as typeof SOURCE_ENTITY_TYPES.chapter,
    sourceEntityId: input.sourceEntityId,
    eventType: input.eventType as typeof INTERACTION_EVENT_TYPES.commentCreated
  });

  const latest = await db.execute(sql`
    select id, source_comment_id, metadata_json, target_url, moderation_status, spoiler_level
    from public.interaction_events
    where story_id = ${input.storyId}::uuid
      and group_id = ${input.groupId}::uuid
      and source_entity_type = ${input.sourceEntityType}
      and source_entity_id = ${input.sourceEntityId}::uuid
      and event_type = ${input.eventType}
    order by created_at desc
    limit 1
  `);

  const row = latest.rows[0] as RebuildEventRow | undefined;
  if (!row?.source_comment_id) {
    return { ok: false, error: "no_events" };
  }

  const content =
    typeof row.metadata_json?.excerpt === "string" ? row.metadata_json.excerpt : "";

  return projectCommentToGroupFeed({
    eventId: row.id,
    eventCreated: false,
    groupId: input.groupId,
    storyId: input.storyId,
    commentId: row.source_comment_id,
    actorUserId: row.actor_user_id ?? "",
    content,
    eventType: input.eventType as typeof INTERACTION_EVENT_TYPES.commentCreated,
    itemType: mapEventToFeedItemType(input.eventType),
    sourceEntityType: input.sourceEntityType as typeof SOURCE_ENTITY_TYPES.chapter,
    sourceEntityId: input.sourceEntityId,
    targetUrl: row.target_url,
    sourceChapterOrder: row.source_chapter_order,
    spoilerLevel: row.spoiler_level as "none" | "mild" | "major",
    moderationStatus: row.moderation_status as "approved",
    visibility: resolveFeedVisibility(row.moderation_status),
    score: mapEventToScore(input.eventType),
    isAuthorReply: input.eventType === INTERACTION_EVENT_TYPES.authorReply,
    excerptMax: settings.paidChapterCommentPreview,
    collapseWindowMinutes: settings.collapseWindowMinutes,
    maxIndividualItemsPerWindow: settings.maxActivityItemsPerSourcePerHour,
    syncAuthorReplies: settings.syncAuthorReplies
  });
}

export type { RebuildProgress, RebuildProjectionOptions, RebuildProjectionResult };
