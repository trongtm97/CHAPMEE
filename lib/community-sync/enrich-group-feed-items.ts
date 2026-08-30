import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  buildAggregatedActivityTitle,
  buildSourceOriginLabel
} from "@/lib/community-sync/activity-feed-labels";
import { getCommunitySyncSettings } from "@/lib/community-sync/sync-settings";
import type { GroupFeedItemView } from "@/types/story-community-sync";

export type EnrichedGroupFeedItemView = GroupFeedItemView & {
  actorName: string | null;
  actorUsername: string | null;
  sourceLabel: string;
  displayTitle: string | null;
  isAuthorReply: boolean;
};

type CommentActorRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};

export async function enrichGroupFeedItems(
  items: GroupFeedItemView[]
): Promise<EnrichedGroupFeedItemView[]> {
  if (!items.length) {
    return [];
  }

  const commentIds = items
    .map((item) => item.sourceCommentId)
    .filter((id): id is string => Boolean(id));

  const reviewIds = items
    .filter((item) => item.itemType === "review")
    .map((item) => item.sourceEntityId)
    .filter((id): id is string => Boolean(id));

  let actors = new Map<string, CommentActorRow>();
  let reviewActors = new Map<string, CommentActorRow>();

  if (commentIds.length) {
    const { rows } = await db.execute(sql`
      select c.id, p.display_name, p.username
      from public.comments c
      left join public.profiles p on p.id = c.user_id
      where c.id = any(${commentIds}::uuid[])
    `);

    actors = new Map(
      (rows as Array<{ id: string; display_name: string | null; username: string | null }>).map(
        (row) => [
          row.id,
          {
            id: row.id,
            display_name: row.display_name,
            username: row.username
          }
        ]
      )
    );
  }

  if (reviewIds.length) {
    const { rows } = await db.execute(sql`
      select r.id, p.display_name, p.username
      from public.story_reviews r
      left join public.profiles p on p.id = r.reviewer_profile_id
      where r.id = any(${reviewIds}::uuid[])
    `);

    reviewActors = new Map(
      (rows as Array<{ id: string; display_name: string | null; username: string | null }>).map(
        (row) => [
          row.id,
          {
            id: row.id,
            display_name: row.display_name,
            username: row.username
          }
        ]
      )
    );
  }

  const settings = await getCommunitySyncSettings();

  return items.map((item) => {
    const actor = item.sourceCommentId
      ? actors.get(item.sourceCommentId)
      : item.itemType === "review"
        ? reviewActors.get(item.sourceEntityId)
        : null;
    const actorName =
      actor?.display_name?.trim() ||
      actor?.username?.trim() ||
      (item.itemType === "author_reply" ? "Tác giả" : "Độc giả ChapMee");
    const sourceLabel = buildSourceOriginLabel({
      sourceEntityType: item.sourceEntityType,
      sourceChapterOrder: item.sourceChapterOrder,
      itemType: item.itemType
    });

    const displayTitle =
      item.itemType === "aggregated_comments"
        ? buildAggregatedActivityTitle({
            sourceChapterOrder: item.sourceChapterOrder,
            excerpt: item.excerpt,
            collapseWindowMinutes: settings.collapseWindowMinutes,
            title: item.title
          })
        : item.title;

    return {
      ...item,
      actorName,
      actorUsername: actor?.username ?? null,
      sourceLabel,
      displayTitle,
      isAuthorReply: item.itemType === "author_reply"
    };
  });
}
