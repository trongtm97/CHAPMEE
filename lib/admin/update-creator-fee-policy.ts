"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import {
  mapCreatorFeePolicyRow,
  resolveInitialPolicyStatus,
  validateCreatorFeePolicyInput
} from "@/lib/admin/creator-fee-policy-shared";
import { requireWalletAdjustAccess } from "@/lib/auth/finance-guards";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import type { CreatorFeePolicyInput } from "@/types/creator-fee-policy";

export type UpdateCreatorFeePolicyInput = CreatorFeePolicyInput & {
  policyId: string;
};

export async function updateCreatorFeePolicyAction(input: UpdateCreatorFeePolicyInput) {
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

  const { data: existing, error: fetchError } = await supabase
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

  if (status === "active" || status === "scheduled") {
    const now = new Date().toISOString();
    await supabase
      .from("creator_fee_policies")
      .update({ status: "expired", ends_at: now, updated_at: now })
      .eq("creator_id", before.creator_id)
      .in("status", ["active", "scheduled"])
      .neq("id", input.policyId);
  }

  const { data, error } = await supabase
    .from("creator_fee_policies")
    .update({
      policy_name: input.policyName.trim(),
      creator_revenue_share_percent: input.creatorRevenueSharePercent ?? null,
      platform_fee_percent: input.platformFeePercent ?? null,
      payment_processing_fee_percent: input.paymentProcessingFeePercent ?? null,
      payment_processing_fixed_fee: input.paymentProcessingFixedFee ?? null,
      tip_platform_fee_percent: input.tipPlatformFeePercent ?? null,
      min_withdraw_amount_override: input.minWithdrawAmountOverride ?? null,
      allowed_price_steps_override: input.allowedPriceStepsOverride?.length
        ? input.allowedPriceStepsOverride
        : null,
      note: input.note?.trim() || null,
      public_note: input.publicNote?.trim() || null,
      show_details_to_creator: input.showDetailsToCreator !== false,
      status,
      starts_at: startsAt.toISOString(),
      ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null
    })
    .eq("id", input.policyId)
    .select("*")
    .single();

  if (error || !data) {
    if (error?.message?.includes("overlapping_creator_fee_policy")) {
      return {
        ok: false,
        error: "Chính sách chồng thời gian với policy khác của cùng tác giả."
      };
    }
    return { ok: false, error: error?.message ?? "Không thể cập nhật chính sách." };
  }

  const after = mapCreatorFeePolicyRow(data as Record<string, unknown>);

  await createAdminAuditLog({
    action: "creator_fee_policy_update",
    targetType: "creator_fee_policy",
    targetId: after.id,
    note: input.note?.trim() || null,
    before: before as unknown as Record<string, unknown>,
    after: after as unknown as Record<string, unknown>,
    metadata: { creator_id: before.creator_id, admin_id: ctx.userId }
  });

  revalidatePath("/admin/creator-fee-policies");
  revalidatePath("/studio/finance");

  return { ok: true, policy: after };
}
