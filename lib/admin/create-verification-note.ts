"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/data/server";
import type { VerificationNoteTag } from "@/types/admin-verification";

function hasPerm(permissions: string[], code: string) {
  return permissions.includes(code);
}

async function assertCanManageNotes() {
  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) throw new Error("Bạn cần đăng nhập.");
  const perms = ctx.permissions as string[];
  const isSupportOnly =
    hasPerm(perms, "admin.user.view") &&
    !hasPerm(perms, "admin.user.update") &&
    !hasPerm(perms, "verification_grant");
  if (isSupportOnly) {
    throw new Error("Bạn không có quyền ghi chú nội bộ.");
  }
  if (!hasPerm(perms, "admin.user.update") && !hasPerm(perms, "verification_grant")) {
    throw new Error("Bạn không có quyền ghi chú.");
  }
  return ctx;
}

export async function createVerificationNoteAction(input: {
  verificationId: string;
  note: string;
  tag?: VerificationNoteTag | null;
}) {
  try {
    const actor = await assertCanManageNotes();
    const note = input.note.trim();
    if (!note) return { ok: false, error: "Nội dung ghi chú không được trống." };

    const db = await createClient();
    const { data: verification } = await db
      .from("account_verifications")
      .select("id, user_id")
      .eq("id", input.verificationId)
      .maybeSingle();

    if (!verification) {
      return { ok: false, error: "Không tìm thấy yêu cầu xác thực." };
    }

    const { data: inserted, error } = await db
      .from("verification_notes")
      .insert({
        verification_id: input.verificationId,
        admin_id: actor.userId,
        note,
        tag: input.tag ?? "normal"
      })
      .select("id")
      .single();

    if (error || !inserted) {
      if (process.env.NODE_ENV === "development") console.error("[createVerificationNote]", error);
      return { ok: false, error: "Không thể lưu ghi chú." };
    }

    await createAdminAuditLog({
      action: "verification_note_added",
      targetType: "account_verification",
      targetId: input.verificationId,
      note,
      metadata: {
        target_user_id: verification.user_id,
        verification_id: input.verificationId,
        tag: input.tag ?? "normal",
        note_id: inserted.id
      }
    });

    revalidatePath("/admin/verifications");
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể lưu ghi chú."
    };
  }
}
