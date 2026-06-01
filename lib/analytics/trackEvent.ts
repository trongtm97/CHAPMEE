import { getAnalyticsSessionId } from "@/lib/analytics/session";
import { sanitizeAnalyticsMetadata } from "@/lib/analytics/sanitizeMetadata";
import { createClient } from "@/lib/supabase/client";
import { inferEventCategory } from "@/lib/analytics/infer-event-category";
import type { TrackEventInput } from "@/types/analytics";

function logAnalyticsError(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  if (
    code.includes("PGRST204") ||
    code.includes("PGRST205") ||
    message.includes("PGRST204") ||
    message.includes("PGRST205")
  ) {
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn("[analytics] trackEvent failed", error);
  }
}

const lastEventAt = new Map<string, number>();
const eventThrottleMs = 500;
let analyticsUnavailable = false;

function eventThrottleKey(eventName: string, targetId?: string | null) {
  return `${eventName}:${targetId ?? "_"}`;
}

/**
 * Track a ChapMee engagement event in Supabase.
 * Tracking failures are swallowed so analytics never blocks the user experience.
 */
export async function trackEvent(input: TrackEventInput) {
  if (typeof window === "undefined") {
    return;
  }
  if (analyticsUnavailable) {
    return;
  }

  const eventName = input.eventName ?? input.event_name;
  const targetId = input.targetId ?? input.target_id ?? null;
  const throttleKey = eventThrottleKey(eventName, targetId);
  const now = Date.now();
  const lastSeen = lastEventAt.get(throttleKey) ?? 0;
  if (now - lastSeen < eventThrottleMs) {
    return;
  }
  lastEventAt.set(throttleKey, now);

  try {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const sessionId = input.sessionId ?? input.session_id ?? getAnalyticsSessionId();
    const pagePath = window.location.pathname;
    const referrer = document.referrer || null;
    const userAgent = navigator.userAgent || null;
    const category =
      input.category ?? input.category_name ?? inferEventCategory(eventName);
    const payload = sanitizeAnalyticsMetadata(input.metadata ?? {});

    const { error } = await supabase.from("analytics_events").insert({
      anonymous_id: sessionId,
      event_category: category,
      event_name: eventName,
      metadata: payload,
      page_path: pagePath,
      properties: payload,
      referrer,
      session_id: sessionId,
      target_id: targetId,
      target_type: input.targetType ?? input.target_type ?? null,
      user_agent: userAgent,
      user_id: user?.id ?? null
    });

    if (error) {
      const code = typeof error === "object" && error && "code" in error
        ? String(error.code)
        : "";
      if (code === "PGRST204" || code === "PGRST205") {
        analyticsUnavailable = true;
      }
      logAnalyticsError(error);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("PGRST204") || message.includes("PGRST205")) {
      analyticsUnavailable = true;
    }
    logAnalyticsError(error);
  }
}
