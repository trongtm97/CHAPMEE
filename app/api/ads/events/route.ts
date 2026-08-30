import { NextResponse } from "next/server";
import { createClient } from "@/lib/data/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import type { AdRenderEventType } from "@/types/ads";

const EVENT_TYPES = new Set<AdRenderEventType>([
  "impression_attempt",
  "rendered",
  "blocked",
  "clicked_estimate"
]);

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const placementId = typeof body.placementId === "string" ? body.placementId : null;
  const eventType = body.eventType as AdRenderEventType;

  if (!placementId || !EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const { user } = await getCurrentProfile();

  try {
    const db = await createClient();
    const { error } = await db.from("ad_render_events").insert({
      placement_id: placementId,
      user_id: user?.id ?? null,
      story_id: typeof body.storyId === "string" ? body.storyId : null,
      chapter_id: typeof body.chapterId === "string" ? body.chapterId : null,
      author_id: typeof body.authorId === "string" ? body.authorId : null,
      route: typeof body.route === "string" ? body.route : null,
      device: typeof body.device === "string" ? body.device : null,
      event_type: eventType,
      reason: typeof body.reason === "string" ? body.reason : null,
      session_id: typeof body.sessionId === "string" ? body.sessionId : null
    });

    if (error) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
