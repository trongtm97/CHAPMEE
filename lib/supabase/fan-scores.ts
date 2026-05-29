import { createClient } from "@/lib/supabase/server";
import { awardMilestone } from "@/lib/supabase/milestones";
import { createNotification } from "@/lib/notifications/create-notification";
import {
  buildFanScoreDedupeKey,
  getFanScorePoints
} from "@/lib/fans/fan-score";
import type {
  FanScoreEventKey,
  FanScoreType,
  TopFanHighlight,
  TopFanPerson
} from "@/types/fan";

type RecordFanScoreInput = {
  userId: string;
  eventKey: FanScoreEventKey;
  storyId?: string | null;
  authorId?: string | null;
  sourceId?: string | null;
  metadata?: Record<string, unknown>;
};

type RecordedFanScoreRow = {
  awarded: boolean | null;
  score: number | null;
  story_id: string | null;
  author_id: string | null;
  score_type: FanScoreType | null;
  last_calculated_at: string | null;
};

type TopFanPersonRow = {
  rank: number;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  score: number | null;
  is_current_user: boolean | null;
};

type TopFanHighlightRow = {
  id: string;
  rank: number;
  score: number | null;
  kind: FanScoreType;
  title: string | null;
  subtitle: string | null;
  href: string | null;
};

