"use server";

import { inferEventCategory } from "@/lib/analytics/infer-event-category";
import { sanitizeAnalyticsMetadata } from "@/lib/analytics/sanitizeMetadata";
import { createClient } from "@/lib/supabase/server";
import type { TrackEventInput } from "@/types/analytics";

function logAnalyticsError(error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[analytics] trackServerEvent failed", error);
  }
}

/**
 * Track an analytics event from a Server Action without blocking the main action.
 * Errors are swallowed so a successful save/comment/report never fails because
 * analytics insert failed.
 */
export async function trackServerEvent(input: TrackEventInput) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const eventName = input.eventName ?? input.event_name;
    if (!eventName) {
      return;
    }
    const targetId = input.targetId ?? input.target_id ?? null;
    const targetType = input.targetType ?? input.target_type ?? null;
    const sessionId = input.sessionId ?? input.session_id ?? null;

    const payload = sanitizeAnalyticsMetadata(input.metadata ?? {});
    const category =
      input.category ?? input.category_name ?? inferEventCategory(eventName);

    const { error } = await supabase.from("analytics_events").insert({
      event_category: category,
      event_name: eventName,
      metadata: payload,
      properties: payload,
      session_id: sessionId,
      target_id: targetId,
      target_type: targetType,
      user_id: user?.id ?? null
    });

    if (error) {
      logAnalyticsError(error);
    }
  } catch (error) {
    logAnalyticsError(error);
  }
}
