"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import {
  getCreatorAccessOverrideByUserId,
  upsertCreatorAccessOverride
} from "@/lib/data/creator-access-overrides";

const REVALIDATE_PATHS = [
  "/admin/creators",
  "/admin/users",
  "/studio/monetization",
  "/studio/finance",
  "/studio"
] as const;

function revalidateAccessPaths() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

async function assertCreatorAccessStaff() {
  const auth = await checkStaffPermission("admin.settings.update");
  if (!auth.ok) {
    return { ok: false as const, error: auth.error, adminId: null };
  }
  return { ok: true as const, error: null, adminId: auth.userId };
}

type AccessToggleKind = "monetization" | "withdrawal";

async function setCreatorAccessFlag(input: {
  targetUserId: string;
  kind: AccessToggleKind;
  disabled: boolean;
  reason: string;
  note?: string;
}) {
  const auth = await assertCreatorAccessStaff();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (input.disabled && !input.reason.trim()) {
    return { ok: false, error: "Vui lòng nhập lý do khi tắt quyền." };
  }

  const before = await getCreatorAccessOverrideByUserId(input.targetUserId);
  const now = new Date().toISOString();

  const patch =
    input.kind === "monetization"
      ? {
          userId: input.targetUserId,
          monetizationDisabled: input.disabled,
          monetizationDisabledReason: input.disabled ? input.reason.trim() : null,
          monetizationDisabledBy: input.disabled ? auth.adminId : null,
          monetizationDisabledAt: input.disabled ? now : null
        }
      : {
          userId: input.targetUserId,
          withdrawalDisabled: input.disabled,
          withdrawalDisabledReason: input.disabled ? input.reason.trim() : null,
          withdrawalDisabledBy: input.disabled ? auth.adminId : null,
          withdrawalDisabledAt: input.disabled ? now : null
        };

  const updated = await upsertCreatorAccessOverride(patch);
  if (!updated.data) {
    return { ok: false, error: updated.error ?? "Không thể cập nhật quyền tác giả." };
  }

  const action =
    input.kind === "monetization"
      ? input.disabled
        ? "creator_monetization_disabled"
        : "creator_monetization_enabled"
      : input.disabled
        ? "creator_withdrawal_disabled"
        : "creator_withdrawal_enabled";

  await createAdminAuditLog({
    actorId: auth.adminId!,
    action,
    targetType: "creator_access",
    targetId: input.targetUserId,
    note: input.note?.trim() || null,
    before: before.data as unknown as Record<string, unknown> | null,
    after: updated.data as unknown as Record<string, unknown>,
    metadata: {
      target_user_id: input.targetUserId,
      reason: input.disabled ? input.reason.trim() : null,
      kind: input.kind,
      disabled: input.disabled
    }
  });

  revalidateAccessPaths();
  return { ok: true, error: null };
}

export async function disableCreatorMonetizationAccessAction(input: {
  targetUserId: string;
  reason: string;
  note?: string;
}) {
  return setCreatorAccessFlag({
    targetUserId: input.targetUserId,
    kind: "monetization",
    disabled: true,
    reason: input.reason,
    note: input.note
  });
}

export async function enableCreatorMonetizationAccessAction(input: {
  targetUserId: string;
  note?: string;
}) {
  return setCreatorAccessFlag({
    targetUserId: input.targetUserId,
    kind: "monetization",
    disabled: false,
    reason: "",
    note: input.note
  });
}

export async function disableCreatorWithdrawalAccessAction(input: {
  targetUserId: string;
  reason: string;
  note?: string;
}) {
  return setCreatorAccessFlag({
    targetUserId: input.targetUserId,
    kind: "withdrawal",
    disabled: true,
    reason: input.reason,
    note: input.note
  });
}

export async function enableCreatorWithdrawalAccessAction(input: {
  targetUserId: string;
  note?: string;
}) {
  return setCreatorAccessFlag({
    targetUserId: input.targetUserId,
    kind: "withdrawal",
    disabled: false,
    reason: "",
    note: input.note
  });
}
