"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import {
  assertOwnsSwipeItem,
  assertStoryLinkForSwipe
} from "@/lib/swipe/assert-swipe-ownership";
import { publishSwipeItem } from "@/lib/swipe/publish-swipe-item";
import {
  duplicateSwipeItem,
  insertSwipeItem,
  updateSwipeItemRow
} from "@/lib/swipe/swipe-item-mutations";
import { schedulePublication } from "@/lib/studio/scheduling/schedule-publication";
import { studioPath } from "@/lib/studio/constants";
import { createClient } from "@/lib/supabase/server";
import { parseVietnamScheduleInput } from "@/lib/studio/scheduling/timezone";
import { STUDIO_DEFAULT_TIMEZONE } from "@/types/scheduling";
import type { SwipeFormValues, SwipeSourceType } from "@/types/swipe";

async function getActor() {
  const [{ profile }, creatorState] = await Promise.all([
    getCurrentUser(),
    getCurrentCreatorProfile()
  ]);

  if (!profile?.id || !creatorState.creatorProfile) {
    return { error: "Bạn cần đăng nhập Studio.", ok: false as const };
  }

  return {
    creatorProfile: creatorState.creatorProfile,
    ok: true as const,
    profileId: profile.id
  };
}

function parseSwipeFormData(formData: FormData): Partial<SwipeFormValues> {
  return {
    backgroundImageUrl: String(formData.get("background_image_url") ?? "").trim() || null,
    body: String(formData.get("body") ?? ""),
    chapterId: String(formData.get("chapter_id") ?? "").trim() || null,
    cta: String(formData.get("cta") ?? ""),
    ctaType: String(formData.get("cta_type") ?? "custom"),
    hook: String(formData.get("hook") ?? ""),
    storyId: String(formData.get("story_id") ?? ""),
    title: String(formData.get("title") ?? "")
  };
}

function parseSourceMeta(formData: FormData) {
  const sourceType = String(formData.get("source_type") ?? "").trim();

  return {
    sourceTextEnd: Number(formData.get("source_text_end") ?? "") || null,
    sourceTextStart: Number(formData.get("source_text_start") ?? "") || null,
    sourceType: (sourceType || "manual") as SwipeSourceType
  };
}

function revalidateSwipePaths() {
  revalidatePath(studioPath("/swipe"));
  revalidatePath("/swipe");
}

export async function createSwipeItemAction(formData: FormData) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  const values = parseSwipeFormData(formData);
  const source = parseSourceMeta(formData);
  const intent = String(formData.get("intent") ?? "draft");

  if (values.storyId) {
    await assertStoryLinkForSwipe(actor.creatorProfile, values.storyId, values.chapterId);
  }

  const supabase = await createClient();

  if (intent === "publish") {
    const draftInsert = await insertSwipeItem(supabase, actor.profileId, values, {
      sourceType: source.sourceType,
      sourceTextEnd: source.sourceTextEnd,
      sourceTextStart: source.sourceTextStart,
      status: "draft"
    });

    if (!draftInsert.id) {
      return { error: draftInsert.error ?? "Không tạo được Swipe.", ok: false as const };
    }

    const published = await publishSwipeItem(
      supabase,
      draftInsert.id,
      actor.profileId,
      values
    );

    if (!published.ok) {
      return { error: published.error, ok: false as const };
    }

    revalidateSwipePaths();
    redirect(studioPath(`/swipe/${draftInsert.id}/edit?published=1`));
  }

  if (intent === "schedule") {
    const scheduleDate = String(formData.get("schedule_date") ?? "");
    const scheduleTime = String(formData.get("schedule_time") ?? "");
    const scheduledAt = parseVietnamScheduleInput(scheduleDate, scheduleTime);

    if (!scheduledAt) {
      return { error: "Ngày giờ lên lịch không hợp lệ.", ok: false as const };
    }

    const created = await insertSwipeItem(supabase, actor.profileId, values, {
      sourceType: source.sourceType,
      sourceTextEnd: source.sourceTextEnd,
      sourceTextStart: source.sourceTextStart,
      scheduledAt,
      status: "scheduled"
    });

    if (!created.id) {
      return { error: created.error ?? "Không tạo được Swipe.", ok: false as const };
    }

    const scheduled = await schedulePublication({
      creatorProfileId: actor.creatorProfile.id,
      profileId: actor.profileId,
      scheduledAt,
      storyId: values.storyId,
      supabase,
      targetId: created.id,
      targetType: "swipe",
      timezone: STUDIO_DEFAULT_TIMEZONE
    });

    if (!scheduled.ok) {
      return { error: scheduled.error ?? "Không thể lên lịch Swipe.", ok: false as const };
    }

    revalidateSwipePaths();
    redirect(studioPath("/swipe"));
  }

  const created = await insertSwipeItem(supabase, actor.profileId, values, {
    sourceType: source.sourceType,
    sourceTextEnd: source.sourceTextEnd,
    sourceTextStart: source.sourceTextStart,
    status: "draft"
  });

  if (!created.id) {
    return { error: created.error ?? "Không tạo được Swipe.", ok: false as const };
  }

  revalidateSwipePaths();
  redirect(studioPath(`/swipe/${created.id}/edit`));
}

