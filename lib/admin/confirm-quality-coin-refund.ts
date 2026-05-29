"use server";

import { logAdminAction } from "@/lib/audit/log-admin-action";
import { QUALITY_REFUND_CONFIRM_COIN_THRESHOLD } from "@/lib/admin/quality-refund-constants";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import {
  notifyAuthorContentQualityMonetization,
  notifyBuyerQualityCoinRefund
} from "@/lib/content-quality/notify-author-monetization";
import { reverseCreatorEarningForQualityRefund } from "@/lib/finance/create-creator-revenue-adjustment";
import { createClient } from "@/lib/supabase/server";
import { buildTransactionCode } from "@/lib/transactions/ledger";
import { creditUserCoins } from "@/lib/wallets/user-wallet";

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function processRefundItem(input: {
  item: Record<string, unknown>;
  batch: Record<string, unknown>;
  storyTitle: string;
  storyId: string;
  adminId: string;
  authorNote?: string | null;
}) {
  const supabase = await createClient();
  const itemId = input.item.id as string;
  const userId = input.item.user_id as string;
  const batchId = input.batch.id as string;
  const unlockId = input.item.unlock_id as string | null;
  const refundPaid = toNumber(input.item.refund_paid_coin_amount);
  const refundBonus = toNumber(input.item.refund_bonus_coin_amount);
  const refundTotal = toNumber(input.item.refund_coin_amount);
  const originalTxId = input.item.original_transaction_id as string;

  const { data: existingRefund } = await supabase
    .from("coin_refund_items")
    .select("id")
    .eq("original_transaction_id", originalTxId)
    .eq("status", "completed")
    .neq("id", itemId)
    .maybeSingle();

  if (existingRefund?.id) {
    await supabase
      .from("coin_refund_items")
      .update({
        status: "skipped",
        error_message: "Giao dịch đã được hoàn trước đó."
      })
      .eq("id", itemId);
    return { ok: false, coinRefunded: 0, skipped: true };
  }

  let ledgerId: string | null = null;
  const metadataBase = {
    description: "Hoàn coin do nội dung được xử lý chất lượng",
    quality_refund: true,
    source_type: "quality_refund",
    refund_batch_id: batchId,
    quality_case_id: input.batch.quality_case_id,
    target_type: input.batch.target_type,
    target_id: input.batch.target_id,
    original_transaction_id: originalTxId,
    refund_percent: input.batch.refund_percent,
    reason_code: input.batch.reason_code,
    story_title: input.storyTitle,
    story_id: input.storyId
  };

  try {
    if (refundPaid > 0) {
      const credit = await creditUserCoins({
        userId,
        amount: refundPaid,
        coinType: "paid",
        reason: "refund",
        source: "refund",
        transactionCode: buildTransactionCode("QREF"),
        metadata: { ...metadataBase, coin_type: "paid" }
      });
      if (!credit.data) {
        throw new Error(credit.error ?? "Không thể hoàn paid coin.");
      }
      ledgerId = credit.data.id;
    }

    if (refundBonus > 0) {
      const credit = await creditUserCoins({
        userId,
        amount: refundBonus,
        coinType: "bonus",
        reason: "refund",
        source: "refund",
        transactionCode: buildTransactionCode("QREF"),
        metadata: { ...metadataBase, coin_type: "bonus" }
      });
      if (!credit.data) {
        throw new Error(credit.error ?? "Không thể hoàn bonus coin.");
      }
      ledgerId = ledgerId ?? credit.data.id;
    }

    if (refundTotal <= 0) {
      throw new Error("Số coin hoàn phải lớn hơn 0.");
    }

    if (unlockId) {
      const { data: unlock } = await supabase
        .from("chapter_unlocks")
        .select("coin_amount, refunded_coin_amount, refund_status")
        .eq("id", unlockId)
        .maybeSingle();

      if (unlock) {
        const newRefunded =
          toNumber(unlock.refunded_coin_amount) + refundTotal;
        const fullyRefunded = newRefunded >= toNumber(unlock.coin_amount) - 0.01;
        await supabase
          .from("chapter_unlocks")
          .update({
            refunded_coin_amount: newRefunded,
            refund_status: fullyRefunded ? "fully_refunded" : "partially_refunded",
            refunded_at: new Date().toISOString(),
            refund_batch_id: batchId
          })
          .eq("id", unlockId);

        const reversal = await reverseCreatorEarningForQualityRefund({
          unlockId,
          batchId,
          storyId: input.storyId,
          chapterId:
            input.batch.target_type === "chapter"
              ? (input.batch.target_id as string)
              : null
        });

        if (reversal.reversed && reversal.amountVnd > 0) {
          await logAdminAction({
            actorId: input.adminId,
            action: "quality_creator_revenue_reversed",
            targetType: "story",
            targetId: input.storyId,
            metadata: {
              refund_batch_id: batchId,
              unlock_id: unlockId,
              amount_vnd: reversal.amountVnd
            }
          });
        }
      }
    }

    await supabase
      .from("coin_refund_items")
      .update({
        status: "completed",
        ledger_id: ledgerId,
        error_message: null
      })
      .eq("id", itemId);

    await notifyBuyerQualityCoinRefund({
      userId,
      storyTitle: input.storyTitle,
      storyId: input.storyId,
      coinAmount: refundTotal
    });

    await logAdminAction({
      actorId: input.adminId,
      action: "quality_coin_refund_item_created",
      targetType: "user",
      targetId: userId,
      metadata: {
        refund_batch_id: batchId,
        original_transaction_id: originalTxId,
        refund_coin_amount: refundTotal
      }
    });

    return { ok: true, coinRefunded: refundTotal, skipped: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hoàn coin thất bại.";
    await supabase
      .from("coin_refund_items")
      .update({ status: "failed", error_message: message })
      .eq("id", itemId);

    await logAdminAction({
      actorId: input.adminId,
      action: "quality_refund_failed",
      targetType: "story",
      targetId: input.storyId,
      metadata: {
        refund_batch_id: batchId,
        item_id: itemId,
        error: message
      }
    });

    return { ok: false, coinRefunded: 0, skipped: false };
  }
}

export async function confirmQualityCoinRefund(input: {
  batchId: string;
  confirmChecked: boolean;
  adminNote: string;
  authorNote?: string | null;
  notifyAuthor?: boolean;
}) {
  const auth = await checkStaffPermission("finance.refund.create");
  if (!auth.ok) return { ok: false, error: auth.error };

  if (!input.confirmChecked) {
    return { ok: false, error: "Bạn cần xác nhận trước khi hoàn coin." };
  }

  const supabase = await createClient();

  const { data: batch, error: batchError } = await supabase
    .from("coin_refund_batches")
    .select("*")
    .eq("id", input.batchId)
    .maybeSingle();

  if (batchError || !batch) {
    return { ok: false, error: batchError?.message ?? "Không tìm thấy batch." };
  }

  if (!["preview", "partial_failed"].includes(batch.status as string)) {
    return { ok: false, error: "Batch không ở trạng thái có thể xác nhận." };
  }

  const totalCoin = toNumber(batch.total_coin_refunded);
  if (totalCoin > QUALITY_REFUND_CONFIRM_COIN_THRESHOLD && !input.adminNote.trim()) {
    return {
      ok: false,
      error: `Tổng coin hoàn vượt ${QUALITY_REFUND_CONFIRM_COIN_THRESHOLD.toLocaleString("vi-VN")}, cần ghi chú bắt buộc.`
    };
  }

  const storyId = (batch.quality_case_id as string) ?? (batch.target_id as string);

  const { data: story } = await supabase
    .from("stories")
    .select("id, title, creator_id, creator_profiles(user_id)")
    .eq("id", storyId)
    .maybeSingle();

  if (!story) {
    return { ok: false, error: "Không tìm thấy truyện liên quan." };
  }

  await supabase
    .from("coin_refund_batches")
    .update({
      status: "processing",
      confirmed_by: auth.userId,
      confirmed_at: new Date().toISOString(),
      author_note: input.authorNote ?? null,
      admin_note: input.adminNote.trim() || batch.admin_note
    })
    .eq("id", input.batchId);

  let itemQuery = supabase
    .from("coin_refund_items")
    .select("*")
    .eq("batch_id", input.batchId);

  if (batch.status === "partial_failed") {
    itemQuery = itemQuery.eq("status", "failed");
  } else {
    itemQuery = itemQuery.eq("status", "pending");
  }

  const { data: items } = await itemQuery;

  let successCount = 0;
  let failCount = 0;
  let totalRefunded = 0;
  const refundedUsers = new Set<string>();

  for (const item of items ?? []) {
    const result = await processRefundItem({
      item: item as Record<string, unknown>,
      batch: batch as Record<string, unknown>,
      storyTitle: story.title as string,
      storyId: story.id as string,
      adminId: auth.userId,
      authorNote: input.authorNote
    });

    if (result.skipped) continue;
    if (result.ok) {
      successCount += 1;
      totalRefunded += result.coinRefunded;
      refundedUsers.add(item.user_id as string);
    } else {
      failCount += 1;
    }
  }

  const finalStatus =
    failCount === 0
      ? "completed"
      : successCount === 0
        ? "failed"
        : "partial_failed";

  await supabase
    .from("coin_refund_batches")
    .update({
      status: finalStatus,
      total_coin_refunded: totalRefunded || batch.total_coin_refunded,
      total_users: refundedUsers.size || batch.total_users,
      total_transactions: successCount
    })
    .eq("id", input.batchId);

  await supabase.from("content_quality_reviews").insert({
    action_taken: "coin_refund_confirmed",
    attempt_number: 0,
    author_id: story.creator_id,
    author_note: input.authorNote ?? null,
    moderator_note: input.authorNote ?? null,
    reason_codes: ["moderator_confirmed_low_quality"],
    reviewed_by: auth.userId,
    status: "pending_quality_review",
    story_id: storyId,
    target_id: batch.target_id,
    target_type: batch.target_type
  });

  await logAdminAction({
    actorId: auth.userId,
    action: "quality_coin_refund_confirmed",
    targetType: "story",
    targetId: storyId,
    metadata: {
      quality_case_id: storyId,
      refund_batch_id: input.batchId,
      total_users: refundedUsers.size,
      total_coin_refunded: totalRefunded,
      reason_code: batch.reason_code,
      note: input.adminNote
    }
  });

  const creator = Array.isArray(story.creator_profiles)
    ? story.creator_profiles[0]
    : story.creator_profiles;

  if (input.notifyAuthor !== false && creator?.user_id && successCount > 0) {
    await notifyAuthorContentQualityMonetization({
      authorUserId: creator.user_id as string,
      storyId,
      storyTitle: story.title as string,
      kind: "coin_refund",
      refundCoinTotal: totalRefunded,
      refundUserCount: refundedUsers.size
    });
  }

  if (failCount > 0 && successCount === 0) {
    return { ok: false, error: "Hoàn coin thất bại toàn bộ. Bạn có thể thử lại mục lỗi." };
  }

  return {
    ok: true,
    error: failCount > 0 ? `${failCount} mục hoàn coin thất bại.` : null,
    successCount,
    failCount,
    totalRefunded
  };
}

export async function retryQualityRefundItems(batchId: string) {
  return confirmQualityCoinRefund({
    batchId,
    confirmChecked: true,
    adminNote: "Retry failed refund items",
    notifyAuthor: false
  });
}
