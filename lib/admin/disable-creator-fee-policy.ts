"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { mapCreatorFeePolicyRow } from "@/lib/admin/creator-fee-policy-shared";
import { requireWalletAdjustAccess } from "@/lib/auth/finance-guards";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export async function disableCreatorFeePolicyAction(policyId: string, reason?: string) {
  const access = await requireWalletAdjustAccess();
  if (!access.ok) {
    return { ok: false, error: access.error ?? "Không có quyền quản lý chính sách phí." };
  }

  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("creator_fee_policies")
    .select("*")
    .eq("id", policyId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, error: "Không tìm thấy chính sách." };
  }

  const before = mapCreatorFeePolicyRow(existing as Record<string, unknown>);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("creator_fee_policies")
    .update({ status: "disabled", ends_at: now })
    .eq("id", policyId)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không thể tắt chính sách." };
  }

  const after = mapCreatorFeePolicyRow(data as Record<string, unknown>);

  await createAdminAuditLog({
    action: "creator_fee_policy_disable",
    targetType: "creator_fee_policy",
    targetId: policyId,
    note: reason?.trim() || null,
    before: before as unknown as Record<string, unknown>,
    after: after as unknown as Record<string, unknown>,
    metadata: { creator_id: before.creator_id, admin_id: ctx.userId }
  });

  revalidatePath("/admin/creator-fee-policies");
  revalidatePath("/studio/finance");

  return { ok: true, policy: after };
}
