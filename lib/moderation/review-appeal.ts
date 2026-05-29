"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-permission";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { createNotification } from "@/lib/notifications/create-notification";
import { createClient } from "@/lib/supabase/server";

export async function reviewAppealAction(formData: FormData) {
  const guard = await requirePermission("moderation.appeal.review", {
    returnTo: "/admin/moderation"
  });
  if (!guard.ok || !guard.context) {
    throw new Error(guard.error ?? "Không có quyền.");
  }

  const appealId = String(formData.get("appeal_id") ?? "");
  const decision = String(formData.get("decision") ?? "") as "accepted" | "rejected";
  const reviewNote = String(formData.get("review_note") ?? "").trim() || null;

  if (!appealId || !["accepted", "rejected"].includes(decision)) {
    throw new Error("Thiếu thông tin xử lý khiếu nại.");
  }

  const supabase = await createClient();
  const { data: appeal } = await supabase
    .from("moderation_appeals")
    .select("id, user_id, violation_id")
    .eq("id", appealId)
    .maybeSingle();

  if (!appeal) {
    throw new Error("Không tìm thấy khiếu nại.");
  }

  await supabase
    .from("moderation_appeals")
    .update({
      status: decision,
      reviewed_by: guard.context.userId,
      review_note: reviewNote
    })
    .eq("id", appealId);

  if (decision === "accepted") {
    const { data: violation } = await supabase
      .from("violations")
      .select("id, user_id")
      .eq("id", appeal.violation_id)
      .maybeSingle();

    if (violation) {
      await supabase
        .from("account_strikes")
        .update({ is_active: false })
        .eq("violation_id", violation.id);

      await supabase
        .from("account_restrictions")
        .update({ is_active: false })
        .eq("violation_id", violation.id);

      await supabase
        .from("profiles")
        .update({ status: "active" })
        .eq("id", violation.user_id)
        .in("status", ["suspended", "banned"]);
    }
  }

  await createNotification(appeal.user_id, "community_guideline_update", {
    title:
      decision === "accepted"
        ? "Khiếu nại được chấp nhận"
        : "Khiếu nại bị từ chối",
    body:
      reviewNote ??
      (decision === "accepted"
        ? "Một số hạn chế đã được gỡ. Cảm ơn bạn đã kiên nhẫn."
        : "Chúng tôi đã xem xét và giữ nguyên quyết định trước đó."),
    actionUrl: "/me/account-status"
  });

  await logAdminAction({
    actorId: guard.context.userId,
    action: "review_appeal",
    targetType: "moderation_appeal",
    targetId: appealId,
    metadata: { decision, reviewNote }
  });

  revalidatePath("/admin/moderation");
  revalidatePath("/me/account-status");
}
