import {
  validateChapterForPublish,
  validationErrorMessage,
  validateStoryForPublish
} from "@/lib/studio/scheduling/validate-publish";
import { validateSwipeBeforePublishFromDb } from "@/lib/publish/validate-swipe-before-publish-server";
import { publishTargetByType } from "@/lib/studio/scheduling/publish-target";
import { STUDIO_DEFAULT_TIMEZONE } from "@/types/scheduling";
import type { ScheduledTargetType } from "@/types/scheduling";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SchedulePublicationInput = {
  supabase: SupabaseClient;
  profileId: string;
  creatorProfileId: string;
  targetType: ScheduledTargetType;
  targetId: string;
  storyId?: string | null;
  scheduledAt: string;
  timezone?: string;
};

export async function schedulePublication(
  input: SchedulePublicationInput
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const scheduledAtMs = new Date(input.scheduledAt).getTime();

  if (!Number.isFinite(scheduledAtMs) || scheduledAtMs <= Date.now()) {
    return { error: "Thời gian lên lịch phải ở trong tương lai.", ok: false };
  }

  if (input.targetType === "story") {
    const validation = await validateStoryForPublish(
      input.supabase,
      input.targetId,
      input.creatorProfileId
    );

    if (!validation.ok) {
      return {
        error: validationErrorMessage(validation),
        ok: false
      };
    }
  }

  if (input.targetType === "chapter") {
    if (!input.storyId) {
      return { error: "Thiếu truyện cho chương.", ok: false };
    }

    const validation = await validateChapterForPublish(
      input.supabase,
      input.targetId,
      input.storyId,
      input.creatorProfileId
    );

    if (!validation.ok) {
      return {
        error: validationErrorMessage(validation),
        ok: false
      };
    }
  }

  if (input.targetType === "swipe") {
    const validation = await validateSwipeBeforePublishFromDb(
      input.supabase,
      input.targetId,
      input.profileId
    );

    if (!validation.ok) {
      return {
        error: validationErrorMessage(validation),
        ok: false
      };
    }
  }

  const resolvedStoryId =
    input.targetType === "story"
      ? input.targetId
      : (input.storyId ?? null);

  const { data: existing } = await input.supabase
    .from("scheduled_publications")
    .select("id")
    .eq("target_type", input.targetType)
    .eq("target_id", input.targetId)
    .eq("status", "scheduled")
    .maybeSingle();

  if (existing?.id) {
    const { error } = await input.supabase
      .from("scheduled_publications")
      .update({
        canceled_at: null,
        last_error: null,
        publish_attempts: 0,
        scheduled_at: input.scheduledAt,
        status: "scheduled",
        story_id: resolvedStoryId,
        timezone: input.timezone ?? STUDIO_DEFAULT_TIMEZONE
      })
      .eq("id", existing.id)
      .eq("creator_id", input.profileId);

    if (error) {
      return { error: error.message, ok: false };
    }

    return { id: existing.id as string, ok: true };
  }

  const { data, error } = await input.supabase
    .from("scheduled_publications")
    .insert({
      creator_id: input.profileId,
      scheduled_at: input.scheduledAt,
      status: "scheduled",
      story_id: resolvedStoryId,
      target_id: input.targetId,
      target_type: input.targetType,
      timezone: input.timezone ?? STUDIO_DEFAULT_TIMEZONE
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message, ok: false };
  }

  return { id: data.id as string, ok: true };
}

export async function publishNowPublication(input: {
  supabase: SupabaseClient;
  profileId: string;
  creatorProfileId: string;
  targetType: ScheduledTargetType;
  targetId: string;
  storyId?: string | null;
}) {
  const publishResult = await publishTargetByType(
    input.supabase,
    input.targetType,
    input.targetId,
    input.storyId ?? null,
    input.creatorProfileId
  );

  if (!publishResult.ok) {
    return publishResult;
  }

  const now = new Date().toISOString();

  await input.supabase
    .from("scheduled_publications")
    .update({
      canceled_at: null,
      last_error: null,
      published_at: now,
      status: "published"
    })
    .eq("creator_id", input.profileId)
    .eq("target_type", input.targetType)
    .eq("target_id", input.targetId)
    .eq("status", "scheduled");

  return { ok: true as const };
}
