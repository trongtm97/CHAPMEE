"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import {
  assertOwnsReelsItem,
  assertStoryLinkForReels
} from "@/lib/reels/assert-reels-ownership";
import { publishReelsItem } from "@/lib/reels/publish-reels-item";
import {
  duplicateReelsItem,
  insertReelsItem,
  updateReelsItemRow
} from "@/lib/reels/reels-item-mutations";
import { schedulePublication } from "@/lib/studio/scheduling/schedule-publication";
import { REELS_PUBLIC_PATH, studioReelsPath } from "@/lib/routes/reels-paths";
import { createClient } from "@/lib/data/server";
import { parseVietnamScheduleInput } from "@/lib/studio/scheduling/timezone";
import { STUDIO_DEFAULT_TIMEZONE } from "@/types/scheduling";
import type { ReelsFormValues, ReelsSourceType } from "@/types/reels";

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

function parseReelsFormData(formData: FormData): Partial<ReelsFormValues> {
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
    sourceType: (sourceType || "manual") as ReelsSourceType
  };
}

function revalidateReelsPaths() {
  revalidatePath(studioReelsPath());
  revalidatePath(REELS_PUBLIC_PATH);
}

export async function createReelsItemAction(formData: FormData) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  const values = parseReelsFormData(formData);
  const source = parseSourceMeta(formData);
  const intent = String(formData.get("intent") ?? "draft");

  if (values.storyId) {
    await assertStoryLinkForReels(actor.creatorProfile, values.storyId, values.chapterId);
  }

  const db = await createClient();

  if (intent === "publish") {
    const draftInsert = await insertReelsItem(db, actor.profileId, values, {
      sourceType: source.sourceType,
      sourceTextEnd: source.sourceTextEnd,
      sourceTextStart: source.sourceTextStart,
      status: "draft"
    });

    if (!draftInsert.id) {
      return { error: draftInsert.error ?? "Không t?o du?c Reels.", ok: false as const };
    }

    const published = await publishReelsItem(
      db,
      draftInsert.id,
      actor.profileId,
      values
    );

    if (!published.ok) {
      return { error: published.error, ok: false as const };
    }

    revalidateReelsPaths();
    redirect(studioReelsPath(`/${draftInsert.id}/edit?published=1`));
  }

  if (intent === "schedule") {
    const scheduleDate = String(formData.get("schedule_date") ?? "");
    const scheduleTime = String(formData.get("schedule_time") ?? "");
    const scheduledAt = parseVietnamScheduleInput(scheduleDate, scheduleTime);

    if (!scheduledAt) {
      return { error: "Ngày gi? lên l?ch không h?p l?.", ok: false as const };
    }

    const created = await insertReelsItem(db, actor.profileId, values, {
      sourceType: source.sourceType,
      sourceTextEnd: source.sourceTextEnd,
      sourceTextStart: source.sourceTextStart,
      scheduledAt,
      status: "scheduled"
    });

    if (!created.id) {
      return { error: created.error ?? "Không t?o du?c Reels.", ok: false as const };
    }

    const scheduled = await schedulePublication({
      creatorProfileId: actor.creatorProfile.id,
      profileId: actor.profileId,
      scheduledAt,
      storyId: values.storyId,
      db,
      targetId: created.id,
      targetType: "reels",
      timezone: STUDIO_DEFAULT_TIMEZONE
    });

    if (!scheduled.ok) {
      return { error: scheduled.error ?? "Không th? lên l?ch Reels.", ok: false as const };
    }

    revalidateReelsPaths();
    redirect(studioReelsPath());
  }

  const created = await insertReelsItem(db, actor.profileId, values, {
    sourceType: source.sourceType,
    sourceTextEnd: source.sourceTextEnd,
    sourceTextStart: source.sourceTextStart,
    status: "draft"
  });

  if (!created.id) {
    return { error: created.error ?? "Không t?o du?c Reels.", ok: false as const };
  }

  revalidateReelsPaths();
  redirect(studioReelsPath(`/${created.id}/edit`));
}

/** Tạo nháp nhanh từ drawer — không redirect. */
export async function createReelsItemQuickAction(formData: FormData) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, id: null, ok: false as const };
  }

  const values = parseReelsFormData(formData);
  const source = parseSourceMeta(formData);

  if (!values.storyId) {
    return { error: "Chọn truyện trước.", id: null, ok: false as const };
  }

  if (!values.hook?.trim()) {
    return { error: "Hook không du?c d? tr?ng.", id: null, ok: false as const };
  }

  if (!values.body?.trim()) {
    return { error: "N?i dung trích d?n không du?c d? tr?ng.", id: null, ok: false as const };
  }

  await assertStoryLinkForReels(actor.creatorProfile, values.storyId, values.chapterId);

  const db = await createClient();
  const created = await insertReelsItem(db, actor.profileId, values, {
    sourceType: source.sourceType,
    sourceTextEnd: source.sourceTextEnd,
    sourceTextStart: source.sourceTextStart,
    status: "draft"
  });

  if (!created.id) {
    return {
      error: created.error ?? "Không t?o du?c Reels.",
      id: null,
      ok: false as const
    };
  }

  revalidateReelsPaths();
  return { id: created.id, ok: true as const };
}

