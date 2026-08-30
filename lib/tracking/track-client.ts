"use client";

import { getTrackingAnonymousId, getTrackingSessionId } from "@/lib/tracking/identity";
import { getTrackingDeviceType } from "@/lib/tracking/device";
import {
  sanitizeReasonCode,
  sanitizeTrackingMetadata
} from "@/lib/tracking/sanitize-metadata";
import { createClient } from "@/lib/data/client";
import type {
  TrackExposureInput,
  TrackStoryActionMetadata,
  TrackUserActionInput,
  TrackingActionType,
  TrackingItemType,
  TrackingSurface
} from "@/types/tracking";

function logTrackingError(table: string, error: unknown) {
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
    console.warn(`[tracking] ${table} insert failed`, error);
  }
}

let trackingUnavailable = false;
const lastActionAt = new Map<string, number>();
const actionThrottleMs = 400;

function throttleKey(actionType: string, itemId: string) {
  return `${actionType}:${itemId}`;
}

function shouldThrottle(actionType: TrackingActionType, itemId: string) {
  const skipThrottle = new Set<TrackingActionType>(["read_progress", "dwell"]);
  if (skipThrottle.has(actionType)) {
    return false;
  }
  const key = throttleKey(actionType, itemId);
  const now = Date.now();
  const last = lastActionAt.get(key) ?? 0;
  if (now - last < actionThrottleMs) {
    return true;
  }
  lastActionAt.set(key, now);
  return false;
}

