"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/data/server";
import { syncProfileVerificationCache } from "@/lib/verification/sync-profile-cache";
import {
  VERIFICATION_TYPES,
  type VerificationType
} from "@/types/verification";

async function assertAdminUpdate() {
  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) {
    throw new Error("Bạn cần đăng nhập.");
  }
  const perms = ctx.permissions as string[];
  if (!hasPerm(perms, "admin.user.update") && !hasPerm(perms, "verification_grant")) {
    throw new Error("Bạn không có quyền quản lý xác thực.");
  }
  return ctx;
}

function hasPerm(permissions: string[], code: string) {
  return permissions.includes(code);
}

async function assertManualGrant() {
  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) throw new Error("Bạn cần đăng nhập.");
  const perms = ctx.permissions as string[];
  const canGrant =
    hasPerm(perms, "admin.user.update") || hasPerm(perms, "verification_grant");
  if (!canGrant) {
    throw new Error("Bạn không có quyền cấp xác thực thủ công.");
  }
  return ctx;
}

type GrantInput = {
  userId: string;
  verificationType: VerificationType;
  publicLabel?: string | null;
  publicNote?: string | null;
  adminNote?: string | null;
  publicBadgeEnabled?: boolean;
  requestId?: string | null;
  source?: "admin_direct" | "user_request";
};

export async function grantVerificationAction(input: GrantInput) {
  try {
    const isManual = !input.requestId;
    const actor = isManual ? await assertManualGrant() : await assertAdminUpdate();

    if (!VERIFICATION_TYPES.includes(input.verificationType)) {
      return { ok: false, error: "Loại xác thực không hợp lệ." };
    }

    if (isManual && !input.adminNote?.trim()) {
      return { ok: false, error: "Lý do nội bộ là bắt buộc khi cấp thủ công." };
    }

    const db = await createClient();
    const now = new Date().toISOString();
    const displayBadge = input.publicBadgeEnabled ?? true;

    let recordId = input.requestId ?? null;
    let before: Record<string, unknown> | null = null;

    if (recordId) {
      const { data: existing } = await db
        .from("account_verifications")
        .select("*")
        .eq("id", recordId)
        .maybeSingle();

      if (!existing) {
        return { ok: false, error: "Không tìm thấy yêu cầu xác thực." };
      }

      before = existing as Record<string, unknown>;

      const { error } = await db
        .from("account_verifications")
        .update({
          status: "approved",
          display_badge: displayBadge,
          public_label: input.publicLabel?.trim() || null,
          public_note: input.publicNote?.trim() || null,
          admin_note: input.adminNote?.trim() || null,
          reviewed_at: now,
          reviewed_by: actor.userId
        })
        .eq("id", recordId);

      if (error) {
        if (process.env.NODE_ENV === "development") console.error("[grant]", error);
        return { ok: false, error: "Không thể cấp xác thực." };
      }
    } else {
      const { data: conflict } = await db
        .from("account_verifications")
        .select("id, status")
        .eq("user_id", input.userId)
        .eq("verification_type", input.verificationType)
        .in("status", ["pending", "approved"])
        .maybeSingle();

      if (conflict) {
        if (conflict.status === "approved") {
          return { ok: false, error: "Tài khoản đã có xác thực loại này." };
        }

        recordId = String(conflict.id);
        const { error } = await db
          .from("account_verifications")
          .update({
            status: "approved",
            source: "admin_direct",
            display_badge: displayBadge,
            public_label: input.publicLabel?.trim() || null,
            public_note: input.publicNote?.trim() || null,
            admin_note: input.adminNote?.trim() || null,
            reviewed_at: now,
            reviewed_by: actor.userId
          })
          .eq("id", recordId);

        if (error) {
          return { ok: false, error: "Không thể cấp xác thực." };
        }
      } else {
        const { data: inserted, error } = await db
          .from("account_verifications")
          .insert({
            user_id: input.userId,
            verification_type: input.verificationType,
            status: "approved",
            source: input.source ?? "admin_direct",
            display_badge: displayBadge,
            public_label: input.publicLabel?.trim() || null,
            public_note: input.publicNote?.trim() || null,
            admin_note: input.adminNote?.trim() || null,
            reviewed_at: now,
            reviewed_by: actor.userId,
            submitted_at: now
          })
          .select("id")
          .single();

        if (error || !inserted) {
          return { ok: false, error: "Không thể cấp xác thực." };
        }

        recordId = String(inserted.id);
      }
    }

    await syncProfileVerificationCache(input.userId);

    const { data: after } = await db
      .from("account_verifications")
      .select("*")
      .eq("id", recordId)
      .maybeSingle();

    const auditAction = isManual ? "verification_manual_granted" : "verification_approved";

    await createAdminAuditLog({
      action: auditAction,
      targetType: "account_verification",
      targetId: recordId,
      note: input.adminNote?.trim() || null,
      before,
      after: (after as Record<string, unknown> | null) ?? {
        user_id: input.userId,
        verification_type: input.verificationType,
        status: "approved"
      },
      metadata: {
        target_user_id: input.userId,
        verification_id: recordId,
        reason: input.adminNote?.trim() || null
      }
    });

    if (displayBadge) {
      await createAdminAuditLog({
        action: "verification_public_badge_enabled",
        targetType: "account_verification",
        targetId: recordId,
        metadata: { target_user_id: input.userId, verification_id: recordId }
      });
    }

    revalidatePath("/admin/verifications");
    revalidatePath("/admin/audit");
    revalidatePath("/studio/settings/verification");

    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể cấp xác thực."
    };
  }
}