export async function updateSwipeItemAction(formData: FormData) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  const swipeId = String(formData.get("swipe_id") ?? "");

  if (!swipeId) {
    return { error: "Thiếu mã Swipe.", ok: false as const };
  }

  await assertOwnsSwipeItem(actor.profileId, swipeId);

  const values = parseSwipeFormData(formData);
  const source = parseSourceMeta(formData);
  const intent = String(formData.get("intent") ?? "draft");

  if (values.storyId) {
    await assertStoryLinkForSwipe(actor.creatorProfile, values.storyId, values.chapterId);
  }

  const supabase = await createClient();

  if (intent === "publish") {
    const published = await publishSwipeItem(supabase, swipeId, actor.profileId, values);

    if (!published.ok) {
      return { error: published.error, ok: false as const };
    }

    revalidateSwipePaths();
    return { ok: true as const };
  }

  if (intent === "schedule") {
    const scheduleDate = String(formData.get("schedule_date") ?? "");
    const scheduleTime = String(formData.get("schedule_time") ?? "");
    const scheduledAt = parseVietnamScheduleInput(scheduleDate, scheduleTime);

    if (!scheduledAt) {
      return { error: "Ngày giờ lên lịch không hợp lệ.", ok: false as const };
    }

    const updated = await updateSwipeItemRow(supabase, swipeId, actor.profileId, values, {
      scheduledAt,
      sourceTextEnd: source.sourceTextEnd,
      sourceTextStart: source.sourceTextStart,
      sourceType: source.sourceType,
      status: "scheduled"
    });

    if (!updated.ok) {
      return { error: updated.error, ok: false as const };
    }

    const scheduled = await schedulePublication({
      creatorProfileId: actor.creatorProfile.id,
      profileId: actor.profileId,
      scheduledAt,
      storyId: values.storyId,
      supabase,
      targetId: swipeId,
      targetType: "swipe",
      timezone: STUDIO_DEFAULT_TIMEZONE
    });

    if (!scheduled.ok) {
      return { error: scheduled.error ?? "Không thể lên lịch Swipe.", ok: false as const };
    }

    revalidateSwipePaths();
    return { ok: true as const };
  }

  const updated = await updateSwipeItemRow(supabase, swipeId, actor.profileId, values, {
    sourceTextEnd: source.sourceTextEnd,
    sourceTextStart: source.sourceTextStart,
    sourceType: source.sourceType,
    status: "draft"
  });

  if (!updated.ok) {
    return { error: updated.error, ok: false as const };
  }

  revalidateSwipePaths();
  return { ok: true as const };
}

export async function hideSwipeItemAction(swipeId: string) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  await assertOwnsSwipeItem(actor.profileId, swipeId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("swipe_items")
    .update({ status: "hidden" })
    .eq("id", swipeId)
    .eq("owner_id", actor.profileId);

  if (error) {
    return { error: error.message, ok: false as const };
  }

  revalidateSwipePaths();
  return { ok: true as const };
}

export async function deleteSwipeDraftAction(swipeId: string) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  const record = await assertOwnsSwipeItem(actor.profileId, swipeId);

  if (record.status !== "draft") {
    return { error: "Chỉ xóa được bản nháp.", ok: false as const };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("swipe_items")
    .delete()
    .eq("id", swipeId)
    .eq("owner_id", actor.profileId);

  if (error) {
    return { error: error.message, ok: false as const };
  }

  revalidateSwipePaths();
  return { ok: true as const };
}

export async function loadChaptersForSwipeStoryAction(storyId: string) {
  const actor = await getActor();

  if (!actor.ok) {
    return { chapters: [], error: actor.error };
  }

  if (!storyId) {
    return { chapters: [], error: null };
  }

  const { getChaptersForSwipeStory } = await import("@/lib/swipe/get-swipe-form-data");
  const result = await getChaptersForSwipeStory(storyId, actor.creatorProfile);

  return result;
}

export async function duplicateSwipeItemAction(swipeId: string) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  await assertOwnsSwipeItem(actor.profileId, swipeId);
  const supabase = await createClient();
  const result = await duplicateSwipeItem(supabase, actor.profileId, swipeId);

  if (!result.id) {
    return { error: result.error ?? "Không nhân bản được.", ok: false as const };
  }

  revalidateSwipePaths();
  redirect(studioPath(`/swipe/${result.id}/edit`));
}
