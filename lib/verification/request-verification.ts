"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { syncProfileVerificationCache } from "@/lib/verification/sync-profile-cache";
import {
  areVerificationRequestsEnabled,
  getUserVerificationSummary
} from "@/lib/verification/get-user-verification";
import { VERIFICATION_TYPES, type VerificationType } from "@/types/verification";

export async function requestVerificationAction(input: {
  verificationType: VerificationType;
  requestReason: string;
}) {
  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  if (!VERIFICATION_TYPES.includes(input.verificationType)) {
    return { ok: false, error: "Loại xác thực không hợp lệ." };
  }

  const enabled = await areVerificationRequestsEnabled();
  if (!enabled) {
    return {
      ok: false,
      error: "Hệ thống chưa mở nhận yêu cầu xác thực. Vui lòng liên hệ ChapMee."
    };
  }

  const reason = input.requestReason.trim();
  if (reason.length < 20) {
    return {
      ok: false,
      error: "Vui lòng mô tả lý do xác thực (tối thiểu 20 ký tự)."
    };
  }

  const summary = await getUserVerificationSummary(ctx.userId);
  if (summary.publicBadge) {
    return { ok: false, error: "Tài khoản đã được xác thực." };
  }

  if (summary.latestPending) {
    return { ok: false, error: "Bạn đã có yêu cầu đang chờ duyệt." };
  }

  const hasActiveSameType = summary.records.some(
    (row) =>
      row.verification_type === input.verificationType &&
      (row.status === "pending" || row.status === "approved")
  );

  if (hasActiveSameType) {
    return {
      ok: false,
      error: "Đã có yêu cầu hoặc xác thực cùng loại cho tài khoản này."
    };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("account_verifications").insert({
    user_id: ctx.userId,
    verification_type: input.verificationType,
    status: "pending",
    display_badge: true,
    request_reason: reason,
    submitted_at: now
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  await syncProfileVerificationCache(ctx.userId);
  revalidatePath("/studio/settings/verification");
  return { ok: true, error: null };
}
