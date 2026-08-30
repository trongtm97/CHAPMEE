"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { getAuthorContentQualityDetail } from "@/lib/content-quality/get-author-content-health";
import { notifyAuthorContentQuality } from "@/lib/content-quality/notify-author";
import { studioPath } from "@/lib/studio/constants";
import { createClient } from "@/lib/data/server";

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

export async function resubmitContentQualityReviewAction(input: {
  storyId: string;
  authorNote: string;
}) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  const note = input.authorNote.trim();

  if (note.length < 20) {
    return {
      error: "Ghi chú cần ít nhất 20 ký tự mô tả phần đã sửa.",
      ok: false as const
    };
  }

  const detail = await getAuthorContentQualityDetail(
    actor.creatorProfile,
    input.storyId
  );

  if (!detail) {
    return { error: "Không tìm thấy truyện.", ok: false as const };
  }

  if (!detail.canResubmit) {
    return {
      error: "Truyện không ở trạng thái cho phép gửi xét duyệt lại.",
      ok: false as const
    };
  }

  const db = await createClient();
  const status = "pending_quality_review";

  await db
    .from("stories")
    .update({
      quality_status: status,
      quality_updated_at: new Date().toISOString()
    })
    .eq("id", input.storyId)
    .eq("creator_id", actor.creatorProfile.id);

  await db.from("content_quality_reviews").insert({
    action_taken: "resubmitted",
    attempt_number: detail.attemptCount,
    author_id: actor.creatorProfile.id,
    author_note: note,
    reason_codes: detail.reasonCodes,
    status,
    story_id: input.storyId,
    target_id: input.storyId,
    target_type: "story"
  });

  await notifyAuthorContentQuality({
    attemptNumber: detail.attemptCount,
    authorUserId: actor.profileId,
    status,
    storyId: input.storyId,
    storyTitle: detail.title
  });

  revalidatePath(studioPath("/content-health"));

  return { ok: true as const };
}

export async function submitContentQualityAppealAction(input: {
  storyId: string;
  message: string;
}) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  const message = input.message.trim();

  if (message.length < 40) {
    return {
      error: "Khiếu nại cần mô tả rõ lý do (ít nhất 40 ký tự).",
      ok: false as const
    };
  }

  const detail = await getAuthorContentQualityDetail(
    actor.creatorProfile,
    input.storyId
  );

  if (!detail?.canAppeal) {
    return {
      error: "Truyện không đủ điều kiện gửi khiếu nại.",
      ok: false as const
    };
  }

  const db = await createClient();

  const { error } = await db.from("content_quality_appeals").insert({
    author_id: actor.creatorProfile.id,
    message,
    status: "pending",
    story_id: input.storyId
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Bạn đã gửi khiếu nại cho truyện này.", ok: false as const };
    }

    return { error: error.message, ok: false as const };
  }

  await db
    .from("stories")
    .update({
      quality_status: "appealed",
      quality_updated_at: new Date().toISOString()
    })
    .eq("id", input.storyId);

  await db.from("content_quality_reviews").insert({
    action_taken: "resubmitted",
    attempt_number: detail.attemptCount,
    author_id: actor.creatorProfile.id,
    author_note: message,
    reason_codes: detail.reasonCodes,
    status: "appealed",
    story_id: input.storyId,
    target_id: input.storyId,
    target_type: "story"
  });

  revalidatePath(studioPath("/content-health"));

  return { ok: true as const };
}
