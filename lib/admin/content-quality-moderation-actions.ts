"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import {
  applyModeratorLowQualityConfirmation,
  restoreStoryQuality
} from "@/lib/content-quality/apply-low-quality-action";
import { calculateQualitySignals } from "@/lib/content-quality/calculate-quality-signals";
import { createClient } from "@/lib/data/server";
import type { ContentQualityReasonCode } from "@/types/content-quality";

async function assertModerator() {
  const { profile } = await getCurrentUser();

  if (!profile?.id) {
    return { error: "Cần đăng nhập.", ok: false as const };
  }

  const db = await createClient();
  const { data: allowed } = await db.rpc("user_has_permission", {
    input_user_id: profile.id,
    permission_code: "moderation.action.create"
  });

  if (!allowed) {
    return { error: "Không có quyền moderation.", ok: false as const };
  }

  return { ok: true as const, profileId: profile.id, db };
}

export async function confirmStoryLowQualityAction(input: {
  storyId: string;
  reasonCodes?: ContentQualityReasonCode[];
  moderatorNote?: string;
}) {
  const actor = await assertModerator();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  const { data: story } = await actor.db
    .from("stories")
    .select("id, creator_id, creator_profiles(user_id)")
    .eq("id", input.storyId)
    .maybeSingle();

  if (!story) {
    return { error: "Không tìm thấy truyện.", ok: false as const };
  }

  const creator = Array.isArray(story.creator_profiles)
    ? story.creator_profiles[0]
    : story.creator_profiles;

  if (!creator?.user_id) {
    return { error: "Không xác định được tác giả.", ok: false as const };
  }

  const calculated = await calculateQualitySignals({
    storyId: input.storyId,
    db: actor.db,
    targetId: input.storyId,
    targetType: "story"
  });

  const reasonCodes =
    input.reasonCodes && input.reasonCodes.length > 0
      ? input.reasonCodes
      : calculated.suggestedReasons;

  const result = await applyModeratorLowQualityConfirmation({
    authorId: story.creator_id,
    authorUserId: creator.user_id,
    moderatorNote: input.moderatorNote,
    reasonCodes,
    reviewedBy: actor.profileId,
    storyId: input.storyId,
    db: actor.db,
    targetId: input.storyId,
    targetType: "story"
  });

  if (!result.ok) {
    return { error: result.error, ok: false as const };
  }

  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/stories/${input.storyId}`);
  revalidatePath("/studio/content-health");

  return { ok: true as const, attempt: result.attempt, status: result.status };
}

export async function restoreStoryQualityAction(input: {
  storyId: string;
  moderatorNote?: string;
}) {
  const actor = await assertModerator();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  const { data: story } = await actor.db
    .from("stories")
    .select("creator_id")
    .eq("id", input.storyId)
    .maybeSingle();

  if (!story) {
    return { error: "Không tìm thấy truyện.", ok: false as const };
  }

  await restoreStoryQuality({
    authorId: story.creator_id,
    moderatorNote: input.moderatorNote,
    reviewedBy: actor.profileId,
    storyId: input.storyId,
    db: actor.db
  });

  revalidatePath("/admin/content");
  revalidatePath("/studio/content-health");

  return { ok: true as const };
}