async function resolveAuthUserId(explicitUserId?: string | null) {
  if (explicitUserId !== undefined) {
    return explicitUserId;
  }
  try {
    const db = createClient();
    const {
      data: { user }
    } = await db.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function trackExposure(input: TrackExposureInput) {
  if (typeof window === "undefined" || trackingUnavailable) {
    return;
  }

  try {
    const db = createClient();
    const userId = await resolveAuthUserId(input.userId);
    const { error } = await db.from("exposure_events").insert({
      user_id: userId,
      anonymous_id: input.anonymousId ?? getTrackingAnonymousId(),
      surface: input.surface,
      item_type: input.itemType,
      item_id: input.itemId,
      story_id: input.storyId ?? null,
      chapter_id: input.chapterId ?? null,
      reel_id: input.reelId ?? null,
      author_user_id: input.authorUserId ?? null,
      position: input.position ?? null,
      session_id: input.sessionId ?? getTrackingSessionId(),
      algorithm_version: input.algorithmVersion ?? null,
      candidate_pool: input.candidatePool ?? null,
      request_id: input.requestId ?? null,
      device_type: input.deviceType ?? getTrackingDeviceType()
    });

    if (error) {
      const code = String(error.code ?? "");
      if (code === "PGRST204" || code === "PGRST205") {
        trackingUnavailable = true;
      }
      logTrackingError("exposure_events", error);
    }
  } catch (error) {
    logTrackingError("exposure_events", error);
  }
}

export async function trackUserAction(input: TrackUserActionInput) {
  if (typeof window === "undefined" || trackingUnavailable) {
    return;
  }

  if (shouldThrottle(input.actionType, input.itemId)) {
    return;
  }

  try {
    const db = createClient();
    const userId = await resolveAuthUserId(input.userId);
    const metadata = sanitizeTrackingMetadata(input.metadata ?? {});

    const { error } = await db.from("user_action_events").insert({
      user_id: userId,
      anonymous_id: input.anonymousId ?? getTrackingAnonymousId(),
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
      metadata,
      session_id: input.sessionId ?? getTrackingSessionId(),
      algorithm_version: input.algorithmVersion ?? null
    });

    if (error) {
      const code = String(error.code ?? "");
      if (code === "PGRST204" || code === "PGRST205") {
        trackingUnavailable = true;
      }
      logTrackingError("user_action_events", error);
    } else if (userId) {
      void updateUserInterestProfileFromAction(userId, input);
    }
  } catch (error) {
    logTrackingError("user_action_events", error);
  }
}

function storyActionBase(
  storyId: string,
  metadata?: TrackStoryActionMetadata
) {
  return {
    surface: metadata?.surface ?? ("story_detail" as TrackingSurface),
    storyId: metadata?.storyId ?? storyId,
    authorUserId: metadata?.authorUserId ?? null,
    sessionId: metadata?.sessionId,
    algorithmVersion: metadata?.algorithmVersion,
    metadata: sanitizeTrackingMetadata({
      slug: metadata?.slug ?? null,
      episode_number: metadata?.episodeNumber ?? null
    })
  };
}

export async function trackStoryOpen(
  storyId: string,
  userId?: string | null,
  metadata?: TrackStoryActionMetadata
) {
  const base = storyActionBase(storyId, metadata);
  await trackUserAction({
    ...base,
    userId,
    actionType: "open_story",
    itemType: "story",
    itemId: storyId,
    metadata: base.metadata
  });
  await trackExposure({
    surface: base.surface,
    userId,
    itemType: "story",
    itemId: storyId,
    storyId,
    authorUserId: base.authorUserId,
    sessionId: base.sessionId,
    algorithmVersion: base.algorithmVersion,
    candidatePool: metadata?.candidatePool,
    position: metadata?.position
  });
}

export async function trackChapterStart(
  chapterId: string,
  userId?: string | null,
  metadata?: TrackStoryActionMetadata
) {
  const storyId = metadata?.storyId;
  if (!storyId) {
    return;
  }
  const base = storyActionBase(storyId, {
    ...metadata,
    surface: metadata?.surface ?? "chapter_detail"
  });
  await trackUserAction({
    ...base,
    userId,
    actionType: "read_start",
    itemType: "chapter",
    itemId: chapterId,
    chapterId,
    metadata: base.metadata
  });
}

export async function trackChapterComplete(
  chapterId: string,
  userId?: string | null,
  metadata?: TrackStoryActionMetadata
) {
  const storyId = metadata?.storyId;
  if (!storyId) {
    return;
  }
  const base = storyActionBase(storyId, {
    ...metadata,
    surface: metadata?.surface ?? "chapter_detail"
  });
  await trackUserAction({
    ...base,
    userId,
    actionType: "read_complete",
    itemType: "chapter",
    itemId: chapterId,
    chapterId,
    valueNumeric: metadata?.progressPercent ?? 100,
    metadata: base.metadata
  });
}

export async function trackNextChapterClick(
  chapterId: string,
  userId?: string | null,
  metadata?: TrackStoryActionMetadata
) {
  const storyId = metadata?.storyId;
  if (!storyId) {
    return;
  }
  const base = storyActionBase(storyId, {
    ...metadata,
    surface: metadata?.surface ?? "chapter_detail"
  });
  await trackUserAction({
    ...base,
    userId,
    actionType: "next_chapter_click",
    itemType: "chapter",
    itemId: chapterId,
    chapterId,
    metadata: base.metadata
  });
}

export async function trackReelImpression(
  reelId: string,
  userId?: string | null,
  metadata?: TrackStoryActionMetadata & {
    itemType?: "reel" | "chapter";
    storyId?: string;
    authorUserId?: string | null;
    position?: number;
    candidatePool?: string | null;
    requestId?: string | null;
  }
) {
  const itemType = metadata?.itemType ?? "reel";
  await trackExposure({
    surface: "reels",
    userId,
    itemType,
    itemId: reelId,
    reelId: itemType === "reel" ? reelId : null,
    chapterId: itemType === "chapter" ? reelId : null,
    storyId: metadata?.storyId ?? null,
    authorUserId: metadata?.authorUserId ?? null,
    position: metadata?.position ?? null,
    candidatePool: metadata?.candidatePool ?? "personalized",
    sessionId: metadata?.sessionId,
    algorithmVersion: metadata?.algorithmVersion,
    requestId: metadata?.requestId ?? null
  });
  await trackUserAction({
    surface: "reels",
    userId,
    actionType: "impression",
    itemType,
    itemId: reelId,
    reelId: itemType === "reel" ? reelId : null,
    chapterId: itemType === "chapter" ? reelId : null,
    storyId: metadata?.storyId ?? null,
    authorUserId: metadata?.authorUserId ?? null,
    metadata: sanitizeTrackingMetadata({
      slug: metadata?.slug ?? null,
      position: metadata?.position ?? null
    })
  });
}

export async function trackReelReadMoreClick(
  reelId: string,
  userId?: string | null,
  metadata?: TrackStoryActionMetadata & {
    itemType?: "reel" | "chapter";
    storyId?: string;
    authorUserId?: string | null;
  }
) {
  const itemType = metadata?.itemType ?? "reel";
  await trackUserAction({
    surface: "reels",
    userId,
    actionType: "click",
    itemType,
    itemId: reelId,
    reelId: itemType === "reel" ? reelId : null,
    chapterId: itemType === "chapter" ? reelId : null,
    storyId: metadata?.storyId ?? null,
    authorUserId: metadata?.authorUserId ?? null,
    valueText: "read_more",
    metadata: sanitizeTrackingMetadata({
      slug: metadata?.slug ?? null
    })
  });
}

export async function trackHide(
  itemType: TrackingItemType,
  itemId: string,
  userId?: string | null,
  reason?: string | null,
  extra?: {
    surface?: TrackingSurface;
    storyId?: string | null;
    chapterId?: string | null;
    reelId?: string | null;
    authorUserId?: string | null;
  }
) {
  await trackUserAction({
    surface: extra?.surface ?? "other",
    userId,
    actionType: "hide",
    itemType,
    itemId,
    storyId: extra?.storyId,
    chapterId: extra?.chapterId,
    reelId: extra?.reelId,
    authorUserId: extra?.authorUserId,
    valueText: sanitizeReasonCode(reason)
  });
}

export async function trackReport(
  itemType: TrackingItemType,
  itemId: string,
  userId?: string | null,
  reason?: string | null,
  extra?: {
    surface?: TrackingSurface;
    storyId?: string | null;
    chapterId?: string | null;
    reelId?: string | null;
    authorUserId?: string | null;
  }
) {
  await trackUserAction({
    surface: extra?.surface ?? "other",
    userId,
    actionType: "report",
    itemType,
    itemId,
    storyId: extra?.storyId,
    chapterId: extra?.chapterId,
    reelId: extra?.reelId,
    authorUserId: extra?.authorUserId,
    valueText: sanitizeReasonCode(reason)
  });
}

export async function updateUserInterestProfileFromAction(
  userId: string,
  action: TrackUserActionInput
) {
  if (trackingUnavailable || typeof window === "undefined") {
    return;
  }

  const positiveActions = new Set<TrackingActionType>([
    "save",
    "follow_author",
    "read_complete",
    "open_story"
  ]);
  const negativeActions = new Set<TrackingActionType>(["hide", "report"]);

  if (!positiveActions.has(action.actionType) && !negativeActions.has(action.actionType)) {
    return;
  }

  try {
    const db = createClient();
    const key =
      action.actionType === "hide" || action.actionType === "report"
        ? action.authorUserId
        : action.storyId;
    if (!key) {
      return;
    }

    const field =
      action.actionType === "hide" || action.actionType === "report"
        ? action.actionType === "hide"
          ? "hidden_authors"
          : "negative_tags"
        : action.actionType === "follow_author"
          ? "preferred_authors"
          : "preferred_content_types";

    const patch = { [key]: 1 };
    const { data: existing } = await db
      .from("user_interest_profiles")
      .select(field)
      .eq("user_id", userId)
      .maybeSingle();

    const current =
      existing && typeof existing === "object" && field in existing
        ? ((existing as Record<string, Record<string, number>>)[field] ?? {})
        : {};

    const merged = { ...current, ...patch };

    await db.from("user_interest_profiles").upsert(
      {
        user_id: userId,
        [field]: merged,
        last_updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );
  } catch (error) {
    logTrackingError("user_interest_profiles", error);
  }
}
