"use server";

import { logAdminAction } from "@/lib/audit/log-admin-action";
import { checkStaffAnyPermission } from "@/lib/auth/staff-guards";
import { notifyAuthorContentQualityMonetization } from "@/lib/content-quality/notify-author-monetization";
import { createClient } from "@/lib/supabase/server";
import type { FreeAccessReason } from "@/types/quality-refund";

async function assertMonetizationAccess() {
  return checkStaffAnyPermission([
    "finance.refund.create",
    "moderation.action.create"
  ]);
}

export async function setContentFreeDueToQuality(input: {
  storyId: string;
  reason: FreeAccessReason;
  authorNote?: string | null;
  adminNote?: string | null;
  notifyAuthor?: boolean;
}) {
  const auth = await assertMonetizationAccess();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select(
      "id, title, creator_id, creator_profiles(id, user_id)"
    )
    .eq("id", input.storyId)
    .maybeSingle();

  if (storyError || !story) {
    return { ok: false, error: storyError?.message ?? "Không tìm thấy truyện." };
  }

  const { error: updateError } = await supabase
    .from("stories")
    .update({
      monetization_status: "free_due_to_quality",
      free_access_reason: input.reason,
      free_access_set_by: auth.userId,
      free_access_set_at: now,
      quality_updated_at: now
    })
    .eq("id", input.storyId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const { data: episodes } = await supabase
    .from("episodes")
    .select("id")
    .eq("story_id", input.storyId);

  const episodeIds = (episodes ?? []).map((e) => e.id as string);
  if (episodeIds.length) {
    await supabase
      .from("chapter_monetization_settings")
      .update({ is_paid: false })
      .in("chapter_id", episodeIds);
  }

  const creator = Array.isArray(story.creator_profiles)
    ? story.creator_profiles[0]
    : story.creator_profiles;

  await supabase.from("content_quality_reviews").insert({
    action_taken: "set_free_due_to_quality",
    attempt_number: 0,
    author_id: story.creator_id,
    author_note: input.authorNote ?? null,
    moderator_note: input.authorNote ?? null,
    reason_codes: ["moderator_confirmed_low_quality"],
    reviewed_by: auth.userId,
    status: "pending_quality_review",
    story_id: input.storyId,
    target_id: input.storyId,
    target_type: "story"
  });

  await logAdminAction({
    actorId: auth.userId,
    action: "quality_content_set_free",
    targetType: "story",
    targetId: input.storyId,
    metadata: {
      quality_case_id: input.storyId,
      reason_code: input.reason,
      note: input.adminNote ?? null,
      author_note: input.authorNote ?? null
    }
  });

  if (input.notifyAuthor !== false && creator?.user_id) {
    await notifyAuthorContentQualityMonetization({
      authorUserId: creator.user_id as string,
      storyId: input.storyId,
      storyTitle: story.title as string,
      kind: "free_access"
    });
  }

  return { ok: true, error: null };
}

export async function restoreContentPaidStatus(input: {
  storyId: string;
  adminNote?: string | null;
}) {
  const auth = await assertMonetizationAccess();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, title, creator_id, monetization_disabled_by_quality")
    .eq("id", input.storyId)
    .maybeSingle();

  if (storyError || !story) {
    return { ok: false, error: storyError?.message ?? "Không tìm thấy truyện." };
  }

  const nextStatus = story.monetization_disabled_by_quality
    ? "disabled_due_to_quality"
    : "paid";

  const { error } = await supabase
    .from("stories")
    .update({
      monetization_status: nextStatus,
      free_access_reason: null,
      free_access_set_by: null,
      free_access_set_at: null,
      quality_updated_at: now
    })
    .eq("id", input.storyId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await supabase.from("content_quality_reviews").insert({
    action_taken: "paid_restored",
    attempt_number: 0,
    author_id: story.creator_id,
    moderator_note: input.adminNote ?? null,
    reason_codes: [],
    reviewed_by: auth.userId,
    status: "restored",
    story_id: input.storyId,
    target_id: input.storyId,
    target_type: "story"
  });

  await logAdminAction({
    actorId: auth.userId,
    action: "quality_content_paid_restored",
    targetType: "story",
    targetId: input.storyId,
    metadata: {
      quality_case_id: input.storyId,
      note: input.adminNote ?? null
    }
  });

  return { ok: true, error: null };
}

export async function disableContentMonetizationDueToQuality(input: {
  storyId: string;
  reason?: FreeAccessReason;
  adminNote?: string | null;
}) {
  const auth = await assertMonetizationAccess();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, creator_id")
    .eq("id", input.storyId)
    .maybeSingle();

  if (storyError || !story) {
    return { ok: false, error: storyError?.message ?? "Không tìm thấy truyện." };
  }

  const { error } = await supabase
    .from("stories")
    .update({
      monetization_disabled_by_quality: true,
      monetization_status: "disabled_due_to_quality",
      monetization_disabled_reason: input.reason ?? "quality_low",
      monetization_disabled_at: now,
      monetization_disabled_by: auth.userId,
      quality_updated_at: now
    })
    .eq("id", input.storyId);

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data: episodes } = await supabase
    .from("episodes")
    .select("id")
    .eq("story_id", input.storyId);

  const episodeIds = (episodes ?? []).map((e) => e.id as string);
  if (episodeIds.length) {
    await supabase
      .from("chapter_monetization_settings")
      .update({ is_paid: false })
      .in("chapter_id", episodeIds);
  }

  await logAdminAction({
    actorId: auth.userId,
    action: "monetization_disable",
    targetType: "story",
    targetId: input.storyId,
    metadata: {
      quality_case_id: input.storyId,
      reason_code: input.reason ?? "quality_low",
      note: input.adminNote ?? null
    }
  });

  return { ok: true, error: null };
}
