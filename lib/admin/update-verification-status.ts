"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { syncProfileVerificationCache } from "@/lib/verification/sync-profile-cache";

async function assertCanManage() {
  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) throw new Error("Bạn cần đăng nhập.");
  const perms = ctx.permissions as string[];
  if (!hasPerm(perms, "admin.user.update") && !hasPerm(perms, "verification_grant")) {
    throw new Error("Bạn không có quyền quản lý xác thực.");
  }
  return ctx;
}

function hasPerm(permissions: string[], code: string) {
  return permissions.includes(code);
}

export async function requestVerificationMoreInfoAction(input: {
  requestId: string;
  message: string;
  deadline?: string | null;
  adminNote?: string | null;
}) {
  try {
    const actor = await assertCanManage();
    const message = input.message.trim();
    if (!message) {
      return { ok: false, error: "Vui lòng nhập nội dung cần bổ sung." };
    }

    const supabase = await createClient();
    const { data: before } = await supabase
      .from("account_verifications")
      .select("*")
      .eq("id", input.requestId)
      .maybeSingle();

    if (!before) {
      return { ok: false, error: "Không tìm thấy yêu cầu." };
    }

    if (!["pending", "needs_more_info"].includes(String(before.status))) {
      return { ok: false, error: "Yêu cầu không ở trạng thái có thể yêu cầu bổ sung." };
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("account_verifications")
      .update({
        status: "needs_more_info",
        public_note: message,
        admin_note: input.adminNote?.trim() || before.admin_note,
        needs_more_info_deadline: input.deadline ?? null,
        reviewed_at: now,
        reviewed_by: actor.userId
      })
      .eq("id", input.requestId);

    if (error) {
      if (process.env.NODE_ENV === "development") console.error("[needsMoreInfo]", error);
      return { ok: false, error: "Không thể gửi yêu cầu bổ sung." };
    }

    await syncProfileVerificationCache(String(before.user_id));

    const { data: after } = await supabase
      .from("account_verifications")
      .select("*")
      .eq("id", input.requestId)
      .maybeSingle();

    await createAdminAuditLog({
      action: "verification_needs_more_info",
      targetType: "account_verification",
      targetId: input.requestId,
      note: input.adminNote?.trim() || null,
      before: before as Record<string, unknown>,
      after: (after as Record<string, unknown> | null) ?? null,
      metadata: {
        target_user_id: before.user_id,
        verification_id: input.requestId,
        reason: message
      }
    });

    revalidatePath("/admin/verifications");
    revalidatePath("/studio/settings/verification");
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể gửi yêu cầu bổ sung."
    };
  }
}

export async function logVerificationViewedAction(verificationId: string) {
  try {
    const ctx = await getCurrentAuthContext();
    if (!ctx?.userId) return { ok: false };

    const supabase = await createClient();
    const { data } = await supabase
      .from("account_verifications")
      .select("user_id")
      .eq("id", verificationId)
      .maybeSingle();

    if (!data) return { ok: false };

    await createAdminAuditLog({
      action: "verification_request_viewed",
      targetType: "account_verification",
      targetId: verificationId,
      metadata: {
        target_user_id: data.user_id,
        verification_id: verificationId
      }
    });

    return { ok: true };
  } catch {
    return { ok: false };
  }
}
