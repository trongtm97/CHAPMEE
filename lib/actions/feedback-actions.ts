"use server";

import { revalidatePath } from "next/cache";
import type { SubmitFeedbackState } from "@/lib/actions/feedback-actions.types";
import { sanitizePlainContent } from "@/lib/editor/sanitize-content";
import {
  ALL_FEEDBACK_TYPES,
  normalizeFeedbackType
} from "@/lib/feedback/constants";
import { getContactSettings } from "@/lib/settings/get-contact-settings";
import { isAllowedFeedbackType } from "@/lib/settings/validate-contact-settings";
import type { FeedbackType } from "@/types/contact-settings";

export type { SubmitFeedbackState };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseCategory(value: FormDataEntryValue | null): FeedbackType {
  const raw = String(value ?? "other");
  const normalized = normalizeFeedbackType(raw);
  if (ALL_FEEDBACK_TYPES.includes(normalized)) {
    return normalized;
  }
  return "other";
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function checkRateLimits(
  userId: string | null,
  dailyLimit: number,
  cooldownSeconds: number
) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const now = Date.now();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  if (userId) {
    const { count, error: countError } = await admin
      .from("feedback_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", dayStart.toISOString());

    if (countError) {
      console.error("checkRateLimits count", countError.message);
    } else if ((count ?? 0) >= dailyLimit) {
      return "Bạn đã gửi đủ số góp ý cho phép hôm nay. Vui lòng thử lại ngày mai.";
    }

    const { data: latest, error: latestError } = await admin
      .from("feedback_messages")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestError && latest?.created_at) {
      const elapsed = now - new Date(latest.created_at).getTime();
      if (elapsed < cooldownSeconds * 1000) {
        const wait = Math.ceil((cooldownSeconds * 1000 - elapsed) / 1000);
        return `Vui lòng đợi ${wait} giây trước khi gửi góp ý tiếp theo.`;
      }
    }
  }

  return null;
}

export async function submitFeedbackAction(
  _prevState: SubmitFeedbackState,
  formData: FormData
): Promise<SubmitFeedbackState> {
  const { getCurrentUser } = await import("@/lib/auth/getCurrentUser");
  const { createAdminClient } = await import("@/lib/supabase/admin");

  const { settings } = await getContactSettings({ useCache: true });

  if (!settings.enableFeedbackForm) {
    return { ok: false, message: "Form góp ý hiện không khả dụng." };
  }

  const { user } = await getCurrentUser();

  if (settings.requireLogin && !user) {
    return { ok: false, message: "Vui lòng đăng nhập để gửi góp ý." };
  }

  if (user) {
    const { ActionAccessError, assertActionAccess } = await import(
      "@/lib/auth/assert-action-access"
    );
    try {
      await assertActionAccess("feedback.create");
    } catch (error) {
      if (error instanceof ActionAccessError) {
        return { ok: false, message: error.message };
      }
      throw error;
    }
  }

  const category = parseCategory(formData.get("category"));
  if (!isAllowedFeedbackType(category, settings)) {
    return { ok: false, message: "Loại góp ý này hiện không được phép." };
  }

  const title = sanitizePlainContent(String(formData.get("title") ?? "").trim());
  const message = sanitizePlainContent(String(formData.get("message") ?? "").trim());
  const contactEmail = String(formData.get("contactEmail") ?? "").trim() || null;
  const relatedUrl = String(formData.get("relatedUrl") ?? "").trim() || null;

  if (title.length > 120) {
    return { ok: false, message: "Tiêu đề tối đa 120 ký tự." };
  }

  if (message.length < 10) {
    return { ok: false, message: "Nội dung góp ý cần ít nhất 10 ký tự." };
  }

  if (message.length > 5000) {
    return { ok: false, message: "Nội dung góp ý tối đa 5000 ký tự." };
  }

  if (settings.requireContactEmail) {
    if (!contactEmail) {
      return { ok: false, message: "Vui lòng nhập email liên hệ." };
    }
    if (!EMAIL_PATTERN.test(contactEmail)) {
      return { ok: false, message: "Email liên hệ không hợp lệ." };
    }
  } else if (contactEmail && !EMAIL_PATTERN.test(contactEmail)) {
    return { ok: false, message: "Email liên hệ không hợp lệ." };
  }

  if (relatedUrl && !isValidHttpUrl(relatedUrl)) {
    return { ok: false, message: "URL trang liên quan không hợp lệ." };
  }

  if (settings.requireScreenshot) {
    return {
      ok: false,
      message:
        "Chức năng upload ảnh chụp màn hình đang được phát triển. Vui lòng thử lại sau."
    };
  }

  const rateLimitError = await checkRateLimits(
    user?.id ?? null,
    settings.dailyLimitPerUser,
    settings.cooldownSeconds
  );
  if (rateLimitError) {
    return { ok: false, message: rateLimitError };
  }

  let userAgent: string | null = null;
  try {
    const { headers } = await import("next/headers");
    const headerStore = await headers();
    userAgent = headerStore.get("user-agent");
  } catch {
    userAgent = null;
  }

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("feedback_messages")
    .insert({
      user_id: user?.id ?? null,
      category,
      title: title || null,
      message,
      contact_email: contactEmail,
      related_url: relatedUrl,
      status: "new",
      priority: "normal",
      source: "app",
      user_agent: userAgent,
      device_info: userAgent ? { user_agent: userAgent } : {}
    })
    .select("id")
    .single();

  if (error) {
    console.error("submitFeedbackAction", error.message);
    return {
      ok: false,
      message: "Không thể gửi góp ý. Vui lòng thử lại sau."
    };
  }

  if (user) {
    const { createNotification } = await import(
      "@/lib/notifications/create-notification"
    );
    await createNotification(user.id, "feedback_received", {
      title: "ChapMee đã nhận góp ý của bạn",
      body: "Cảm ơn bạn! Chúng tôi sẽ xem xét và phản hồi khi có thể.",
      targetType: "feedback",
      targetId: inserted.id,
      actionUrl: "/me"
    });
  }

  revalidatePath("/me");
  revalidatePath("/admin/feedback");
  revalidatePath("/admin/settings/contact");

  return { ok: true, message: "ChapMee đã nhận góp ý của bạn." };
}
