import { getSiteOrigin } from "@/lib/brand/site-origin";
import { createClient } from "@/lib/data/server";
import { getMilestoneDefinition } from "@/lib/milestones/milestone-definitions";
import { createNotification } from "@/lib/notifications/create-notification";
import type {
  MilestoneRecord,
  MilestoneToastNotice,
  MilestoneType,
  MilestoneViewItem
} from "@/types/milestone";

type MilestoneRow = {
  id: string;
  user_id: string;
  milestone_key: string;
  milestone_type: MilestoneType;
  title: string;
  description: string;
  related_story_id: string | null;
  related_author_id: string | null;
  related_comment_id: string | null;
  value: number | string | null;
  metadata: Record<string, unknown> | null;
  achieved_at: string;
  created_at: string;
};

function toMilestoneRecord(row: MilestoneRow): MilestoneRecord {
  return {
    id: row.id,
    userId: row.user_id,
    milestoneKey: row.milestone_key,
    milestoneType: row.milestone_type,
    title: row.title,
    description: row.description,
    relatedStoryId: row.related_story_id,
    relatedAuthorId: row.related_author_id,
    relatedCommentId: row.related_comment_id,
    value: row.value === null ? null : Number(row.value),
    metadata: row.metadata,
    achievedAt: row.achieved_at,
    createdAt: row.created_at
  };
}

function getMilestoneTone(milestoneType: MilestoneType) {
  switch (milestoneType) {
    case "author":
      return "warning";
    case "story":
      return "success";
    case "comment":
      return "danger";
    case "reader":
      return "success";
    default:
      return "default";
  }
}

function getMilestoneIcon(key: string) {
  return getMilestoneDefinition(key)?.icon ?? "🏅";
}

export function toMilestoneViewItems(items: MilestoneRecord[]): MilestoneViewItem[] {
  return items.map((item) => ({
    ...item,
    icon: getMilestoneIcon(item.milestoneKey),
    tone: getMilestoneTone(item.milestoneType),
    achievedLabel: new Date(item.achievedAt).toLocaleDateString("vi-VN")
  }));
}

export function buildMilestoneToastNotice(input: {
  title: string;
  description: string;
  href?: string | null;
}): MilestoneToastNotice {
  return {
    title: input.title,
    description: input.description,
    href: input.href ?? "/me#milestones"
  };
}

export function appendMilestoneToastParams(
  returnTo: string,
  notice: MilestoneToastNotice
) {
  const url = new URL(returnTo, getSiteOrigin());
  url.searchParams.set("milestone", "1");
  url.searchParams.set("milestoneTitle", notice.title);
  url.searchParams.set("milestoneDescription", notice.description);
  url.searchParams.set("milestoneHref", notice.href);
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function awardMilestone(input: {
  userId: string;
  milestoneKey: string;
  relatedStoryId?: string | null;
  relatedAuthorId?: string | null;
  relatedCommentId?: string | null;
  value?: number | null;
  metadata?: Record<string, unknown> | null;
}) {
  const definition = getMilestoneDefinition(input.milestoneKey);

  if (!definition) {
    return { alreadyAwarded: false, awarded: false, milestone: null as MilestoneRecord | null };
  }

  const db = await createClient();
  const payload = {
    user_id: input.userId,
    milestone_key: input.milestoneKey,
    milestone_type: definition.milestoneType,
    title: definition.title,
    description: definition.description,
    related_story_id: input.relatedStoryId ?? null,
    related_author_id: input.relatedAuthorId ?? null,
    related_comment_id: input.relatedCommentId ?? null,
    value: input.value ?? null,
    metadata: input.metadata ?? {}
  };

  const { data, error } = await db
    .from("user_milestones")
    .insert(payload)
    .select(
      "id, user_id, milestone_key, milestone_type, title, description, related_story_id, related_author_id, related_comment_id, value, metadata, achieved_at, created_at"
    )
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { alreadyAwarded: true, awarded: false, milestone: null as MilestoneRecord | null };
    }

    throw error;
  }

  if (!data) {
    return {
      alreadyAwarded: true,
      awarded: false,
      milestone: null
    };
  }

  const createdMilestone = toMilestoneRecord(data as MilestoneRow);

  await createNotification(input.userId, "milestone_achieved", {
    actionUrl: "/me#milestones",
    body: createdMilestone.description,
    dedupeWindowMinutes: 1_440,
    metadata: {
      milestone_key: createdMilestone.milestoneKey,
      milestone_type: createdMilestone.milestoneType,
      related_author_id: createdMilestone.relatedAuthorId,
      related_story_id: createdMilestone.relatedStoryId
    },
    targetId: createdMilestone.id,
    targetType: "milestone",
    title: `Bạn vừa đạt cột mốc: ${createdMilestone.title}`
  });

  return {
    alreadyAwarded: false,
    awarded: true,
    milestone: createdMilestone
  };
}

