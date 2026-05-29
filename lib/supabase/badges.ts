import { createClient } from "@/lib/supabase/server";
import { getBadgeDefinition, rarityToTone } from "@/lib/badges/badge-definitions";
import type { BadgeDefinition, BadgeRecord, BadgeType, BadgeViewItem } from "@/types/badge";
import type { ProfileBadge } from "@/types/profile";

type BadgeRow = {
  id: string;
  key: string;
  name: string;
  description: string;
  type: BadgeType;
  icon: string;
  rarity: BadgeDefinition["rarity"];
};

type UserBadgeRow = {
  id: string;
  awarded_at: string;
  related_story_id: string | null;
  metadata: Record<string, unknown> | null;
  badges: BadgeRow | BadgeRow[] | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function daysSince(dateValue: string | null | undefined) {
  if (!dateValue) {
    return Number.POSITIVE_INFINITY;
  }

  const value = new Date(dateValue).getTime();
  if (Number.isNaN(value)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((Date.now() - value) / (24 * 60 * 60 * 1000));
}

function toBadgeRecord(row: UserBadgeRow): BadgeRecord | null {
  const badge = firstRelation(row.badges);

  if (!badge) {
    return null;
  }

  return {
    id: row.id,
    awardedAt: row.awarded_at,
    relatedStoryId: row.related_story_id,
    metadata: row.metadata,
    definition: {
      id: badge.id,
      key: badge.key,
      name: badge.name,
      description: badge.description,
      type: badge.type,
      icon: badge.icon,
      rarity: badge.rarity
    }
  };
}

export function toProfileBadgeChips(badges: BadgeRecord[]): ProfileBadge[] {
  return badges.slice(0, 4).map((badge) => ({
    label: badge.definition.name,
    tone: rarityToTone(badge.definition.rarity),
    description: badge.definition.description
  }));
}

export function toBadgeViewItems(badges: BadgeRecord[]): BadgeViewItem[] {
  return badges.map((badge) => ({
    ...badge,
    unlockLabel: new Date(badge.awardedAt).toLocaleDateString("vi-VN")
  }));
}

export async function awardBadge(input: {
  userId: string;
  badgeKey: string;
  relatedStoryId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const definition = getBadgeDefinition(input.badgeKey);

  if (!definition) {
    return { alreadyAwarded: false, awarded: false, badge: null };
  }

  const supabase = await createClient();
  const { data: badgeRow, error: badgeError } = await supabase
    .from("badges")
    .select("id, key, name, description, type, icon, rarity")
    .eq("key", input.badgeKey)
    .maybeSingle();

  if (badgeError) {
    throw badgeError;
  }

  if (!badgeRow) {
    return { alreadyAwarded: false, awarded: false, badge: null };
  }

  const payload = {
    badge_id: badgeRow.id,
    metadata: input.metadata ?? {},
    related_story_id: input.relatedStoryId ?? null,
    user_id: input.userId
  };

  const { data, error } = await supabase
    .from("user_badges")
    .insert(payload)
    .select("id, awarded_at, related_story_id, metadata, badges(id, key, name, description, type, icon, rarity)")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { alreadyAwarded: true, awarded: false, badge: null };
    }

    throw error;
  }

  const record = data ? toBadgeRecord(data as UserBadgeRow) : null;

  return {
    alreadyAwarded: false,
    awarded: Boolean(record),
    badge: record
  };
}

export async function getUserBadges(input: {
  userId: string;
  type?: BadgeType | BadgeType[];
}): Promise<BadgeRecord[]> {
  const supabase = await createClient();
  const query = supabase
    .from("user_badges")
    .select("id, awarded_at, related_story_id, metadata, badges(id, key, name, description, type, icon, rarity)")
    .eq("user_id", input.userId)
    .order("awarded_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const types = input.type
    ? Array.isArray(input.type)
      ? input.type
      : [input.type]
    : null;

  return ((data ?? []) as UserBadgeRow[])
    .map((row) => toBadgeRecord(row))
    .filter((item): item is BadgeRecord => Boolean(item))
    .filter((item) => !types || types.includes(item.definition.type));
}

export async function syncReaderBadges(input: {
  userId: string;
  createdAt?: string | null;
  savedStoriesCount: number;
  followingAuthorsCount: number;
  commentCount: number;
  commentLikeCount: number;
  earlyFanStories: Array<{ storyId: string; title: string; slug: string }>;
}) {
  const results = await Promise.all([
    daysSince(input.createdAt) <= 7
      ? awardBadge({ userId: input.userId, badgeKey: "reader_new" })
      : Promise.resolve(null),
    input.savedStoriesCount > 0
      ? awardBadge({ userId: input.userId, badgeKey: "story_saver" })
      : Promise.resolve(null),
    input.followingAuthorsCount > 0
      ? awardBadge({ userId: input.userId, badgeKey: "author_follower" })
      : Promise.resolve(null),
    input.commentCount >= 3
      ? awardBadge({
          userId: input.userId,
          badgeKey: "active_commenter",
          metadata: { comment_count: input.commentCount }
        })
      : Promise.resolve(null),
    input.commentLikeCount >= 3
      ? awardBadge({
          userId: input.userId,
          badgeKey: "top_comment_candidate",
          metadata: { comment_like_count: input.commentLikeCount }
        })
      : Promise.resolve(null),
    Promise.all(
      input.earlyFanStories.map((story) =>
        awardBadge({
          userId: input.userId,
          badgeKey: "early_fan",
          relatedStoryId: story.storyId,
          metadata: {
            story_id: story.storyId,
            story_slug: story.slug,
            story_title: story.title
          }
        })
      )
    )
  ]);

  return results;
}

export async function syncAuthorBadges(input: {
  userId: string;
  createdAt?: string | null;
  followerCount: number;
  storiesCount: number;
  totalReads: number;
  storyPublishedAts: Array<string | null>;
}) {
  const sortedPublishedAts = input.storyPublishedAts
    .filter((value): value is string => Boolean(value))
    .sort((first, second) => new Date(second).getTime() - new Date(first).getTime());

  const latestThree = sortedPublishedAts.slice(0, 3);
  const consistentWriter =
    latestThree.length >= 3 &&
    daysSince(latestThree[2]) <= 45 &&
    daysSince(latestThree[0]) <= 45;

  const results = await Promise.all([
    daysSince(input.createdAt) <= 14
      ? awardBadge({ userId: input.userId, badgeKey: "author_new" })
      : Promise.resolve(null),
    input.storiesCount > 0
      ? awardBadge({ userId: input.userId, badgeKey: "first_story" })
      : Promise.resolve(null),
    input.totalReads >= 100
      ? awardBadge({
          userId: input.userId,
          badgeKey: "first_100_reads",
          metadata: { total_reads: input.totalReads }
        })
      : Promise.resolve(null),
    input.totalReads >= 1000
      ? awardBadge({
          userId: input.userId,
          badgeKey: "first_1000_reads",
          metadata: { total_reads: input.totalReads }
        })
      : Promise.resolve(null),
    input.followerCount >= 100
      ? awardBadge({
          userId: input.userId,
          badgeKey: "loved_author",
          metadata: { follower_count: input.followerCount }
        })
      : Promise.resolve(null),
    consistentWriter
      ? awardBadge({
          userId: input.userId,
          badgeKey: "consistent_writer",
          metadata: { story_count: input.storiesCount }
        })
      : Promise.resolve(null)
  ]);

  return results;
}
