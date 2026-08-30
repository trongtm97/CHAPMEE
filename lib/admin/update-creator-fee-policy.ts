"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import {
  buildPolicyUpdatePayload,
  mapCreatorFeePolicyRow,
  resolveInitialPolicyStatus,
  validateCreatorFeePolicyInput
} from "@/lib/admin/creator-fee-policy-shared";
import { requireCreatorFeeUpdateAccess } from "@/lib/auth/creator-fee-guards";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/data/server";
import type { CreatorFeePolicyInput } from "@/types/creator-fee-policy";

export type UpdateCreatorFeePolicyInput = CreatorFeePolicyInput & {
  policyId: string;
};

export async function updateCreatorFeePolicyAction(input: UpdateCreatorFeePolicyInput) {
  const access = await requireCreatorFeeUpdateAccess();
  if (!access.ok) {
    return { ok: false, error: access.error ?? "Không có quyền sửa chính sách phí." };
  }

  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const validationError = validateCreatorFeePolicyInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const db = await createClient();

  const { data: existing, error: fetchError } = await db
    .from("creator_fee_policies")
    .select("*")
    .eq("id", input.policyId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, error: "Không tìm thấy chính sách." };
  }

  const before = mapCreatorFeePolicyRow(existing as Record<string, unknown>);
  const startsAt = input.startsAt ? new Date(input.startsAt) : new Date(before.starts_at);
  const status = resolveInitialPolicyStatus(startsAt, input.status);
  const endsAtIso = input.endsAt ? new Date(input.endsAt).toISOString() : null;

  if ((status === "active" || status === "scheduled") && !input.confirmOverlap) {
    const { data: overlaps } = await db
      .from("creator_fee_policies")
      .select("id")
      .eq("creator_id", before.creator_id)
      .in("status", ["active", "scheduled"])
      .neq("id", input.policyId)
      .lte("starts_at", endsAtIso ?? "9999-12-31")
      .or(`ends_at.is.null,ends_at.gte.${startsAt.toISOString()}`);

    if ((overlaps?.length ?? 0) > 0) {
      return {
        ok: false,
        needsConfirm: true,
        error: "Chính sách chồng thời gian với policy khác. Xác nhận để tiếp tục."
      };
    }
  }

  if (status === "active" || status === "scheduled") {
    const now = new Date().toISOString();
    await db
      .from("creator_fee_policies")
      .update({ status: "expired", ends_at: now, updated_at: now, updated_by: ctx.userId })
      .eq("creator_id", before.creator_id)
      .in("status", ["active", "scheduled"])
      .neq("id", input.policyId);
  }

  const updatePayload = {
    ...buildPolicyUpdatePayload(input, ctx.userId),
    status,
    starts_at: startsAt.toISOString(),
    ends_at: endsAtIso
  };
  delete (updatePayload as Record<string, unknown>).creator_id;

  const { data, error } = await db
    .from("creator_fee_policies")
    .update(updatePayload)
    .eq("id", input.policyId)
    .select("*")
    .single();

  if (error || !data) {
    if (error?.message?.includes("overlapping_creator_fee_policy")) {
      return {
        ok: false,
        needsConfirm: true,
        error: "Chính sách chồng thời gian với policy khác của cùng tác giả."
      };
    }
    return { ok: false, error: "Không thể cập nhật chính sách." };
  }

  const after = mapCreatorFeePolicyRow(data as Record<string, unknown>);

  await createAdminAuditLog({
    action: "creator_fee_policy.update",
    targetType: "creator_fee_policy",
    targetId: after.id,
    note: input.note?.trim() || null,
    before: before as unknown as Record<string, unknown>,
    after: after as unknown as Record<string, unknown>,
    metadata: {
      creator_id: before.creator_id,
      actor_user_id: ctx.userId,
      reason: input.note?.trim() || null
    }
  });

  revalidatePath("/admin/creator-fee-policies");
  revalidatePath("/studio/finance");

  return { ok: true, policy: after };
}
