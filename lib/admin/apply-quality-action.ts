"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import {
  applyModeratorLowQualityConfirmation,
  applyPermanentQualityHide,
  disableStoryMonetizationByQuality,
  restoreStoryQuality
} from "@/lib/content-quality/apply-low-quality-action";
import { notifyAuthorContentQuality } from "@/lib/content-quality/notify-author";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createClient } from "@/lib/data/server";
import type { ContentQualityReasonCode } from "@/types/content-quality";

async function assertModerator() {
  const { profile } = await getCurrentUser();
  if (!profile?.id) {
    return { ok: false as const, error: "Cần đăng nhập." };
  }

  const db = await createClient();
  const { data: allowed } = await db.rpc("user_has_permission", {
    input_user_id: profile.id,
    permission_code: "moderation.action.create"
  });

  if (!allowed) {
    return { ok: false as const, error: "Không có quyền moderation." };
  }

  return { ok: true as const, profileId: profile.id, db };
}

function requireNote(note: string | undefined, label: string) {
  if (!String(note ?? "").trim()) {
    return { ok: false as const, error: `${label} bắt buộc nhập ghi chú.` };
  }
  return { ok: true as const };
}

async function loadStoryContext(db: Awaited<ReturnType<typeof createClient>>, storyId: string) {
  const { data: story } = await db
    .from("stories")
    .select(
      "id, title, creator_id, quality_status, low_quality_attempt_count, monetization_disabled_by_quality, creator_profiles(user_id)"
    )
    .eq("id", storyId)
    .maybeSingle();

  if (!story) {
    return { ok: false as const, error: "Không tìm thấy truyện." };
  }

  const creator = Array.isArray(story.creator_profiles)
    ? story.creator_profiles[0]
    : story.creator_profiles;

  return {
    ok: true as const,
    story,
    authorId: story.creator_id as string,
    authorUserId: creator?.user_id as string
  };
}

