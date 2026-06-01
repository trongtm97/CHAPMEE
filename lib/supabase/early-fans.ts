import { createClient } from "@/lib/supabase/server";
import type { EarlyFanAwardNotice, EarlyFanStoryItem } from "@/types/early-fan";

export const EARLY_FAN_MAX_READS = 1000;
export const EARLY_FAN_MAX_FOLLOWERS = 100;
export const EARLY_FAN_DAYS = 7;

type PublicStoryEarlyFanStatsRow = {
  story_id: string | null;
  story_title: string | null;
  story_slug: string | null;
  story_created_at: string | null;
  read_count: number | null;
  follower_count: number | null;
  save_count: number | null;
  early_fan_count: number | null;
};

type AwardStoryEarlyFanRow = {
  awarded: boolean | null;
  already_awarded: boolean | null;
  eligible: boolean | null;
  story_id: string | null;
  story_title: string | null;
  story_slug: string | null;
  story_created_at: string | null;
  read_count: number | null;
  follower_count: number | null;
  save_count: number | null;
  awarded_at: string | null;
  reads_at_award: number | null;
  followers_at_award: number | null;
};

type ReaderEarlyFanRow = {
  id: string;
  awarded_at: string;
  reads_at_award: number | null;
  followers_at_award: number | null;
  stories:
    | {
        id: string;
        title: string;
        slug: string;
        public_code: string;
        cover_url: string | null;
        hook: string | null;
      }
    | {
        id: string;
        title: string;
        slug: string;
        public_code: string;
        cover_url: string | null;
        hook: string | null;
      }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export function isEarlyFanEligible(input: {
  readCount: number;
  followerCount: number;
  storyCreatedAt: string | null;
}) {
  if (!input.storyCreatedAt) {
    return input.readCount < EARLY_FAN_MAX_READS || input.followerCount < EARLY_FAN_MAX_FOLLOWERS;
  }

  const createdAt = new Date(input.storyCreatedAt).getTime();
  if (Number.isNaN(createdAt)) {
    return input.readCount < EARLY_FAN_MAX_READS || input.followerCount < EARLY_FAN_MAX_FOLLOWERS;
  }

  const daysSinceCreated = Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000));
  return (
    input.readCount < EARLY_FAN_MAX_READS ||
    input.followerCount < EARLY_FAN_MAX_FOLLOWERS ||
    daysSinceCreated <= EARLY_FAN_DAYS
  );
}

export async function getPublicStoryEarlyFanStats(storyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_story_early_fan_stats", {
    input_story_id: storyId
  });

  if (error) {
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as PublicStoryEarlyFanStatsRow | null;

  if (!row?.story_id) {
    return null;
  }

  return {
    storyId: row.story_id,
    storyTitle: row.story_title,
    storySlug: row.story_slug,
    storyCreatedAt: row.story_created_at,
    readCount: Number(row.read_count ?? 0),
    followerCount: Number(row.follower_count ?? 0),
    saveCount: Number(row.save_count ?? 0),
    earlyFanCount: Number(row.early_fan_count ?? 0)
  };
}

export async function awardStoryEarlyFanForStory(input: {
  storyId: string;
  userId: string;
}): Promise<{
  notice: EarlyFanAwardNotice | null;
  alreadyAwarded: boolean;
  eligible: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("award_story_early_fan", {
    input_story_id: input.storyId,
    input_user_id: input.userId
  });

  if (error) {
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as AwardStoryEarlyFanRow | null;

  if (!row) {
    return { notice: null, alreadyAwarded: false, eligible: false };
  }

  const notice =
    row.awarded && row.story_id && row.story_slug && row.story_title && row.awarded_at
      ? {
          storyId: row.story_id,
          storySlug: row.story_slug,
          storyTitle: row.story_title,
          awardedAt: row.awarded_at,
          readsAtAward: Number(row.reads_at_award ?? 0),
          followersAtAward: Number(row.followers_at_award ?? 0)
        }
      : null;

  return {
    notice,
    alreadyAwarded: Boolean(row.already_awarded),
    eligible: Boolean(row.eligible)
  };
}

export async function getReaderEarlyFanStories(userId: string): Promise<EarlyFanStoryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("story_early_fans")
    .select("id, awarded_at, reads_at_award, followers_at_award, stories(id, title, slug, public_code, cover_url, hook)")
    .eq("user_id", userId)
    .order("awarded_at", { ascending: false })
    .limit(6);

  if (error) {
    throw error;
  }

  return ((data ?? []) as ReaderEarlyFanRow[])
    .map((row) => {
      const story = firstRelation(row.stories);

      if (!story) {
        return null;
      }

      return {
        id: row.id,
        storyId: story.id,
        slug: story.slug,
        publicCode: story.public_code,
        title: story.title,
        coverUrl: story.cover_url,
        hook: story.hook,
        awardedAt: row.awarded_at,
        readsAtAward: Number(row.reads_at_award ?? 0),
        followersAtAward: Number(row.followers_at_award ?? 0)
      };
    })
    .filter((item): item is EarlyFanStoryItem => Boolean(item));
}
