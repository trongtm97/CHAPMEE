"use server";

import { revalidatePath } from "next/cache";
import type { SubmitFeedbackState } from "@/lib/actions/feedback-actions.types";
import type { FeedbackCategory } from "@/types/contact-settings";

export type { SubmitFeedbackState };

function parseCategory(value: FormDataEntryValue | null): FeedbackCategory {
  if (value === "bug" || value === "feature" || value === "feedback") {
    return value;
  }
  return "feedback";
}

export async function submitFeedbackAction(
  _prevState: SubmitFeedbackState,
  formData: FormData
): Promise<SubmitFeedbackState> {
  const { getCurrentUser } = await import("@/lib/auth/getCurrentUser");
  const { createClient } = await import("@/lib/supabase/server");

  const { ActionAccessError, assertActionAccess } = await import(
    "@/lib/auth/assert-action-access"
  );

  const { user } = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Vui lòng đăng nhập để gửi góp ý." };
  }

  try {
    await assertActionAccess("feedback.create");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  const message = String(formData.get("message") ?? "").trim();
  const category = parseCategory(formData.get("category"));
  const contactEmail = String(formData.get("contactEmail") ?? "").trim() || null;

  if (message.length < 10) {
    return {
      ok: false,
      message: "Nội dung góp ý cần ít nhất 10 ký tự."
    };
  }

  if (message.length > 2000) {
    return {
      ok: false,
      message: "Nội dung góp ý tối đa 2000 ký tự."
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("feedback_messages").insert({
    user_id: user.id,
    category,
    message,
    contact_email: contactEmail
  });

  if (error) {
    console.error("submitFeedbackAction", error.message);
    return {
      ok: false,
      message: "Không thể gửi góp ý. Vui lòng thử lại sau."
    };
  }

  revalidatePath("/me");
  return { ok: true, message: "Cảm ơn bạn! Góp ý đã được gửi." };
}
