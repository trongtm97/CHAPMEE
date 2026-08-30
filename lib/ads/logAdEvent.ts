import type { AdRenderEventType } from "@/types/ads";

export type LogAdEventInput = {
  placementId: string;
  eventType: AdRenderEventType;
  reason?: string | null;
  route?: string;
  device?: string;
  storyId?: string | null;
  chapterId?: string | null;
  authorId?: string | null;
  sessionId?: string | null;
  userId?: string | null;
};

function getSessionId(): string {
  if (typeof window === "undefined") {
    return "server";
  }
  const key = "chapmee_ad_session";
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

/**
 * Best-effort analytics — never throws to callers.
 */
export async function logAdEvent(input: LogAdEventInput): Promise<void> {
  try {
    await fetch("/api/ads/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placement_id: input.placementId,
        user_id: input.userId ?? null,
        story_id: input.storyId ?? null,
        chapter_id: input.chapterId ?? null,
        author_id: input.authorId ?? null,
        route: input.route ?? null,
        device: input.device ?? null,
        event_type: input.eventType,
        reason: input.reason ?? null,
        session_id: input.sessionId ?? getSessionId()
      }),
      keepalive: true
    });
  } catch {
    // Swallow — ads must not break reading UX
  }
}
