"use server";

import { createClient } from "@/lib/data/server";
import type { CreatorEarningCalculationSnapshot, CreatorEarningTransactionDetail } from "@/types/finance";

const SOURCE_LABELS: Record<string, string> = {
  chapter_unlock: "Mở khóa chương",
  story_unlock: "Mở khóa truyện",
  tip: "Tip / ủng hộ",
  bonus: "Bonus nền tảng",
  adjustment: "Điều chỉnh"
};

function earningSourceLabel(sourceType: string): string {
  return SOURCE_LABELS[sourceType] ?? sourceType;
}

export async function getCreatorTransactionDetail(input: {
  creatorUserId: string;
  earningTransactionId: string;
}): Promise<{ data: CreatorEarningTransactionDetail | null; error: string | null }> {
  const db = await createClient();
  const { data: row, error } = await db
    .from("creator_earning_transactions")
    .select("*")
    .eq("id", input.earningTransactionId)
    .eq("creator_user_id", input.creatorUserId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  if (!row) {
    const { data: legacyTx } = await db
      .from("transactions")
      .select("*")
      .eq("id", input.earningTransactionId)
      .eq("creator_user_id", input.creatorUserId)
      .maybeSingle();

    if (!legacyTx) {
      return { data: null, error: "Không tìm thấy giao dịch." };
    }

    const meta = (legacyTx.metadata as Record<string, unknown>) ?? {};
    const gross = Number(
      legacyTx.creator_gross_vnd ?? meta.gross_value_vnd ?? legacyTx.money_amount_vnd ?? 0
    );
    const platformFee = Number(legacyTx.platform_fee_vnd ?? meta.platform_revenue_vnd ?? 0);
    const processingFee =
      Number(meta.provider_fee_vnd ?? 0) + Number(meta.store_fee_vnd ?? 0);
    const net = Number(legacyTx.creator_net_vnd ?? legacyTx.net_amount_vnd ?? gross - platformFee - processingFee);
    const storyId = legacyTx.story_id as string | null;
    const chapterId = legacyTx.chapter_id as string | null;
    let contentLabel = "—";
    if (storyId || chapterId) {
      const [{ data: story }, { data: chapter }] = await Promise.all([
        storyId
          ? db.from("stories").select("title").eq("id", storyId).maybeSingle()
          : Promise.resolve({ data: null }),
        chapterId
          ? db.from("episodes").select("title, episode_number").eq("id", chapterId).maybeSingle()
          : Promise.resolve({ data: null })
      ]);
      const chapterText = chapter
        ? chapter.title
          ? String(chapter.title)
          : `Chương ${chapter.episode_number ?? "?"}`
        : null;
      contentLabel = [story?.title, chapterText].filter(Boolean).join(" · ") || "—";
    }

    const legacyDetail: CreatorEarningTransactionDetail = {
      id: String(legacyTx.id),
      creator_user_id: String(legacyTx.creator_user_id),
      buyer_user_id: (legacyTx.user_id as string | null) ?? null,
      source_type: "adjustment",
      source_id: null,
      story_id: storyId,
      chapter_id: chapterId,
      legacy_transaction_id: String(legacyTx.id),
      coin_amount: legacyTx.coin_amount == null ? null : Number(legacyTx.coin_amount),
      coin_to_vnd_rate: null,
      gross_amount_vnd: gross,
      platform_fee_vnd: platformFee,
      payment_processing_fee_vnd: processingFee,
      tax_or_adjustment_vnd: 0,
      creator_net_amount_vnd: net,
      platform_fee_percent: null,
      creator_revenue_share_percent:
        legacyTx.creator_percent == null ? null : Number(legacyTx.creator_percent),
      status: "settled",
      created_at: String(legacyTx.created_at),
      calculationSnapshot: {
        roundingRule: "legacy_transaction",
        coinToVndRate: 0,
        coinAmount: null,
        grossAmountVnd: gross,
        platformFeeVnd: platformFee,
        paymentProcessingFeeVnd: processingFee,
        taxOrAdjustmentVnd: 0,
        creatorNetAmountVnd: net,
        calculatedAt: String(legacyTx.created_at)
      },
      contentLabel,
      sourceLabel: earningSourceLabel(String(legacyTx.type)),
      totalFeesVnd: platformFee + processingFee
    };

    return { data: legacyDetail, error: null };
  }

  const storyId = row.story_id as string | null;
  const chapterId = row.chapter_id as string | null;
  let contentLabel = "—";

  if (storyId || chapterId) {
    const [{ data: story }, { data: chapter }] = await Promise.all([
      storyId
        ? db.from("stories").select("title").eq("id", storyId).maybeSingle()
        : Promise.resolve({ data: null }),
      chapterId
        ? db.from("episodes").select("title, episode_number").eq("id", chapterId).maybeSingle()
        : Promise.resolve({ data: null })
    ]);
    const chapterText = chapter
      ? chapter.title
        ? String(chapter.title)
        : `Chương ${chapter.episode_number ?? "?"}`
      : null;
    contentLabel = [story?.title, chapterText].filter(Boolean).join(" · ") || "—";
  }

  const platformFee = Number(row.platform_fee_vnd ?? 0);
  const processingFee = Number(row.payment_processing_fee_vnd ?? 0);
  const taxFee = Number(row.tax_or_adjustment_vnd ?? 0);

  const detail: CreatorEarningTransactionDetail = {
    id: String(row.id),
    creator_user_id: String(row.creator_user_id),
    buyer_user_id: (row.buyer_user_id as string | null) ?? null,
    source_type: row.source_type as CreatorEarningTransactionDetail["source_type"],
    source_id: (row.source_id as string | null) ?? null,
    story_id: storyId,
    chapter_id: chapterId,
    legacy_transaction_id: (row.legacy_transaction_id as string | null) ?? null,
    coin_amount: row.coin_amount == null ? null : Number(row.coin_amount),
    coin_to_vnd_rate: row.coin_to_vnd_rate == null ? null : Number(row.coin_to_vnd_rate),
    gross_amount_vnd: Number(row.gross_amount_vnd),
    platform_fee_vnd: platformFee,
    payment_processing_fee_vnd: processingFee,
    tax_or_adjustment_vnd: taxFee,
    creator_net_amount_vnd: Number(row.creator_net_amount_vnd),
    platform_fee_percent: row.platform_fee_percent == null ? null : Number(row.platform_fee_percent),
    creator_revenue_share_percent:
      row.creator_revenue_share_percent == null
        ? null
        : Number(row.creator_revenue_share_percent),
    status: row.status as CreatorEarningTransactionDetail["status"],
    created_at: String(row.created_at),
    calculationSnapshot: (row.calculation_snapshot ?? {}) as CreatorEarningCalculationSnapshot,
    contentLabel,
    sourceLabel: earningSourceLabel(String(row.source_type)),
    totalFeesVnd: platformFee + processingFee + taxFee
  };

  return { data: detail, error: null };
}
