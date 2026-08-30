"use server";

import { logAdminAction } from "@/lib/audit/log-admin-action";
import { getQualityRefundPreview } from "@/lib/admin/get-quality-refund-preview";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import { createClient } from "@/lib/data/server";
import type {
  QualityRefundPurchaseScope,
  QualityRefundReasonCode,
  QualityRefundScope
} from "@/types/quality-refund";

export async function createQualityRefundBatch(input: {
  storyId: string;
  chapterId?: string | null;
  refundScope: QualityRefundScope;
  dateFrom?: string | null;
  dateTo?: string | null;
  refundPercent?: number | null;
  refundFixedAmount?: number | null;
  purchaseScope: QualityRefundPurchaseScope;
  reasonCode: QualityRefundReasonCode;
  adminNote?: string | null;
}) {
  const auth = await checkStaffPermission("finance.refund.create");
  if (!auth.ok) return { ok: false, error: auth.error, batchId: null };

  const preview = await getQualityRefundPreview(input);
  if (!preview.data) {
    return { ok: false, error: preview.error ?? "Không tạo được preview.", batchId: null };
  }

  if (preview.data.items.length === 0) {
    return {
      ok: false,
      error: preview.data.emptyMessage ?? "Không có giao dịch để hoàn.",
      batchId: null,
      preview: preview.data
    };
  }

  const db = await createClient();
  const targetType = input.chapterId ? "chapter" : "story";
  const targetId = input.chapterId ?? input.storyId;

  const { data: batch, error: batchError } = await db
    .from("coin_refund_batches")
    .insert({
      target_type: targetType,
      target_id: targetId,
      quality_case_id: input.storyId,
      refund_scope: input.refundScope,
      refund_percent: input.refundPercent ?? null,
      refund_fixed_amount: input.refundFixedAmount ?? null,
      purchase_scope: input.purchaseScope,
      date_from: input.dateFrom ?? null,
      date_to: input.dateTo ?? null,
      total_users: preview.data.userCount,
      total_transactions: preview.data.transactionCount,
      total_coin_refunded: preview.data.totalCoinRefund,
      total_paid_coin_refunded: preview.data.totalPaidCoinRefund,
      total_bonus_coin_refunded: preview.data.totalBonusCoinRefund,
      status: "preview",
      reason_code: input.reasonCode,
      admin_note: input.adminNote ?? null,
      created_by: auth.userId
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return { ok: false, error: batchError?.message ?? "Không tạo batch.", batchId: null };
  }

  const itemRows = preview.data.items.map((item) => ({
    batch_id: batch.id,
    user_id: item.userId,
    original_transaction_id: item.originalTransactionId,
    unlock_id: item.unlockId,
    original_coin_amount: item.originalCoinAmount,
    refund_coin_amount: item.refundCoinAmount,
    refund_paid_coin_amount: item.refundPaidCoinAmount,
    refund_bonus_coin_amount: item.refundBonusCoinAmount,
    status: "pending"
  }));

  const { error: itemsError } = await db.from("coin_refund_items").insert(itemRows);

  if (itemsError) {
    await db.from("coin_refund_batches").delete().eq("id", batch.id);
    return { ok: false, error: itemsError.message, batchId: null };
  }

  await logAdminAction({
    actorId: auth.userId,
    action: "quality_refund_preview_created",
    targetType: "story",
    targetId: input.storyId,
    metadata: {
      quality_case_id: input.storyId,
      refund_batch_id: batch.id,
      total_users: preview.data.userCount,
      total_coin_refunded: preview.data.totalCoinRefund,
      reason_code: input.reasonCode,
      note: input.adminNote ?? null
    }
  });

  return {
    ok: true,
    error: null,
    batchId: batch.id as string,
    preview: preview.data
  };
}
