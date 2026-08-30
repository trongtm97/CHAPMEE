import { sql } from "drizzle-orm";
import { truncateExcerpt } from "@/lib/community-sync/comment-context";
import {
  GROUP_FEED_ITEM_TYPES,
  INTERACTION_EVENT_TYPES,
  SOURCE_ENTITY_TYPES
} from "@/lib/community-sync/constants";
import { resolveChapterTargetUrl } from "@/lib/community-sync/adapters/resolve-sync-target-url";
import {
  createInteractionEvent,
  incrementStoryGroupActivityCount,
  projectEventToGroupFeedItem
} from "@/lib/community-sync/interaction-events";
import { getCommunitySyncSettings } from "@/lib/community-sync/sync-settings";
import { getOrCreateStoryGroup } from "@/lib/community-sync/story-groups";
import { db } from "@/lib/db";

export type StoryReviewSyncInput = {
  reviewId: string;
  storyId: string;
  actorUserId: string;
  title: string | null;
  body: string | null;
};

export type StoryReviewSyncResult = {
  synced: boolean;
  skippedReason?: string;
  eventId?: string | null;
  feedItemId?: string | null;
};

function hasMeaningfulReviewText(title: string | null, body: string | null) {
  return Boolean(title?.trim() || body?.trim());
}

export async function syncStoryReviewToGroup(
  input: StoryReviewSyncInput
): Promise<StoryReviewSyncResult> {
  const settings = await getCommunitySyncSettings();

  if (!settings.syncReviews) {
    return { synced: false, skippedReason: "review_sync_disabled" };
  }

  if (!input.storyId?.trim()) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[community-sync/review] skip: missing story_id", input.reviewId);
    }
    return { synced: false, skippedReason: "missing_story_id" };
  }

  if (!hasMeaningfulReviewText(input.title, input.body)) {
    return { synced: false, skippedReason: "rating_only" };
  }

  const excerptSource = [input.title?.trim(), input.body?.trim()].filter(Boolean).join(" — ");
  if (excerptSource.length < settings.minCommentLengthToSurface) {
    return { synced: false, skippedReason: "too_short" };
  }

  const groupResult = await getOrCreateStoryGroup(input.storyId);
  if (!groupResult.group) {
    return { synced: false, skippedReason: groupResult.error ?? "no_group" };
  }

  const group = groupResult.group;
  const targetUrl = await resolveChapterTargetUrl({ storyId: input.storyId });
  const excerpt = truncateExcerpt(excerptSource, 200);

  const event = await createInteractionEvent({
    actorUserId: input.actorUserId,
    storyId: input.storyId,
    groupId: group.id,
    eventType: INTERACTION_EVENT_TYPES.reviewCreated,
    sourceEntityType: SOURCE_ENTITY_TYPES.review,
    sourceEntityId: input.reviewId,
    idempotencyKey: `${INTERACTION_EVENT_TYPES.reviewCreated}:review:${input.reviewId}`,
    targetUrl,
    metadataJson: {
      surface: "story_review",
      title: input.title,
      excerpt
    }
  });

  const projection = await projectEventToGroupFeedItem({
    groupId: group.id,
    storyId: input.storyId,
    itemType: GROUP_FEED_ITEM_TYPES.review,
    sourceEventId: event.eventId,
    sourceCommentId: null,
    excerpt,
    targetUrl,
    sourceEntityType: SOURCE_ENTITY_TYPES.review,
    sourceEntityId: input.reviewId,
    score: 25,
    visibility: "visible",
    moderationStatus: "approved",
    spoilerLevel: "none",
    sourceChapterOrder: null
  });

  if (event.created && projection.feedItemId) {
    await incrementStoryGroupActivityCount(group.id);
  }

  return {
    synced: true,
    eventId: event.eventId,
    feedItemId: projection.feedItemId
  };
}

/** Count feed presence by source for filter chips. */
export async function getStoryGroupFeedFilterPresence(storyId: string) {
  const { rows } = await db.execute(sql`
    select source_entity_type, item_type, count(*)::int as count
    from public.group_feed_items
    where story_id = ${storyId}::uuid
      and visibility = 'visible'
      and moderation_status = 'approved'
    group by source_entity_type, item_type
  `);

  const typed = rows as Array<{ source_entity_type: string; item_type: string; count: number }>;

  const hasSource = (type: string) =>
    typed.some((row) => row.source_entity_type === type && row.count > 0);

  const hasReviewItems =
    typed.some((row) => row.item_type === GROUP_FEED_ITEM_TYPES.review && row.count > 0) ||
    hasSource(SOURCE_ENTITY_TYPES.review);

  return {
    hasChapters:
      hasSource(SOURCE_ENTITY_TYPES.chapter) ||
      hasSource(SOURCE_ENTITY_TYPES.comment) ||
      hasSource(SOURCE_ENTITY_TYPES.story),
    hasReels: hasSource(SOURCE_ENTITY_TYPES.reel),
    hasAudio: hasSource(SOURCE_ENTITY_TYPES.audioEpisode),
    hasFilms:
      hasSource(SOURCE_ENTITY_TYPES.adaptationEpisode) ||
      hasSource(SOURCE_ENTITY_TYPES.trailer),
    hasReviews: hasReviewItems
  };
}
