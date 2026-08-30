"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/data/server";
import { syncProfileVerificationCache } from "@/lib/verification/sync-profile-cache";

function hasPerm(permissions: string[], code: string) {
  return permissions.includes(code);
}

export async function revokeVerificationAction(input: {
  requestId: string;
  revokeReason: string;
  reasonCode?: string;
  revokePublicBadge?: boolean;
  adminNote?: string | null;
}) {
  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }
  const perms = ctx.permissions as string[];
  if (!hasPerm(perms, "admin.user.update") && !hasPerm(perms, "verification_grant")) {
    return { ok: false, error: "Bạn không có quyền thu hồi xác thực." };
  }

  const reason = input.revokeReason.trim();
  if (!reason) {
    return { ok: false, error: "Vui lòng nhập lý do thu hồi." };
  }

  const db = await createClient();
  const { data: before } = await db
    .from("account_verifications")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle();

  if (!before) {
    return { ok: false, error: "Không tìm thấy bản ghi xác thực." };
  }

  if (before.status !== "approved") {
    return { ok: false, error: "Chỉ thu hồi được xác thực đang hiệu lực." };
  }

  const revokeBadge = input.revokePublicBadge ?? true;
  const now = new Date().toISOString();
  const { error } = await db
    .from("account_verifications")
    .update({
      status: "revoked",
      revoked_at: now,
      revoked_by: ctx.userId,
      revoke_reason: input.reasonCode ?? reason,
      admin_note: input.adminNote?.trim() || before.admin_note,
      display_badge: revokeBadge ? false : before.display_badge
    })
    .eq("id", input.requestId);

  if (error) {
    return { ok: false, error: "Không thể thu hồi xác thực." };
  }

  await syncProfileVerificationCache(String(before.user_id));

  const { data: after } = await db
    .from("account_verifications")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle();

  await createAdminAuditLog({
    action: "verification_revoked",
    targetType: "account_verification",
    targetId: input.requestId,
    note: input.adminNote?.trim() || null,
    before: before as Record<string, unknown>,
    after: (after as Record<string, unknown> | null) ?? null,
    metadata: {
      target_user_id: before.user_id,
      verification_id: input.requestId,
      reason
    }
  });

  if (revokeBadge) {
    await createAdminAuditLog({
      action: "verification_public_badge_disabled",
      targetType: "account_verification",
      targetId: input.requestId,
      metadata: { target_user_id: before.user_id, verification_id: input.requestId }
    });
  }

  revalidatePath("/admin/verifications");
  revalidatePath("/admin/audit");
  revalidatePath("/studio/settings/verification");

  return { ok: true, error: null };
}
