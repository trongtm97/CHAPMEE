"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { requirePermission } from "@/lib/auth/require-permission";
import { applyModerationAction } from "@/lib/moderation/apply-action";
import { createClient } from "@/lib/supabase/server";
import type { StoryAgeRating } from "@/types/moderation";

const VALID_RATINGS = new Set<StoryAgeRating>([
  "all_ages",
  "teen_13",
  "young_adult_16",
  "mature_18"
]);

const REPEAT_WRONG_RATING_THRESHOLD = 2;

export async function correctStoryAgeRatingAction(formData: FormData) {
  const guard = await requirePermission("moderation.action.create", {
    returnTo: "/admin/moderation"
  });
  if (!guard.ok || !guard.context) {
    throw new Error(guard.error ?? "Không có quyền.");
  }

  const storyId = String(formData.get("story_id") ?? "");
  const reportId = String(formData.get("report_id") ?? "") || null;
  const userId = String(formData.get("user_id") ?? "");
  const newRating = String(formData.get("new_age_rating") ?? "") as StoryAgeRating;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!storyId || !VALID_RATINGS.has(newRating)) {
    throw new Error("Thiếu thông tin cập nhật phân loại.");
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("stories")
    .update({ age_rating: newRating })
    .eq("id", storyId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (reportId) {
    await supabase
      .from("reports")
      .update({
        status: "resolved_action_taken",
        assigned_to: guard.context.userId
      })
      .eq("id", reportId);
  }

  const { count: wrongRatingCount } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("target_type", "story")
    .eq("target_id", storyId)
    .or("reason_code.eq.wrong_age_rating,reason.eq.wrong_age_rating")
    .in("status", [
      "resolved_action_taken",
      "resolved",
      "reviewed"
    ]);

  if (
    userId &&
    (wrongRatingCount ?? 0) >= REPEAT_WRONG_RATING_THRESHOLD
  ) {
    await applyModerationAction({
      moderatorId: guard.context.userId,
      userId,
      targetType: "story",
      targetId: storyId,
      policyArea: "age_rating",
      severity: "moderate",
      action: "warn",
      note:
        note ??
        "Đánh sai phân loại độ tuổi nhiều lần — admin đã chỉnh phân loại.",
      reportId
    });
  }

  await logAdminAction({
    actorId: guard.context.userId,
    action: "correct_age_rating",
    targetType: "story",
    targetId: storyId,
    metadata: { new_age_rating: newRating, reportId, wrongRatingCount }
  });

  revalidatePath("/admin/moderation");
  revalidatePath(`/stories`);
}