export async function approveVerificationAction(input: {
  requestId: string;
  verificationType?: VerificationType;
  publicLabel?: string | null;
  publicNote?: string | null;
  adminNote?: string | null;
  publicBadgeEnabled?: boolean;
}) {
  const db = await createClient();
  const { data } = await db
    .from("account_verifications")
    .select("user_id, verification_type, public_label, display_badge")
    .eq("id", input.requestId)
    .maybeSingle();

  if (!data) {
    return { ok: false, error: "Không tìm thấy yêu cầu." };
  }

  return grantVerificationAction({
    userId: String(data.user_id),
    verificationType: input.verificationType ?? (data.verification_type as VerificationType),
    publicLabel: input.publicLabel ?? data.public_label,
    publicNote: input.publicNote,
    adminNote: input.adminNote,
    publicBadgeEnabled: input.publicBadgeEnabled ?? Boolean(data.display_badge),
    requestId: input.requestId
  });
}

export async function rejectVerificationAction(input: {
  requestId: string;
  reason: string;
  reasonCode?: string;
  publicNote?: string | null;
  adminNote?: string | null;
}) {
  try {
    const actor = await assertAdminUpdate();
    const reason = input.reason.trim();
    if (!reason) {
      return { ok: false, error: "Vui lòng nhập lý do từ chối." };
    }

    const db = await createClient();
    const { data: before } = await db
      .from("account_verifications")
      .select("*")
      .eq("id", input.requestId)
      .maybeSingle();

    if (!before) {
      return { ok: false, error: "Không tìm thấy yêu cầu." };
    }

    const now = new Date().toISOString();
    const { error } = await db
      .from("account_verifications")
      .update({
        status: "rejected",
        rejection_reason: input.reasonCode ?? reason,
        public_note: input.publicNote?.trim() || reason,
        admin_note: input.adminNote?.trim() || null,
        reviewed_at: now,
        reviewed_by: actor.userId
      })
      .eq("id", input.requestId);

    if (error) {
      return { ok: false, error: "Không thể từ chối yêu cầu." };
    }

    await syncProfileVerificationCache(String(before.user_id));

    const { data: after } = await db
      .from("account_verifications")
      .select("*")
      .eq("id", input.requestId)
      .maybeSingle();

    await createAdminAuditLog({
      action: "verification_rejected",
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

    revalidatePath("/admin/verifications");
    revalidatePath("/admin/audit");
    revalidatePath("/studio/settings/verification");

    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể từ chối yêu cầu."
    };
  }
}

export async function updateVerificationRecordAction(input: {
  requestId: string;
  verificationType?: VerificationType;
  publicBadgeEnabled?: boolean;
  publicLabel?: string | null;
  adminNote?: string | null;
}) {
  try {
    await assertAdminUpdate();
    const db = await createClient();

    const { data: before } = await db
      .from("account_verifications")
      .select("*")
      .eq("id", input.requestId)
      .maybeSingle();

    if (!before || before.status !== "approved") {
      return { ok: false, error: "Chỉ có thể chỉnh sửa bản ghi đã xác thực." };
    }

    const patch: Record<string, unknown> = {};
    if (input.verificationType && VERIFICATION_TYPES.includes(input.verificationType)) {
      patch.verification_type = input.verificationType;
    }
    if (typeof input.publicBadgeEnabled === "boolean") {
      patch.display_badge = input.publicBadgeEnabled;
    }
    if (input.publicLabel !== undefined) {
      patch.public_label = input.publicLabel?.trim() || null;
    }
    if (input.adminNote !== undefined) {
      patch.admin_note = input.adminNote?.trim() || null;
    }

    const { error } = await db
      .from("account_verifications")
      .update(patch)
      .eq("id", input.requestId);

    if (error) {
      return { ok: false, error: "Không thể cập nhật xác thực." };
    }

    await syncProfileVerificationCache(String(before.user_id));

    const { data: after } = await db
      .from("account_verifications")
      .select("*")
      .eq("id", input.requestId)
      .maybeSingle();

    const auditActions: string[] = ["verification_update"];
    if (typeof input.publicBadgeEnabled === "boolean") {
      auditActions.push(
        input.publicBadgeEnabled
          ? "verification_public_badge_enabled"
          : "verification_public_badge_disabled"
      );
    }
    if (input.publicLabel !== undefined) {
      auditActions.push("verification_label_changed");
    }

    for (const action of auditActions) {
      await createAdminAuditLog({
        action,
        targetType: "account_verification",
        targetId: input.requestId,
        before: before as Record<string, unknown>,
        after: (after as Record<string, unknown> | null) ?? null,
        metadata: { target_user_id: before.user_id, verification_id: input.requestId }
      });
    }

    revalidatePath("/admin/verifications");
    revalidatePath("/admin/audit");

    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể cập nhật xác thực."
    };
  }
}
