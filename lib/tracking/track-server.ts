import { sanitizeReasonCode, sanitizeTrackingMetadata } from "@/lib/tracking/sanitize-metadata";
import { mapReportTargetToTrackingItemType } from "@/lib/tracking/resolve-reels-context";
import { createClient } from "@/lib/data/server";
import type {
  TrackExposureInput,
  TrackUserActionInput,
  TrackingItemType
} from "@/types/tracking";

function logTrackingError(table: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[tracking] server ${table} insert failed`, error);
  }
}

async function insertUserAction(
  userId: string | null,
  input: Omit<TrackUserActionInput, "userId" | "anonymousId">
) {
  try {
    const db = await createClient();
    const { error } = await db.from("user_action_events").insert({
      user_id: userId,
      anonymous_id: null,
      surface: input.surface,
      action_type: input.actionType,
      item_type: input.itemType,
      item_id: input.itemId,
      story_id: input.storyId ?? null,
      chapter_id: input.chapterId ?? null,
      reel_id: input.reelId ?? null,
      author_user_id: input.authorUserId ?? null,
      value_numeric: input.valueNumeric ?? null,
      value_text: input.valueText ?? null,
      metadata: sanitizeTrackingMetadata(input.metadata ?? {}),
      session_id: input.sessionId ?? null,
      algorithm_version: input.algorithmVersion ?? null
    });
    if (error) {
      logTrackingError("user_action_events", error);
    }
  } catch (error) {
    logTrackingError("user_action_events", error);
  }
}

export async function trackServerUserAction(
  userId: string | null,
  input: Omit<TrackUserActionInput, "userId" | "anonymousId">
) {
  await insertUserAction(userId, input);
}

export async function trackServerExposure(
  userId: string | null,
  input: Omit<TrackExposureInput, "userId" | "anonymousId" | "deviceType">
) {
  try {
    const db = await createClient();
    const { error } = await db.from("exposure_events").insert({
      user_id: userId,
      anonymous_id: null,
      surface: input.surface,
      item_type: input.itemType,
      item_id: input.itemId,
      story_id: input.storyId ?? null,
      chapter_id: input.chapterId ?? null,
      reel_id: input.reelId ?? null,
      author_user_id: input.authorUserId ?? null,
      position: input.position ?? null,
      session_id: input.sessionId ?? null,
      algorithm_version: input.algorithmVersion ?? null,
      candidate_pool: input.candidatePool ?? null,
      request_id: input.requestId ?? null,
      device_type: null
    });
    if (error) {
      logTrackingError("exposure_events", error);
    }
  } catch (error) {
    logTrackingError("exposure_events", error);
  }
}

export async function trackServerReport(input: {
  userId: string;
  targetType: string;
  targetId: string;
  reasonCode: string;
  surface?: TrackUserActionInput["surface"];
  storyId?: string | null;
  chapterId?: string | null;
  authorUserId?: string | null;
}) {
  const itemType: TrackingItemType = mapReportTargetToTrackingItemType(
    input.targetType
  );

  await insertUserAction(input.userId, {
    surface: input.surface ?? "other",
    actionType: "report",
    itemType,
    itemId: input.targetId,
    storyId: input.storyId ?? (itemType === "story" ? input.targetId : null),
    chapterId:
      input.chapterId ?? (itemType === "chapter" ? input.targetId : null),
    authorUserId: input.authorUserId,
    valueText: sanitizeReasonCode(input.reasonCode)
  });
}

export async function trackServerHide(input: {
  userId: string;
  itemType: TrackingItemType;
  itemId: string;
  reasonCode?: string | null;
  surface?: TrackUserActionInput["surface"];
  storyId?: string | null;
  chapterId?: string | null;
  reelId?: string | null;
  authorUserId?: string | null;
}) {
  await insertUserAction(input.userId, {
    surface: input.surface ?? "other",
    actionType: "hide",
    itemType: input.itemType,
    itemId: input.itemId,
    storyId: input.storyId,
    chapterId: input.chapterId,
    reelId: input.reelId,
    authorUserId: input.authorUserId,
    valueText: sanitizeReasonCode(input.reasonCode)
  });
}