export async function applyAdminQualityAction(input: {
  storyId: string;
  action:
    | "confirm_low_quality"
    | "restore"
    | "permanent_hide"
    | "disable_monetization"
    | "hide_temporarily"
    | "reject_appeal"
    | "approve_appeal";
  moderatorNote?: string;
  reasonCodes?: ContentQualityReasonCode[];
}) {
  const actor = await assertModerator();
  if (!actor.ok) {
    return { ok: false, error: actor.error };
  }

  const ctx = await loadStoryContext(actor.db, input.storyId);
  if (!ctx.ok) {
    return { ok: false, error: ctx.error };
  }

  const before = {
    quality_status: ctx.story.quality_status,
    attempt: ctx.story.low_quality_attempt_count,
    monetization_disabled: ctx.story.monetization_disabled_by_quality
  };

  if (input.action === "confirm_low_quality") {
    const result = await applyModeratorLowQualityConfirmation({
      authorId: ctx.authorId,
      authorUserId: ctx.authorUserId,
      moderatorNote: input.moderatorNote,
      reasonCodes: input.reasonCodes ?? [],
      reviewedBy: actor.profileId,
      storyId: input.storyId,
      db: actor.db,
      targetId: input.storyId,
      targetType: "story"
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    await createAdminAuditLog({
      action: result.status === "permanently_hidden_low_quality" ? "permanent_hide" : "quality_status_change",
      targetType: "story",
      targetId: input.storyId,
      note: input.moderatorNote,
      before,
      after: { quality_status: result.status, attempt: result.attempt }
    });

    revalidatePaths(input.storyId);
    return { ok: true, attempt: result.attempt, status: result.status };
  }

  if (input.action === "restore" || input.action === "approve_appeal") {
    await restoreStoryQuality({
      authorId: ctx.authorId,
      moderatorNote: input.moderatorNote,
      reviewedBy: actor.profileId,
      storyId: input.storyId,
      db: actor.db
    });

    if (input.action === "approve_appeal") {
      await actor.db
        .from("content_quality_appeals")
        .update({
          status: "approved",
          reviewed_by: actor.profileId,
          reviewer_note: input.moderatorNote ?? null
        })
        .eq("story_id", input.storyId);
    }

    await createAdminAuditLog({
      action: "quality_status_change",
      targetType: "story",
      targetId: input.storyId,
      note: input.moderatorNote,
      before,
      after: { quality_status: "restored" }
    });

    revalidatePaths(input.storyId);
    return { ok: true };
  }

  if (input.action === "permanent_hide") {
    const noteCheck = requireNote(input.moderatorNote, "Ẩn vĩnh viễn");
    if (!noteCheck.ok) {
      return { ok: false, error: noteCheck.error };
    }

    await applyPermanentQualityHide(actor.db, input.storyId);

    await actor.db.from("content_quality_reviews").insert({
      action_taken: "permanently_hidden",
      attempt_number: 3,
      author_id: ctx.authorId,
      moderator_note: input.moderatorNote,
      reason_codes: input.reasonCodes ?? ["moderator_confirmed_low_quality"],
      reviewed_by: actor.profileId,
      status: "permanently_hidden_low_quality",
      story_id: input.storyId,
      target_id: input.storyId,
      target_type: "story"
    });

    await notifyAuthorContentQuality({
      attemptNumber: 3,
      authorUserId: ctx.authorUserId,
      status: "permanently_hidden_low_quality",
      storyId: input.storyId,
      storyTitle: ctx.story.title as string
    });

    await createAdminAuditLog({
      action: "permanent_hide",
      targetType: "story",
      targetId: input.storyId,
      note: input.moderatorNote,
      before,
      after: { quality_status: "permanently_hidden_low_quality" }
    });

    revalidatePaths(input.storyId);
    return { ok: true };
  }

  if (input.action === "disable_monetization") {
    const noteCheck = requireNote(input.moderatorNote, "Tắt kiếm tiền");
    if (!noteCheck.ok) {
      return { ok: false, error: noteCheck.error };
    }

    await disableStoryMonetizationByQuality(actor.db, input.storyId);

    await actor.db.from("content_quality_reviews").insert({
      action_taken: "monetization_disabled",
      attempt_number: ctx.story.low_quality_attempt_count ?? 0,
      author_id: ctx.authorId,
      moderator_note: input.moderatorNote,
      reason_codes: input.reasonCodes ?? [],
      reviewed_by: actor.profileId,
      status: ctx.story.quality_status,
      story_id: input.storyId,
      target_id: input.storyId,
      target_type: "story"
    });

    await createAdminAuditLog({
      action: "monetization_disable",
      targetType: "story",
      targetId: input.storyId,
      note: input.moderatorNote,
      before,
      after: { monetization_disabled: true }
    });

    revalidatePaths(input.storyId);
    return { ok: true };
  }

  if (input.action === "hide_temporarily") {
    await actor.db
      .from("stories")
      .update({
        visibility: "private",
        quality_status: "pending_quality_review",
        quality_updated_at: new Date().toISOString()
      })
      .eq("id", input.storyId);

    await actor.db.from("content_quality_reviews").insert({
      action_taken: "hidden_temporarily",
      attempt_number: ctx.story.low_quality_attempt_count ?? 0,
      author_id: ctx.authorId,
      moderator_note: input.moderatorNote ?? null,
      reason_codes: input.reasonCodes ?? [],
      reviewed_by: actor.profileId,
      status: "pending_quality_review",
      story_id: input.storyId,
      target_id: input.storyId,
      target_type: "story"
    });

    await createAdminAuditLog({
      action: "quality_status_change",
      targetType: "story",
      targetId: input.storyId,
      note: input.moderatorNote,
      before,
      after: { visibility: "private", quality_status: "pending_quality_review" }
    });

    revalidatePaths(input.storyId);
    return { ok: true };
  }

  if (input.action === "reject_appeal") {
    const noteCheck = requireNote(input.moderatorNote, "Từ chối khiếu nại");
    if (!noteCheck.ok) {
      return { ok: false, error: noteCheck.error };
    }

    await actor.db
      .from("content_quality_appeals")
      .update({
        status: "rejected",
        reviewed_by: actor.profileId,
        reviewer_note: input.moderatorNote
      })
      .eq("story_id", input.storyId);

    await createAdminAuditLog({
      action: "review_appeal",
      targetType: "story",
      targetId: input.storyId,
      note: input.moderatorNote,
      before,
      after: { appeal_status: "rejected" }
    });

    revalidatePaths(input.storyId);
    return { ok: true };
  }

  return { ok: false, error: "Hành động không hợp lệ." };
}

function revalidatePaths(storyId: string) {
  revalidatePath("/admin/content-quality");
  revalidatePath(`/admin/content-quality/${storyId}`);
  revalidatePath("/studio/content-health");
  revalidatePath("/admin/content");
}
