"use server";

import { createQualityRefundBatch } from "@/lib/admin/create-quality-refund-batch";
import {
  confirmQualityCoinRefund,
  retryQualityRefundItems
} from "@/lib/admin/confirm-quality-coin-refund";
import { getQualityMonetizationImpact, getQualityRefundHistory } from "@/lib/admin/get-quality-monetization-impact";
import { getQualityRefundPreview } from "@/lib/admin/get-quality-refund-preview";
import {
  disableContentMonetizationDueToQuality,
  restoreContentPaidStatus,
  setContentFreeDueToQuality
} from "@/lib/admin/set-content-free-due-to-quality";
import type {
  FreeAccessReason,
  QualityRefundPurchaseScope,
  QualityRefundReasonCode,
  QualityRefundScope
} from "@/types/quality-refund";

export async function fetchQualityMonetizationImpactAction(storyId: string) {
  return getQualityMonetizationImpact({ storyId });
}

export async function fetchQualityRefundHistoryAction(storyId: string) {
  return getQualityRefundHistory({ storyId });
}

export async function previewQualityRefundAction(input: {
  storyId: string;
  chapterId?: string | null;
  refundScope: QualityRefundScope;
  dateFrom?: string | null;
  dateTo?: string | null;
  refundPercent?: number | null;
  refundFixedAmount?: number | null;
  purchaseScope: QualityRefundPurchaseScope;
  reasonCode: QualityRefundReasonCode;
}) {
  return getQualityRefundPreview(input);
}

export async function createQualityRefundBatchAction(input: {
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
  return createQualityRefundBatch(input);
}

export async function confirmQualityCoinRefundAction(input: {
  batchId: string;
  confirmChecked: boolean;
  adminNote: string;
  authorNote?: string | null;
  notifyAuthor?: boolean;
}) {
  return confirmQualityCoinRefund(input);
}

export async function retryQualityRefundItemsAction(batchId: string) {
  return retryQualityRefundItems(batchId);
}

export async function setContentFreeDueToQualityAction(input: {
  storyId: string;
  reason: FreeAccessReason;
  authorNote?: string | null;
  adminNote?: string | null;
  notifyAuthor?: boolean;
}) {
  return setContentFreeDueToQuality(input);
}

export async function restoreContentPaidStatusAction(input: {
  storyId: string;
  adminNote?: string | null;
}) {
  return restoreContentPaidStatus(input);
}

export async function disableContentMonetizationAction(input: {
  storyId: string;
  reason?: FreeAccessReason;
  adminNote?: string | null;
}) {
  return disableContentMonetizationDueToQuality(input);
}

export async function setFreeAndRefundQualityAction(input: {
  storyId: string;
  freeReason: FreeAccessReason;
  authorNote?: string | null;
  adminNote?: string | null;
  notifyAuthor?: boolean;
  refundScope: QualityRefundScope;
  refundPercent?: number | null;
  purchaseScope: QualityRefundPurchaseScope;
  refundReasonCode: QualityRefundReasonCode;
  confirmChecked: boolean;
  refundAdminNote: string;
}) {
  const freeResult = await setContentFreeDueToQuality({
    storyId: input.storyId,
    reason: input.freeReason,
    authorNote: input.authorNote,
    adminNote: input.adminNote,
    notifyAuthor: input.notifyAuthor
  });

  if (!freeResult.ok) {
    return freeResult;
  }

  const batchResult = await createQualityRefundBatch({
    storyId: input.storyId,
    refundScope: input.refundScope,
    refundPercent: input.refundPercent ?? 100,
    purchaseScope: input.purchaseScope,
    reasonCode: input.refundReasonCode,
    adminNote: input.refundAdminNote
  });

  if (!batchResult.ok || !batchResult.batchId) {
    return {
      ok: false,
      error: batchResult.error ?? "Mở miễn phí thành công nhưng không tạo được batch hoàn coin."
    };
  }

  return confirmQualityCoinRefund({
    batchId: batchResult.batchId,
    confirmChecked: input.confirmChecked,
    adminNote: input.refundAdminNote,
    authorNote: input.authorNote,
    notifyAuthor: input.notifyAuthor
  });
}