function normalizeScore(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function toTopFanPerson(row: TopFanPersonRow): TopFanPerson {
  return {
    id: row.user_id,
    rank: Number(row.rank ?? 0),
    score: normalizeScore(row.score),
    displayName: row.display_name ?? row.username ?? "ChapMee reader",
    handle: row.username ? `@${row.username}` : null,
    avatarUrl: row.avatar_url ?? null,
    isCurrentUser: Boolean(row.is_current_user)
  };
}

function toTopFanHighlight(row: TopFanHighlightRow): TopFanHighlight {
  return {
    id: row.id,
    rank: Number(row.rank ?? 0),
    score: normalizeScore(row.score),
    kind: row.kind,
    title: row.title ?? "Top Fan",
    subtitle: row.subtitle ?? null,
    href: row.href ?? null
  };
}

async function recordScopeFanScore(input: {
  userId: string;
  eventKey: FanScoreEventKey;
  points: number;
  scopeId: string;
  scopeType: FanScoreType;
  sourceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const dedupeKey = buildFanScoreDedupeKey({
    eventKey: input.eventKey,
    scopeId: input.scopeId,
    scopeType: input.scopeType,
    sourceId: input.sourceId,
    userId: input.userId
  });

  const { data, error } = await supabase.rpc("record_fan_score_event", {
    input_author_id: input.scopeType === "author" ? input.scopeId : null,
    input_dedupe_key: dedupeKey,
    input_event_key: input.eventKey,
    input_metadata: input.metadata ?? {},
    input_points: input.points,
    input_score_type: input.scopeType,
    input_source_id: input.sourceId ?? input.scopeId,
    input_story_id: input.scopeType === "story" ? input.scopeId : null,
    input_user_id: input.userId
  });

  if (error) {
    throw error;
  }

  return (Array.isArray(data) ? data[0] : data) as RecordedFanScoreRow | null;
}

export async function recordFanScoreAction(input: RecordFanScoreInput) {
  const points = getFanScorePoints(input.eventKey);
  const scopes: Array<{ scopeId: string; scopeType: FanScoreType }> = [];
  const previousStoryTopFan = input.storyId
    ? (await getStoryTopFans(input.storyId, null, 1))[0] ?? null
    : null;

  if (input.storyId) {
    scopes.push({ scopeId: input.storyId, scopeType: "story" });
  }

  if (input.authorId) {
    scopes.push({ scopeId: input.authorId, scopeType: "author" });
  }

  if (!scopes.length) {
    return [];
  }

  const results = await Promise.all(
    scopes.map((scope) =>
      recordScopeFanScore({
        eventKey: input.eventKey,
        metadata: input.metadata ?? {},
        points,
        scopeId: scope.scopeId,
        scopeType: scope.scopeType,
        sourceId: input.sourceId ?? scope.scopeId,
        userId: input.userId
      })
    )
  );

  if (input.storyId) {
    const supabase = await createClient();
    const [topFansResult, storyResult] = await Promise.all([
      getStoryTopFans(input.storyId, input.userId, 1),
      supabase.from("stories").select("id, title, slug").eq("id", input.storyId).maybeSingle()
    ]);

    const topFan = topFansResult[0];
    const storyRow = storyResult.data;

    if (topFan && topFan.id === input.userId && topFan.rank === 1 && storyRow) {
      await awardMilestone({
        userId: input.userId,
        milestoneKey: "top_fan_story",
        relatedStoryId: input.storyId,
        metadata: {
          rank: topFan.rank,
          story_id: input.storyId,
          story_title: storyRow.title
        }
      });

      if (!previousStoryTopFan || previousStoryTopFan.id !== input.userId) {
        await createNotification(input.userId, "became_top_fan", {
          actionUrl: storyRow.slug ? `/stories/${storyRow.slug}` : "/notifications",
          body: `Bạn vừa vươn lên Top Fan #1 của "${storyRow.title}".`,
          dedupeWindowMinutes: 720,
          metadata: {
            rank: 1,
            score: topFan.score,
            story_id: input.storyId,
            story_title: storyRow.title
          },
          targetId: input.storyId,
          targetType: "story",
          title: "Bạn đã trở thành Top Fan #1"
        });
      }
    }

    if (
      storyRow &&
      previousStoryTopFan &&
      topFan &&
      previousStoryTopFan.id !== topFan.id &&
      previousStoryTopFan.id !== input.userId
    ) {
      await createNotification(previousStoryTopFan.id, "top_fan_updated", {
        actorUserId: input.userId,
        actionUrl: storyRow.slug ? `/stories/${storyRow.slug}` : "/notifications",
        body: `Bảng xếp hạng Top Fan của "${storyRow.title}" vừa thay đổi.`,
        dedupeWindowMinutes: 120,
        metadata: {
          new_top_fan_user_id: topFan.id,
          previous_top_fan_user_id: previousStoryTopFan.id,
          story_id: input.storyId,
          story_title: storyRow.title
        },
        targetId: input.storyId,
        targetType: "story",
        title: "Top Fan vừa có cập nhật"
      });
    }
  }

  return results;
}

export async function getStoryTopFans(
  storyId: string,
  inputUserId?: string | null,
  limit = 5
): Promise<TopFanPerson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_story_top_fans", {
    input_limit: limit,
    input_story_id: storyId,
    input_user_id: inputUserId ?? null
  });

  if (error) {
    throw error;
  }

  return ((Array.isArray(data) ? data : []) as TopFanPersonRow[]).map(toTopFanPerson);
}

export async function getAuthorTopFans(
  authorId: string,
  inputUserId?: string | null,
  limit = 5
): Promise<TopFanPerson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_author_top_fans", {
    input_author_id: authorId,
    input_limit: limit,
    input_user_id: inputUserId ?? null
  });

  if (error) {
    throw error;
  }

  return ((Array.isArray(data) ? data : []) as TopFanPersonRow[]).map(toTopFanPerson);
}

export async function getUserTopFanHighlights(
  userId: string,
  limit = 5
): Promise<TopFanHighlight[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_user_top_fan_highlights", {
    input_limit: limit,
    input_user_id: userId
  });

  if (error) {
    throw error;
  }

  return ((Array.isArray(data) ? data : []) as TopFanHighlightRow[]).map(
    toTopFanHighlight
  );
}

export async function safeRecordFanScoreAction(input: RecordFanScoreInput) {
  try {
    await recordFanScoreAction(input);
  } catch {
    return;
  }
}