export async function updateReelsItemAction(formData: FormData) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  const reelId = String(formData.get("reel_id") ?? "");
  if (!reelId) {
    return { error: "Thi?u mã Reels.", ok: false as const };
  }

  await assertOwnsReelsItem(actor.profileId, reelId);

  const values = parseReelsFormData(formData);
  const source = parseSourceMeta(formData);
  const intent = String(formData.get("intent") ?? "draft");

  if (values.storyId) {
    await assertStoryLinkForReels(actor.creatorProfile, values.storyId, values.chapterId);
  }

  const db = await createClient();

  if (intent === "publish") {
    const published = await publishReelsItem(db, reelId, actor.profileId, values);

    if (!published.ok) {
      return { error: published.error, ok: false as const };
    }

    revalidateReelsPaths();
    return { ok: true as const };
  }

  if (intent === "schedule") {
    const scheduleDate = String(formData.get("schedule_date") ?? "");
    const scheduleTime = String(formData.get("schedule_time") ?? "");
    const scheduledAt = parseVietnamScheduleInput(scheduleDate, scheduleTime);

    if (!scheduledAt) {
      return { error: "Ngày gi? lên l?ch không h?p l?.", ok: false as const };
    }

    const updated = await updateReelsItemRow(db, reelId, actor.profileId, values, {
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
      db,
      targetId: reelId,
      targetType: "reels",
      timezone: STUDIO_DEFAULT_TIMEZONE
    });

    if (!scheduled.ok) {
      return { error: scheduled.error ?? "Không th? lên l?ch Reels.", ok: false as const };
    }

    revalidateReelsPaths();
    return { ok: true as const };
  }

  const updated = await updateReelsItemRow(db, reelId, actor.profileId, values, {
    sourceTextEnd: source.sourceTextEnd,
    sourceTextStart: source.sourceTextStart,
    sourceType: source.sourceType,
    status: "draft"
  });

  if (!updated.ok) {
    return { error: updated.error, ok: false as const };
  }

  revalidateReelsPaths();
  return { ok: true as const };
}

export async function unhideReelsItemAction(reelId: string) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  await assertOwnsReelsItem(actor.profileId, reelId);
  const db = await createClient();

  const { error } = await db
    .from("reels_items")
    .update({ status: "published" })
    .eq("id", reelId)
    .eq("owner_id", actor.profileId)
    .eq("status", "hidden");

  if (error) {
    return { error: error.message, ok: false as const };
  }

  revalidateReelsPaths();
  return { ok: true as const };
}

export async function hideReelsItemAction(reelId: string) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  await assertOwnsReelsItem(actor.profileId, reelId);
  const db = await createClient();

  const { error } = await db
    .from("reels_items")
    .update({ status: "hidden" })
    .eq("id", reelId)
    .eq("owner_id", actor.profileId);

  if (error) {
    return { error: error.message, ok: false as const };
  }

  revalidateReelsPaths();
  return { ok: true as const };
}

export async function deleteReelsDraftAction(reelId: string) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  const record = await assertOwnsReelsItem(actor.profileId, reelId);

  if (record.status !== "draft") {
    return { error: "Ch? xóa du?c b?n nháp.", ok: false as const };
  }

  const db = await createClient();
  const { error } = await db
    .from("reels_items")
    .delete()
    .eq("id", reelId)
    .eq("owner_id", actor.profileId);

  if (error) {
    return { error: error.message, ok: false as const };
  }

  revalidateReelsPaths();
  return { ok: true as const };
}

export async function loadChaptersForReelsStoryAction(storyId: string) {
  const actor = await getActor();

  if (!actor.ok) {
    return { chapters: [], error: actor.error };
  }

  if (!storyId) {
    return { chapters: [], error: null };
  }

  const { getChaptersForReelsStory } = await import("@/lib/reels/get-reels-form-data");
  const result = await getChaptersForReelsStory(storyId, actor.creatorProfile);

  return result;
}

export async function duplicateReelsItemAction(reelId: string) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  await assertOwnsReelsItem(actor.profileId, reelId);
  const db = await createClient();
  const result = await duplicateReelsItem(db, actor.profileId, reelId);

  if (!result.id) {
    return { error: result.error ?? "Không nhân b?n du?c.", ok: false as const };
  }

  revalidateReelsPaths();
  redirect(studioReelsPath(`/${result.id}/edit`));
}
