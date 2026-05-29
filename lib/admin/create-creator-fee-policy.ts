"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import {
  buildPolicyInsertPayload,
  mapCreatorFeePolicyRow,
  validateCreatorFeePolicyInput
} from "@/lib/admin/creator-fee-policy-shared";
import { requireWalletAdjustAccess } from "@/lib/auth/finance-guards";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import type { CreatorFeePolicyInput } from "@/types/creator-fee-policy";

async function expireOverlappingPolicies(
  supabase: Awaited<ReturnType<typeof createClient>>,
  creatorId: string,
  excludeId?: string
) {
  const now = new Date().toISOString();
  let query = supabase
    .from("creator_fee_policies")
    .update({ status: "expired", ends_at: now, updated_at: now })
    .eq("creator_id", creatorId)
    .in("status", ["active", "scheduled"]);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  await query;
}

export async function createCreatorFeePolicyAction(input: CreatorFeePolicyInput) {
  const access = await requireWalletAdjustAccess();
  if (!access.ok) {
    return { ok: false, error: access.error ?? "Không có quyền quản lý chính sách phí." };
  }

  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const validationError = validateCreatorFeePolicyInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const supabase = await createClient();
  const payload = buildPolicyInsertPayload(input, ctx.userId);

  if (payload.status === "active" || payload.status === "scheduled") {
    await expireOverlappingPolicies(supabase, input.creatorId);
  }

  const { data, error } = await supabase
    .from("creator_fee_policies")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    if (error?.message?.includes("overlapping_creator_fee_policy")) {
      return {
        ok: false,
        error:
          "Tác giả đã có chính sách active/scheduled chồng thời gian. Hãy kết thúc policy cũ trước."
      };
    }
    return { ok: false, error: error?.message ?? "Không thể tạo chính sách phí." };
  }

  const policy = mapCreatorFeePolicyRow(data as Record<string, unknown>);

  await createAdminAuditLog({
    action: "creator_fee_policy_create",
    targetType: "creator_fee_policy",
    targetId: policy.id,
    note: input.note?.trim() || null,
    after: policy as unknown as Record<string, unknown>,
    metadata: { creator_id: input.creatorId, admin_id: ctx.userId }
  });

  revalidatePath("/admin/creator-fee-policies");
  revalidatePath("/studio/finance");

  return { ok: true, policy };
}
