import type { FanScoreEventKey, FanScoreType } from "@/types/fan";

export const FAN_SCORE_POINTS: Record<FanScoreEventKey, number> = {
  follow_story: 10,
  follow_author: 10,
  save_story: 8,
  like_content: 2,
  comment: 5,
  reply_comment: 3,
  vote_poll: 3,
  chapter_reaction: 3,
  share_clicked: 5,
  share_copied: 5,
  read_chapter: 1
} as const;

export function getFanScorePoints(eventKey: FanScoreEventKey) {
  return FAN_SCORE_POINTS[eventKey];
}

export function buildFanScoreDedupeKey(input: {
  eventKey: FanScoreEventKey;
  scopeId: string;
  scopeType: FanScoreType;
  sourceId?: string | null;
  userId: string;
}) {
  return [
    input.scopeType,
    input.eventKey,
    input.userId,
    input.scopeId,
    input.sourceId ?? input.scopeId
  ].join(":");
}

export async function recordFanScoreFromClient(input: {
  eventKey: FanScoreEventKey;
  storyId?: string | null;
  authorId?: string | null;
  sourceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (typeof window === "undefined") {
    return { awarded: false, error: "client_only" };
  }

  try {
    const response = await fetch("/api/fan-scores/record", {
      body: JSON.stringify(input),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    return (await response.json()) as {
      awarded: boolean;
      error: string | null;
    };
  } catch (error) {
    return {
      awarded: false,
      error: error instanceof Error ? error.message : "fan_score_record_failed"
    };
  }
}
