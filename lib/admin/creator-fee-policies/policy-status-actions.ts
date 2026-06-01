"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { mapCreatorFeePolicyRow } from "@/lib/admin/creator-fee-policy-shared";
import {
  requireCreatorFeeCreateAccess,
  requireCreatorFeePauseAccess,
  requireCreatorFeeRevokeAccess,
  requireCreatorFeeUpdateAccess
} from "@/lib/auth/creator-fee-guards";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

async function loadPolicy(policyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_fee_policies")
    .select("*")
    .eq("id", policyId)
    .maybeSingle();
  if (error || !data) return null;
  return mapCreatorFeePolicyRow(data as Record<string, unknown>);
}

export async function pauseCreatorFeePolicyAction(policyId: string, reason: string) {
  const access = await requireCreatorFeePauseAccess();
  if (!access.ok) {
    return { ok: false, error: access.error ?? "Không có quyền tạm dừng chính sách." };
  }

  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) return { ok: false, error: "Bạn cần đăng nhập." };
  if (!reason.trim()) return { ok: false, error: "Vui lòng nhập lý do tạm dừng." };

  const before = await loadPolicy(policyId);
  if (!before) return { ok: false, error: "Không tìm thấy chính sách." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_fee_policies")
    .update({
      status: "paused",
      updated_by: ctx.userId,
      updated_at: new Date().toISOString()
    })
    .eq("id", policyId)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: "Không thể tạm dừng chính sách." };
  }

  const after = mapCreatorFeePolicyRow(data as Record<string, unknown>);
  await createAdminAuditLog({
    action: "creator_fee_policy.pause",
    targetType: "creator_fee_policy",
    targetId: policyId,
    note: reason.trim(),
    before: before as unknown as Record<string, unknown>,
    after: after as unknown as Record<string, unknown>,
    metadata: { creator_id: before.creator_id, actor_user_id: ctx.userId, reason: reason.trim() }
  });

  revalidatePath("/admin/creator-fee-policies");
  return { ok: true, policy: after };
}

export async function resumeCreatorFeePolicyAction(policyId: string, reason: string) {
  const access = await requireCreatorFeeUpdateAccess();
  if (!access.ok) {
    return { ok: false, error: access.error ?? "Không có quyền tiếp tục chính sách." };
  }

  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) return { ok: false, error: "Bạn cần đăng nhập." };
  if (!reason.trim()) return { ok: false, error: "Vui lòng nhập lý do." };

  const before = await loadPolicy(policyId);
  if (!before) return { ok: false, error: "Không tìm thấy chính sách." };

  const supabase = await createClient();
  const now = new Date();
  const status = new Date(before.starts_at).getTime() > now.getTime() ? "scheduled" : "active";

  const { data, error } = await supabase
    .from("creator_fee_policies")
    .update({
      status,
      updated_by: ctx.userId,
      updated_at: now.toISOString()
    })
    .eq("id", policyId)
    .select("*")
    .single();

  if (error || !data) {
    if (error?.message?.includes("overlapping_creator_fee_policy")) {
      return { ok: false, error: "Không thể tiếp tục — trùng thời gian với policy khác." };
    }
    return { ok: false, error: "Không thể tiếp tục chính sách." };
  }

  const after = mapCreatorFeePolicyRow(data as Record<string, unknown>);
  await createAdminAuditLog({
    action: "creator_fee_policy.resume",
    targetType: "creator_fee_policy",
    targetId: policyId,
    note: reason.trim(),
    before: before as unknown as Record<string, unknown>,
    after: after as unknown as Record<string, unknown>,
    metadata: { creator_id: before.creator_id, actor_user_id: ctx.userId, reason: reason.trim() }
  });

  revalidatePath("/admin/creator-fee-policies");
  return { ok: true, policy: after };
}

export async function revokeCreatorFeePolicyAction(policyId: string, reason: string) {
  const access = await requireCreatorFeeRevokeAccess();
  if (!access.ok) {
    return { ok: false, error: access.error ?? "Không có quyền thu hồi chính sách." };
  }

  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) return { ok: false, error: "Bạn cần đăng nhập." };
  if (!reason.trim()) return { ok: false, error: "Vui lòng nhập lý do thu hồi." };

  const before = await loadPolicy(policyId);
  if (!before) return { ok: false, error: "Không tìm thấy chính sách." };

  const now = new Date().toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_fee_policies")
    .update({
      status: "revoked",
      ends_at: now,
      revoked_at: now,
      revoked_by: ctx.userId,
      revoked_reason: reason.trim(),
      updated_by: ctx.userId,
      updated_at: now
    })
    .eq("id", policyId)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: "Không thể thu hồi chính sách." };
  }

  const after = mapCreatorFeePolicyRow(data as Record<string, unknown>);
  await createAdminAuditLog({
    action: "creator_fee_policy.revoke",
    targetType: "creator_fee_policy",
    targetId: policyId,
    note: reason.trim(),
    before: before as unknown as Record<string, unknown>,
    after: after as unknown as Record<string, unknown>,
    metadata: { creator_id: before.creator_id, actor_user_id: ctx.userId, reason: reason.trim() }
  });

  revalidatePath("/admin/creator-fee-policies");
  return { ok: true, policy: after };
}

/** @deprecated Use pauseCreatorFeePolicyAction */
export async function disableCreatorFeePolicyAction(policyId: string, reason?: string) {
  return pauseCreatorFeePolicyAction(policyId, reason ?? "Disabled via legacy action");
}

export async function duplicateCreatorFeePolicyAction(policyId: string) {
  const access = await requireCreatorFeeCreateAccess();
  if (!access.ok) {
    return { ok: false, error: access.error ?? "Không có quyền nhân bản chính sách." };
  }

  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) return { ok: false, error: "Bạn cần đăng nhập." };

  const source = await loadPolicy(policyId);
  if (!source) return { ok: false, error: "Không tìm thấy chính sách nguồn." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_fee_policies")
    .insert({
      creator_id: source.creator_id,
      policy_name: `${source.policy_name} (bản sao)`,
      creator_revenue_share_percent: source.creator_revenue_share_percent,
      platform_fee_percent: source.platform_fee_percent,
      payment_processing_fee_percent: source.payment_processing_fee_percent,
      payment_processing_fixed_fee: source.payment_processing_fixed_fee,
      tip_platform_fee_percent: source.tip_platform_fee_percent,
      min_withdraw_amount_override: source.min_withdraw_amount_override,
      allowed_price_steps_override: source.allowed_price_steps_override,
      source_rates: source.source_rates,
      creator_type: source.creator_type,
      contract_ref: source.contract_ref,
      note: source.note,
      public_note: source.public_note,
      show_details_to_creator: source.show_details_to_creator,
      status: "draft",
      starts_at: new Date().toISOString(),
      ends_at: null,
      created_by: ctx.userId,
      updated_by: ctx.userId
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: "Không thể nhân bản chính sách." };
  }

  const policy = mapCreatorFeePolicyRow(data as Record<string, unknown>);
  await createAdminAuditLog({
    action: "creator_fee_policy.create",
    targetType: "creator_fee_policy",
    targetId: policy.id,
    note: `Duplicated from ${policyId}`,
    after: policy as unknown as Record<string, unknown>,
    metadata: { creator_id: source.creator_id, source_policy_id: policyId }
  });

  revalidatePath("/admin/creator-fee-policies");
  return { ok: true, policy };
}
