import { truncateExcerpt } from "@/lib/community-sync/comment-context";
import { GROUP_FEED_ITEM_TYPES } from "@/lib/community-sync/constants";
import { projectEventToGroupFeedItem } from "@/lib/community-sync/interaction-events";
import {
  buildAggregatedExcerpt,
  getLatestEventInBucket,
  pickSafeLatestExcerpt,
  windowStart
} from "@/lib/community-sync/projection/aggregation-bucket";
import type {
  AggregatedActivityMetadata,
  AggregationBucket
} from "@/lib/community-sync/projection/types";

export type UpsertAggregatedActivityInput = {
  bucket: AggregationBucket;
  storyId: string;
  groupId: string;
  commentCount: number;
  windowMinutes: number;
  targetUrl?: string | null;
  sourceChapterOrder?: number | null;
  sourceEventId?: string | null;
  latestCommentId?: string | null;
  latestActorUserId?: string | null;
  latestExcerpt?: string | null;
  visibility?: "visible" | "hidden" | "moderated" | "deleted";
  moderationStatus?: "pending" | "approved" | "flagged" | "hidden" | "rejected";
};

export async function upsertAggregatedActivityItem(input: UpsertAggregatedActivityInput) {
  const windowEnd = new Date();
  const windowStartedAt = windowStart(input.windowMinutes);
  const count = input.commentCount;
  const excerpt = buildAggregatedExcerpt(count, input.windowMinutes);
  const score = Math.min(100, 12 + count * 3);

  const metadata: AggregatedActivityMetadata = {
    count,
    windowMinutes: input.windowMinutes,
    windowStartedAt: windowStartedAt.toISOString(),
    windowEndedAt: windowEnd.toISOString(),
    latestActorUserId: input.latestActorUserId ?? null,
    latestCommentId: input.latestCommentId ?? null,
    latestExcerpt: input.latestExcerpt ?? null,
    targetUrl: input.targetUrl ?? null
  };

  return projectEventToGroupFeedItem({
    groupId: input.groupId,
    storyId: input.storyId,
    itemType: GROUP_FEED_ITEM_TYPES.aggregatedComments,
    sourceEventId: input.sourceEventId ?? null,
    sourceCommentId: input.latestCommentId ?? null,
    title: JSON.stringify(metadata),
    excerpt,
    targetUrl: input.targetUrl ?? null,
    sourceEntityType: input.bucket.sourceEntityType,
    sourceEntityId: input.bucket.sourceEntityId,
    score,
    sourceChapterOrder: input.sourceChapterOrder ?? null,
    visibility: input.visibility ?? "visible",
    moderationStatus: input.moderationStatus ?? "approved"
  });
}

export async function upsertAggregatedActivityFromBucket(input: {
  bucket: AggregationBucket;
  storyId: string;
  groupId: string;
  windowMinutes: number;
  eventCount: number;
  targetUrl?: string | null;
  sourceChapterOrder?: number | null;
  sourceEventId?: string | null;
  visibility?: UpsertAggregatedActivityInput["visibility"];
  moderationStatus?: UpsertAggregatedActivityInput["moderationStatus"];
}) {
  const latest = await getLatestEventInBucket(input.bucket, input.windowMinutes);
  const metadataExcerpt =
    typeof latest?.metadata_json?.excerpt === "string"
      ? latest.metadata_json.excerpt
      : null;

  return upsertAggregatedActivityItem({
    bucket: input.bucket,
    storyId: input.storyId,
    groupId: input.groupId,
    commentCount: input.eventCount,
    windowMinutes: input.windowMinutes,
    targetUrl: input.targetUrl ?? latest?.target_url ?? null,
    sourceChapterOrder: input.sourceChapterOrder ?? null,
    sourceEventId: input.sourceEventId ?? latest?.id ?? null,
    latestCommentId: latest?.source_comment_id ?? null,
    latestActorUserId: latest?.actor_user_id ?? null,
    latestExcerpt: pickSafeLatestExcerpt({
      excerpt: metadataExcerpt,
      spoilerLevel: latest?.spoiler_level ?? "none",
      moderationStatus: latest?.moderation_status ?? "approved"
    }),
    visibility: input.visibility,
    moderationStatus: input.moderationStatus
  });
}

export function buildIndividualExcerpt(content: string, excerptMax: number) {
  return truncateExcerpt(content, excerptMax);
}
