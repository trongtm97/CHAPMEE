"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { cancelScheduledPublication } from "@/lib/studio/scheduling/cancel-scheduled-publication";
import {
  publishNowPublication,
  schedulePublication
} from "@/lib/studio/scheduling/schedule-publication";
import {
  validateChapterForPublish,
  validateStoryForPublish
} from "@/lib/studio/scheduling/validate-publish";
import { validateReelsBeforePublishFromDb } from "@/lib/publish/validate-reels-before-publish-server";
import { parseVietnamScheduleInput } from "@/lib/studio/scheduling/timezone";
import { studioPath } from "@/lib/studio/constants";
import { createClient } from "@/lib/supabase/server";
import type { ScheduledTargetType } from "@/types/scheduling";
import { STUDIO_DEFAULT_TIMEZONE, isReelsScheduledTarget } from "@/types/scheduling";

async function getActor() {
  const [{ profile }, creatorState] = await Promise.all([
    getCurrentUser(),
    getCurrentCreatorProfile()
  ]);

  if (!profile?.id || !creatorState.creatorProfile) {
    return { error: "Bạn cần đăng nhập Studio.", ok: false as const };
  }

  return {
    creatorProfileId: creatorState.creatorProfile.id,
    ok: true as const,
    profileId: profile.id
  };
}

export async function schedulePublicationAction(input: {
  targetType: ScheduledTargetType;
  targetId: string;
  storyId?: string | null;
  scheduleDate: string;
  scheduleTime: string;
}) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  const scheduledAt = parseVietnamScheduleInput(input.scheduleDate, input.scheduleTime);

  if (!scheduledAt) {
    return { error: "Ngày giờ lên lịch không hợp lệ.", ok: false as const };
  }

  const supabase = await createClient();
  const result = await schedulePublication({
    creatorProfileId: actor.creatorProfileId,
    profileId: actor.profileId,
    scheduledAt,
    storyId: input.storyId,
    supabase,
    targetId: input.targetId,
    targetType: input.targetType,
    timezone: STUDIO_DEFAULT_TIMEZONE
  });

  if (result.ok) {
    revalidatePath(studioPath("/calendar"));
    revalidatePath(studioPath("/stories"));
  }

  return result;
}

export async function updateScheduledPublicationAction(input: {
  scheduleId: string;
  scheduleDate: string;
  scheduleTime: string;
}) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  const scheduledAt = parseVietnamScheduleInput(input.scheduleDate, input.scheduleTime);

  if (!scheduledAt) {
    return { error: "Ngày giờ lên lịch không hợp lệ.", ok: false as const };
  }

  const supabase = await createClient();

  const { data: row, error: fetchError } = await supabase
    .from("scheduled_publications")
    .select("id, status")
    .eq("id", input.scheduleId)
    .eq("creator_id", actor.profileId)
    .maybeSingle();

  if (fetchError || !row) {
    return { error: "Không tìm thấy lịch đăng.", ok: false as const };
  }

  if (row.status !== "scheduled") {
    return { error: "Chỉ có thể sửa lịch đang chờ đăng.", ok: false as const };
  }

  const { error } = await supabase
    .from("scheduled_publications")
    .update({
      last_error: null,
      publish_attempts: 0,
      scheduled_at: scheduledAt
    })
    .eq("id", input.scheduleId);

  if (error) {
    return { error: error.message, ok: false as const };
  }

  revalidatePath(studioPath("/calendar"));
  return { ok: true as const };
}

export async function cancelScheduledPublicationAction(scheduleId: string) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  const supabase = await createClient();
  const result = await cancelScheduledPublication(
    supabase,
    scheduleId,
    actor.profileId,
    actor.creatorProfileId
  );

  if (result.ok) {
    revalidatePath(studioPath("/calendar"));
  }

  return result;
}

export async function publishNowAction(input: {
  targetType: ScheduledTargetType;
  targetId: string;
  storyId?: string | null;
}) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  const supabase = await createClient();
  const result = await publishNowPublication({
    creatorProfileId: actor.creatorProfileId,
    profileId: actor.profileId,
    storyId: input.storyId,
    supabase,
    targetId: input.targetId,
    targetType: input.targetType
  });

  if (result.ok) {
    revalidatePath(studioPath("/calendar"));
    revalidatePath(studioPath("/stories"));
  }

  return result;
}

export async function getPublishChecklistAction(input: {
  targetType: ScheduledTargetType;
  targetId: string;
  storyId?: string | null;
}) {
  const actor = await getActor();

  if (!actor.ok) {
    return {
      error: actor.error,
      hasBlockingErrors: true,
      hasWarnings: false,
      ok: false as const,
      rules: []
    };
  }

  const supabase = await createClient();

  if (input.targetType === "story") {
    return validateStoryForPublish(
      supabase,
      input.targetId,
      actor.creatorProfileId
    );
  }

  if (input.targetType === "chapter" && input.storyId) {
    return validateChapterForPublish(
      supabase,
      input.targetId,
      input.storyId,
      actor.creatorProfileId
    );
  }

  if (isReelsScheduledTarget(input.targetType)) {
    return validateReelsBeforePublishFromDb(
      supabase,
      input.targetId,
      actor.profileId
    );
  }

  return {
    hasBlockingErrors: true,
    hasWarnings: false,
    ok: false,
    rules: []
  };
}
