"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/data/server";

export type AppealFormState = {
  error: string | null;
  success: string | null;
};

export async function createAppealAction(
  _prev: AppealFormState,
  formData: FormData
): Promise<AppealFormState> {
  const violationId = String(formData.get("violation_id") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!violationId || !message) {
    return { error: "Vui lòng nhập lý do khiếu nại.", success: null };
  }

  if (message.length < 20) {
    return {
      error: "Khiếu nại cần ít nhất 20 ký tự để chúng tôi xem xét.",
      success: null
    };
  }

  const db = await createClient();
  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) {
    redirect("/login?next=/me/account-status");
  }

  const { data: violation } = await db
    .from("violations")
    .select("id, user_id")
    .eq("id", violationId)
    .maybeSingle();

  if (!violation || violation.user_id !== user.id) {
    return { error: "Không tìm thấy vi phạm để khiếu nại.", success: null };
  }

  const { data: existing } = await db
    .from("moderation_appeals")
    .select("id")
    .eq("violation_id", violationId)
    .eq("user_id", user.id)
    .in("status", ["open", "reviewing"])
    .maybeSingle();

  if (existing) {
    return {
      error: null,
      success: "Bạn đã gửi khiếu nại cho vi phạm này. Chúng tôi sẽ phản hồi sớm."
    };
  }

  const { error } = await db.from("moderation_appeals").insert({
    user_id: user.id,
    violation_id: violationId,
    message
  });

  if (error) {
    return { error: error.message, success: null };
  }

  revalidatePath("/me/account-status");
  revalidatePath("/admin/moderation");

  return {
    error: null,
    success: "Đã gửi khiếu nại. ChapMee sẽ xem xét trong thời gian sớm nhất."
  };
}
