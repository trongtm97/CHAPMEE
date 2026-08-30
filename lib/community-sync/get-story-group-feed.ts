import { and, desc, eq, inArray, isNotNull, lt, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { groupFeedItems, storyGroups } from "@/lib/db/schema/story-community-sync";
import {
  decodeStoryGroupFeedCursor,
  encodeStoryGroupFeedCursor
} from "@/lib/community-sync/group-feed-cursor";
import {
  GROUP_FEED_ITEM_TYPES,
  SOURCE_ENTITY_TYPES,
  type SourceEntityType
} from "@/lib/community-sync/constants";
import type { GroupFeedItemView, StoryGroupFeedPageResult } from "@/types/story-community-sync";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type GetStoryGroupFeedParams = {
  storyId?: string;
  groupId?: string;
  cursor?: string | null;
  limit?: number;
  sourceEntityType?: SourceEntityType | null;
  sourceEntityTypes?: SourceEntityType[] | null;
  chapterOnly?: boolean;
  chapterSourceOnly?: boolean;
  reviewOnly?: boolean;
  visibility?: string | null;
  moderationStatus?: string | null;
};

function clampLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT);
}

function mapFeedItem(row: typeof groupFeedItems.$inferSelect): GroupFeedItemView {
  return {
    id: row.id,
    groupId: row.groupId,
    storyId: row.storyId,
    itemType: row.itemType,
    sourceEventId: row.sourceEventId,
    sourceCommentId: row.sourceCommentId,
    title: row.title,
    excerpt: row.excerpt,
    targetUrl: row.targetUrl,
    sourceEntityType: row.sourceEntityType as SourceEntityType,
    sourceEntityId: row.sourceEntityId,
    score: Number(row.score ?? 0),
    visibility: row.visibility as GroupFeedItemView["visibility"],
    moderationStatus: row.moderationStatus as GroupFeedItemView["moderationStatus"],
    spoilerLevel: row.spoilerLevel as GroupFeedItemView["spoilerLevel"],
    sourceChapterOrder: row.sourceChapterOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

async function resolveGroupId(params: GetStoryGroupFeedParams) {
  if (params.groupId) {
    return params.groupId;
  }

  if (!params.storyId) {
    return null;
  }

  const rows = await db
    .select({ id: storyGroups.id })
    .from(storyGroups)
    .where(eq(storyGroups.storyId, params.storyId))
    .limit(1);

  return rows[0]?.id ?? null;
}

export async function getStoryGroupFeed(
  params: GetStoryGroupFeedParams
): Promise<StoryGroupFeedPageResult> {
  const limit = clampLimit(params.limit);
  const groupId = await resolveGroupId(params);

  if (!groupId) {
    return {
      items: [],
      nextCursor: null,
      hasMore: false,
      groupId: null,
      storyId: params.storyId ?? null,
      error: "Story group not found."
    };
  }

  const decoded = decodeStoryGroupFeedCursor(params.cursor);
  const visibilityFilter = params.visibility ?? "visible";
  const moderationFilter = params.moderationStatus ?? "approved";

  const conditions = [
    eq(groupFeedItems.groupId, groupId),
    eq(groupFeedItems.visibility, visibilityFilter),
    eq(groupFeedItems.moderationStatus, moderationFilter)
  ];

  if (params.sourceEntityType) {
    conditions.push(eq(groupFeedItems.sourceEntityType, params.sourceEntityType));
  }

  if (params.sourceEntityTypes?.length) {
    conditions.push(inArray(groupFeedItems.sourceEntityType, params.sourceEntityTypes));
  }

  if (params.chapterOnly) {
    conditions.push(isNotNull(groupFeedItems.sourceChapterOrder));
  }

  if (params.chapterSourceOnly) {
    conditions.push(
      inArray(groupFeedItems.sourceEntityType, [
        SOURCE_ENTITY_TYPES.chapter,
        SOURCE_ENTITY_TYPES.story,
        SOURCE_ENTITY_TYPES.comment
      ])
    );
  }

  if (params.reviewOnly) {
    conditions.push(
      or(
        eq(groupFeedItems.itemType, GROUP_FEED_ITEM_TYPES.review),
        eq(groupFeedItems.sourceEntityType, SOURCE_ENTITY_TYPES.review)
      )!
    );
  }

  if (decoded) {
    conditions.push(
      or(
        lt(groupFeedItems.createdAt, new Date(decoded.createdAt)),
        and(
          eq(groupFeedItems.createdAt, new Date(decoded.createdAt)),
          lt(groupFeedItems.id, decoded.id)
        )
      )!
    );
  }

  const rows = await db
    .select()
    .from(groupFeedItems)
    .where(and(...conditions))
    .orderBy(desc(groupFeedItems.createdAt), desc(groupFeedItems.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const last = pageRows[pageRows.length - 1];

  const storyId =
    params.storyId ??
    (
      await db
        .select({ storyId: storyGroups.storyId })
        .from(storyGroups)
        .where(eq(storyGroups.id, groupId))
        .limit(1)
    )[0]?.storyId ??
    null;

  return {
    items: pageRows.map(mapFeedItem),
    nextCursor:
      hasMore && last
        ? encodeStoryGroupFeedCursor({
            createdAt: last.createdAt.toISOString(),
            id: last.id
          })
        : null,
    hasMore,
    groupId,
    storyId,
    error: null
  };
}

export async function getStoryGroupFeedByStoryId(
  storyId: string,
  params?: Omit<GetStoryGroupFeedParams, "storyId" | "groupId">
) {
  return getStoryGroupFeed({ ...params, storyId });
}
