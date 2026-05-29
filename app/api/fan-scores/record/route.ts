import { NextResponse } from "next/server";
import { recordFanScoreAction } from "@/lib/supabase/fan-scores";
import { createClient } from "@/lib/supabase/server";
import type { FanScoreEventKey } from "@/types/fan";

type RecordFanScoreRequest = {
  eventKey?: FanScoreEventKey;
  storyId?: string | null;
  authorId?: string | null;
  sourceId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ awarded: false, error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as RecordFanScoreRequest;

    if (!body.eventKey) {
      return NextResponse.json(
        { awarded: false, error: "missing_event_key" },
        { status: 400 }
      );
    }

    const results = await recordFanScoreAction({
      authorId: body.authorId ?? null,
      eventKey: body.eventKey,
      metadata: body.metadata ?? {},
      sourceId: body.sourceId ?? null,
      storyId: body.storyId ?? null,
      userId: user.id
    });

    return NextResponse.json({
      awarded: results.some((result) => Boolean(result?.awarded ?? false)),
      error: null
    });
  } catch (error) {
    return NextResponse.json(
      {
        awarded: false,
        error: error instanceof Error ? error.message : "fan_score_record_failed"
      },
      { status: 500 }
    );
  }
}