export async function getUserMilestones(input: {
  userId: string;
  type?: MilestoneType | MilestoneType[];
  limit?: number;
}): Promise<MilestoneRecord[]> {
  const db = await createClient();
  const query = db
    .from("user_milestones")
    .select(
      "id, user_id, milestone_key, milestone_type, title, description, related_story_id, related_author_id, related_comment_id, value, metadata, achieved_at, created_at"
    )
    .eq("user_id", input.userId)
    .order("achieved_at", { ascending: false })
    .limit(input.limit ?? 5);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const types = input.type
    ? Array.isArray(input.type)
      ? input.type
      : [input.type]
    : null;

  return ((data ?? []) as MilestoneRow[])
    .filter((row) => !types || types.includes(row.milestone_type))
    .map(toMilestoneRecord);
}

export async function syncReaderMilestones(input: {
  userId: string;
  savedStoriesCount: number;
  followingAuthorsCount: number;
  commentCount: number;
  earlyFanStories: Array<{ storyId: string; title: string; slug: string }>;
  topFanStories: Array<{ storyId: string; storyTitle?: string | null; rank: number }>;
}) {
  const results = await Promise.all([
    input.savedStoriesCount > 0
      ? awardMilestone({
          userId: input.userId,
          milestoneKey: "first_saved_story",
          metadata: { saved_stories_count: input.savedStoriesCount }
        })
      : Promise.resolve(null),
    input.followingAuthorsCount > 0
      ? awardMilestone({
          userId: input.userId,
          milestoneKey: "first_followed_author",
          metadata: { following_authors_count: input.followingAuthorsCount }
        })
      : Promise.resolve(null),
    input.commentCount > 0
      ? awardMilestone({
          userId: input.userId,
          milestoneKey: "first_comment",
          metadata: { comment_count: input.commentCount }
        })
      : Promise.resolve(null),
    Promise.all(
      input.earlyFanStories.map((story) =>
        awardMilestone({
          userId: input.userId,
          milestoneKey: "became_early_fan",
          relatedStoryId: story.storyId,
          metadata: {
            story_id: story.storyId,
            story_slug: story.slug,
            story_title: story.title
          }
        })
      )
    ),
    Promise.all(
      input.topFanStories
        .filter((story) => story.rank === 1)
        .map((story) =>
          awardMilestone({
            userId: input.userId,
            milestoneKey: "top_fan_story",
            relatedStoryId: story.storyId,
            metadata: {
              story_id: story.storyId,
              story_title: story.storyTitle ?? null,
              rank: story.rank
            }
          })
        )
    )
  ]);

  return results;
}

export async function syncAuthorMilestones(input: {
  userId: string;
  creatorProfileId?: string | null;
  followerCount: number;
  storyCount: number;
  pinnedCommentReceived?: boolean;
}) {
  const results = await Promise.all([
    input.storyCount > 0
      ? awardMilestone({
          userId: input.userId,
          milestoneKey: "first_story_published",
          relatedAuthorId: input.creatorProfileId ?? null,
          metadata: { story_count: input.storyCount }
        })
      : Promise.resolve(null),
    input.followerCount >= 100
      ? awardMilestone({
          userId: input.userId,
          milestoneKey: "first_100_followers",
          relatedAuthorId: input.creatorProfileId ?? null,
          value: input.followerCount,
          metadata: { follower_count: input.followerCount }
        })
      : Promise.resolve(null),
    input.pinnedCommentReceived
      ? awardMilestone({
          userId: input.userId,
          milestoneKey: "pinned_comment_received",
          relatedAuthorId: input.creatorProfileId ?? null,
          metadata: { pinned: true }
        })
      : Promise.resolve(null)
  ]);

  return results;
}

export async function syncStoryReadMilestones(input: {
  userId: string;
  storyId: string;
  storyTitle: string;
  readCount: number;
}) {
  const thresholds = [
    { key: "story_100_reads", threshold: 100 },
    { key: "story_1000_reads", threshold: 1000 },
    { key: "story_10000_reads", threshold: 10000 }
  ] as const;

  const eligible = thresholds.filter((item) => input.readCount >= item.threshold);

  const results = await Promise.all(
    eligible.map((item) =>
      awardMilestone({
        userId: input.userId,
        milestoneKey: item.key,
        relatedStoryId: input.storyId,
        value: input.readCount,
        metadata: {
          story_id: input.storyId,
          story_title: input.storyTitle,
          read_count: input.readCount,
          threshold: item.threshold
        }
      })
    )
  );

  await Promise.all(
    results
      .filter((result) => result?.awarded)
      .map(() =>
        createNotification(input.userId, "story_reached_reads_milestone", {
          actionUrl: "/me#milestones",
          body: `Truyện "${input.storyTitle}" vừa đạt ${input.readCount.toLocaleString("vi-VN")} lượt đọc.`,
          dedupeWindowMinutes: 240,
          metadata: {
            read_count: input.readCount,
            story_id: input.storyId,
            story_title: input.storyTitle
          },
          targetId: input.storyId,
          targetType: "story",
          title: "Truyện của bạn đạt cột mốc lượt đọc mới"
        })
      )
  );

  return results;
}
