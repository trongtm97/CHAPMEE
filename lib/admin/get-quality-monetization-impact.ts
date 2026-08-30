import { createClient } from "@/lib/data/server";
import type {
  MonetizationStatus,
  QualityMonetizationImpact
} from "@/types/quality-refund";

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function getQualityMonetizationImpact(input: {
  storyId: string;
  chapterId?: string | null;
}): Promise<{ data: QualityMonetizationImpact | null; error: string | null }> {
  const db = await createClient();

  const { data: story, error: storyError } = await db
    .from("stories")
    .select(
      "id, title, monetization_status, monetization_disabled_by_quality, creator_id"
    )
    .eq("id", input.storyId)
    .maybeSingle();

  if (storyError || !story) {
    return { data: null, error: storyError?.message ?? "Không tìm thấy truyện." };
  }

  let unlockQuery = db
    .from("chapter_unlocks")
    .select(
      "id, user_id, coin_amount, paid_coin_amount, bonus_coin_amount, refunded_coin_amount, refund_status, created_at"
    )
    .eq("story_id", input.storyId);

  if (input.chapterId) {
    unlockQuery = unlockQuery.eq("chapter_id", input.chapterId);
  }

  const { data: unlocks } = await unlockQuery;

  const buyerIds = new Set<string>();
  let totalCoinCollected = 0;
  let totalPaidCoinCollected = 0;
  let totalBonusCoinCollected = 0;
  let totalCoinRefunded = 0;
  let hasPartialRefunds = false;

  for (const row of unlocks ?? []) {
    buyerIds.add(row.user_id as string);
    totalCoinCollected += toNumber(row.coin_amount);
    totalPaidCoinCollected += toNumber(row.paid_coin_amount);
    totalBonusCoinCollected += toNumber(row.bonus_coin_amount);
    totalCoinRefunded += toNumber(row.refunded_coin_amount);
    if (row.refund_status === "partially_refunded") {
      hasPartialRefunds = true;
    }
  }

  const targetType = input.chapterId ? "chapter" : "story";
  const targetId = input.chapterId ?? input.storyId;

  let earningQuery = db
    .from("creator_earning_transactions")
    .select("creator_net_amount_vnd, status")
    .eq("story_id", input.storyId)
    .in("source_type", ["chapter_unlock", "story_unlock"]);

  if (input.chapterId) {
    earningQuery = earningQuery.eq("chapter_id", input.chapterId);
  }

  const { data: earnings } = await earningQuery;

  let creatorRevenueVnd = 0;
  for (const row of earnings ?? []) {
    if (row.status === "refunded") continue;
    creatorRevenueVnd += toNumber(row.creator_net_amount_vnd);
  }

  const { data: batches } = await db
    .from("coin_refund_batches")
    .select("id, status")
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  const batchRows = batches ?? [];
  const pendingRefundBatchCount = batchRows.filter((b) =>
    ["preview", "pending", "processing", "partial_failed"].includes(b.status as string)
  ).length;
  const completedRefundBatchCount = batchRows.filter(
    (b) => b.status === "completed"
  ).length;

  const monetizationStatus =
    (story.monetization_status as MonetizationStatus) ??
    (story.monetization_disabled_by_quality
      ? "disabled_due_to_quality"
      : "paid");

  return {
    data: {
      targetType,
      targetId,
      storyId: input.storyId,
      storyTitle: story.title as string,
      monetizationStatus,
      monetizationDisabled: Boolean(story.monetization_disabled_by_quality),
      buyerCount: buyerIds.size,
      totalCoinCollected,
      totalPaidCoinCollected,
      totalBonusCoinCollected,
      totalCoinRefunded,
      creatorRevenueVnd,
      pendingRefundBatchCount,
      completedRefundBatchCount,
      hasPartialRefunds
    },
    error: null
  };
}

export async function getQualityRefundHistory(input: {
  storyId: string;
  chapterId?: string | null;
  limit?: number;
}) {
  const db = await createClient();
  const targetType = input.chapterId ? "chapter" : "story";
  const targetId = input.chapterId ?? input.storyId;

  const { data, error } = await db
    .from("coin_refund_batches")
    .select(
      "id, status, reason_code, refund_scope, refund_percent, total_users, total_transactions, total_coin_refunded, author_note, created_at, confirmed_at"
    )
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .neq("status", "preview")
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 10);

  if (error) {
    return { batches: [], error: error.message };
  }

  return {
    batches: (data ?? []).map((row) => ({
      id: row.id as string,
      status: row.status,
      reasonCode: row.reason_code,
      refundScope: row.refund_scope,
      refundPercent: row.refund_percent == null ? null : Number(row.refund_percent),
      totalUsers: Number(row.total_users ?? 0),
      totalTransactions: Number(row.total_transactions ?? 0),
      totalCoinRefunded: Number(row.total_coin_refunded ?? 0),
      authorNote: (row.author_note as string | null) ?? null,
      createdAt: row.created_at as string,
      confirmedAt: (row.confirmed_at as string | null) ?? null
    })),
    error: null
  };
}
