import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groupFeedItems,
  interactionEvents
} from "@/lib/db/schema/story-community-sync";
import type {
  GroupFeedVisibility,
  InteractionModerationStatus,
  SpoilerLevel
} from "@/types/story-community-sync";
import type {
  GroupFeedItemType,
  InteractionEventType,
  SourceEntityType
} from "@/lib/community-sync/constants";

export type CreateInteractionEventInput = {
  actorUserId: string | null;
  storyId: string;
  groupId: string;
  eventType: InteractionEventType;
  sourceEntityType: SourceEntityType;
  sourceEntityId: string;
  idempotencyKey: string;
  sourceUrl?: string | null;
  targetUrl?: string | null;
  sourceCommentId?: string | null;
  parentCommentId?: string | null;
  metadataJson?: Record<string, unknown>;
  moderationStatus?: InteractionModerationStatus;
  spoilerLevel?: SpoilerLevel;
  sourceChapterOrder?: number | null;
};

export type InteractionEventResult = {
  eventId: string | null;
  created: boolean;
  skipped: boolean;
};

export async function createInteractionEvent(
  input: CreateInteractionEventInput
): Promise<InteractionEventResult> {
  try {
    const inserted = await db
      .insert(interactionEvents)
      .values({
        actorUserId: input.actorUserId,
        storyId: input.storyId,
        groupId: input.groupId,
        eventType: input.eventType,
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
        idempotencyKey: input.idempotencyKey,
        sourceUrl: input.sourceUrl ?? null,
        targetUrl: input.targetUrl ?? null,
        sourceCommentId: input.sourceCommentId ?? null,
        parentCommentId: input.parentCommentId ?? null,
        metadataJson: input.metadataJson ?? {},
        moderationStatus: input.moderationStatus ?? "approved",
        spoilerLevel: input.spoilerLevel ?? "none",
        sourceChapterOrder: input.sourceChapterOrder ?? null
      })
      .onConflictDoNothing({ target: interactionEvents.idempotencyKey })
      .returning({ id: interactionEvents.id });

    if (inserted[0]?.id) {
      return { eventId: inserted[0].id, created: true, skipped: false };
    }

    const existing = await db
      .select({ id: interactionEvents.id })
      .from(interactionEvents)
      .where(eq(interactionEvents.idempotencyKey, input.idempotencyKey))
      .limit(1);

    return {
      eventId: existing[0]?.id ?? null,
      created: false,
      skipped: true
    };
  } catch (error) {
    console.error("[community-sync] createInteractionEvent failed", error);
    return { eventId: null, created: false, skipped: true };
  }
}

export type ProjectFeedItemInput = {
  groupId: string;
  storyId: string;
  itemType: GroupFeedItemType;
  sourceEventId?: string | null;
  sourceCommentId?: string | null;
  title?: string | null;
  excerpt?: string | null;
  targetUrl?: string | null;
  sourceEntityType: SourceEntityType;
  sourceEntityId: string;
  score?: number;
  visibility?: GroupFeedVisibility;
  moderationStatus?: InteractionModerationStatus;
  spoilerLevel?: SpoilerLevel;
  sourceChapterOrder?: number | null;
};

export type ProjectFeedItemResult = {
  feedItemId: string | null;
  created: boolean;
  updated: boolean;
};

export async function projectEventToGroupFeedItem(
  input: ProjectFeedItemInput
): Promise<ProjectFeedItemResult> {
  const now = new Date();
  const score = String(input.score ?? 0);

  try {
    const inserted = await db
      .insert(groupFeedItems)
      .values({
        groupId: input.groupId,
        storyId: input.storyId,
        itemType: input.itemType,
        sourceEventId: input.sourceEventId ?? null,
        sourceCommentId: input.sourceCommentId ?? null,
        title: input.title ?? null,
        excerpt: input.excerpt ?? null,
        targetUrl: input.targetUrl ?? null,
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
        score,
        visibility: input.visibility ?? "visible",
        moderationStatus: input.moderationStatus ?? "approved",
        spoilerLevel: input.spoilerLevel ?? "none",
        sourceChapterOrder: input.sourceChapterOrder ?? null,
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoNothing({
        target: [
          groupFeedItems.groupId,
          groupFeedItems.sourceEntityType,
          groupFeedItems.sourceEntityId,
          groupFeedItems.itemType
        ]
      })
      .returning({ id: groupFeedItems.id });

    if (inserted[0]?.id) {
      return { feedItemId: inserted[0].id, created: true, updated: false };
    }

    const updated = await db
      .update(groupFeedItems)
      .set({
        sourceEventId: input.sourceEventId ?? null,
        excerpt: input.excerpt ?? null,
        score,
        updatedAt: now,
        visibility: input.visibility ?? "visible",
        moderationStatus: input.moderationStatus ?? "approved"
      })
      .where(
        and(
          eq(groupFeedItems.groupId, input.groupId),
          eq(groupFeedItems.sourceEntityType, input.sourceEntityType),
          eq(groupFeedItems.sourceEntityId, input.sourceEntityId),
          eq(groupFeedItems.itemType, input.itemType)
        )
      )
      .returning({ id: groupFeedItems.id });

    if (updated[0]?.id) {
      return { feedItemId: updated[0].id, created: false, updated: true };
    }

    return { feedItemId: null, created: false, updated: false };
  } catch (error) {
    console.error("[community-sync] projectEventToGroupFeedItem failed", error);
    return { feedItemId: null, created: false, updated: false };
  }
}

export async function countRecentInteractionEventsForSource(
  groupId: string,
  sourceEntityType: SourceEntityType,
  sourceEntityId: string,
  windowMinutes: number
) {
  const since = new Date(Date.now() - windowMinutes * 60_000);

  const rows = await db
    .select({ id: interactionEvents.id })
    .from(interactionEvents)
    .where(
      and(
        eq(interactionEvents.groupId, groupId),
        eq(interactionEvents.sourceEntityType, sourceEntityType),
        eq(interactionEvents.sourceEntityId, sourceEntityId),
        gte(interactionEvents.createdAt, since)
      )
    );

  return rows.length;
}

export async function upsertAggregatedFeedItem(input: {
  groupId: string;
  storyId: string;
  sourceEntityType: import("@/lib/community-sync/constants").SourceEntityType;
  sourceEntityId: string;
  commentCount: number;
  targetUrl?: string | null;
  sourceChapterOrder?: number | null;
  sourceEventId?: string | null;
}) {
  const { upsertAggregatedActivityFromBucket } = await import(
    "@/lib/community-sync/projection/aggregate-feed-item"
  );
  const { getCommunitySyncSettings } = await import("@/lib/community-sync/sync-settings");

  const settings = await getCommunitySyncSettings();

  return upsertAggregatedActivityFromBucket({
    bucket: {
      storyId: input.storyId,
      groupId: input.groupId,
      sourceEntityType: input.sourceEntityType,
      sourceEntityId: input.sourceEntityId,
      eventType: "comment_created"
    },
    storyId: input.storyId,
    groupId: input.groupId,
    windowMinutes: settings.collapseWindowMinutes,
    eventCount: input.commentCount,
    targetUrl: input.targetUrl,
    sourceChapterOrder: input.sourceChapterOrder,
    sourceEventId: input.sourceEventId
  });
}

export async function incrementStoryGroupActivityCount(groupId: string) {
  await db.execute(sql`
    update public.story_groups
    set activity_count = activity_count + 1,
        updated_at = now()
    where id = ${groupId}::uuid
  `);
}
