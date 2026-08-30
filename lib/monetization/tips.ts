"use server";

import { randomUUID } from "crypto";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { isCreatorMonetizationAllowed } from "@/lib/creator-access";
import { getVirtualGiftById } from "@/lib/data/virtual-gifts";
import { debitUserCoins } from "@/lib/wallets/user-wallet";
import { recordCreatorNetEarning } from "@/lib/finance/record-creator-net-earning";
import { createSupportTipRecord, getSupportTipByRequestId } from "@/lib/data/tips";
import { calculateCreatorRevenue } from "@/lib/monetization/creator-revenue";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications/create-notification";
import { createClient } from "@/lib/data/server";
import { addRiskEvent, detectRapidSpendAfterRewardAds, shouldBlockTransaction, shouldHoldCreatorRevenue } from "@/lib/risk/risk-engine";
import type { CoinLotAllocation } from "@/types/coin-lot";
import { loadStoryOriginPolicy } from "@/lib/content-origin/load-story-origin-policy";

type SendSupportInput = {
  toCreatorUserId: string;
  storyId?: string | null;
  chapterId?: string | null;
  giftId?: string | null;
  tipCoinAmount?: number;
  message?: string;
  isAnonymous?: boolean;
  requestId?: string;
};

function toSafeNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function validateContentMonetizable(input: {
  storyId?: string | null;
  chapterId?: string | null;
}) {
  const db = await createClient();
  if (input.storyId) {
    const originPolicy = await loadStoryOriginPolicy(input.storyId);
    if (!originPolicy.canReceiveTips) {
      return { ok: false, error: "Story nay chua du dieu kien nhan tips." };
    }

    const { data: story } = await db
      .from("stories")
      .select("status")
      .eq("id", input.storyId)
      .maybeSingle();
    if (story && ["hidden", "rejected"].includes(String(story.status))) {
      return { ok: false, error: "Story này không hỗ trợ ủng hộ." };
    }
  }
  if (input.chapterId) {
    const { data: chapterStory } = await db
      .from("episodes")
      .select("story_id")
      .eq("id", input.chapterId)
      .maybeSingle();
    if (chapterStory?.story_id) {
      const originPolicy = await loadStoryOriginPolicy(String(chapterStory.story_id));
      if (!originPolicy.canReceiveTips) {
        return { ok: false, error: "Chapter nay khong ho tro tips." };
      }
    }

    const { data: chapter } = await db
      .from("episodes")
      .select("status")
      .eq("id", input.chapterId)
      .maybeSingle();
    if (chapter && ["hidden", "rejected"].includes(String(chapter.status))) {
      return { ok: false, error: "Chapter này không hỗ trợ ủng hộ." };
    }
  }
  return { ok: true, error: null };
}

export async function sendSupportAction(input: SendSupportInput) {
  const { user } = await getCurrentUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập để ủng hộ." };

  try {
    await assertActionAccess("wallet.tip");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const requestId = input.requestId?.trim() || randomUUID();
  const duplicated = await getSupportTipByRequestId(requestId);
  if (duplicated.data) {
    return { ok: true, error: null, tipId: duplicated.data.id, alreadyProcessed: true };
  }

  const config = await getMonetizationConfig({ includePrivate: true });
  const baseEnabled =
    Boolean(config.settings["monetization.enabled"]) &&
    Boolean(config.settings["coin.enabled"]) &&
    Boolean(config.settings["creator_monetization.enabled"]);
  if (!baseEnabled) {
    return { ok: false, error: "Monetization đang tắt." };
  }

  const supportsTip = Boolean(config.settings["tips.enabled"]);
  const supportsGift = Boolean(config.settings["virtual_gifts.enabled"]);
  if (!supportsTip && !supportsGift) {
    return { ok: false, error: "Tips/Gifts đang tắt bởi admin." };
  }

  if (user.id === input.toCreatorUserId) {
    await addRiskEvent({
      userId: user.id,
      creatorUserId: input.toCreatorUserId,
      eventType: "self_tip_attempt",
      severity: "critical",
      reason: "User cố tip chính mình."
    });
    return { ok: false, error: "Bạn không thể tự ủng hộ chính mình." };
  }

  if (await shouldBlockTransaction(user.id, "author_tip")) {
    await addRiskEvent({
      userId: user.id,
      creatorUserId: input.toCreatorUserId,
      eventType: "transaction_flagged",
      severity: "high",
      reason: "Transaction bị chặn do risk profile.",
      metadata: { action: "tip" }
    });
    return { ok: false, error: "Giao dịch đang được xem xét bảo mật." };
  }

  const rate = await enforceRateLimit("tip", user.id);
  if (!rate.allowed) {
    return { ok: false, error: "Bạn đã vượt giới hạn ủng hộ trong ngày." };
  }

  const maxDaily = toSafeNumber(config.settings["fraud.max_daily_tip_amount_per_user"]);
  if (maxDaily > 0) {
    const db = await createClient();
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const { data } = await db
      .from("support_tips")
      .select("coin_amount")
      .eq("from_user_id", user.id)
      .gte("created_at", startToday.toISOString());
    const spentToday = (data ?? []).reduce(
      (sum, row) => sum + toSafeNumber((row as { coin_amount: unknown }).coin_amount),
      0
    );
    const requested = input.giftId
      ? toSafeNumber((await getVirtualGiftById(input.giftId)).data?.coin_price ?? 0)
      : toSafeNumber(input.tipCoinAmount ?? 0);
    if (spentToday + requested > maxDaily) {
      await addRiskEvent({
        userId: user.id,
        creatorUserId: input.toCreatorUserId,
        eventType: "daily_tip_amount_exceeded",
        severity: "medium",
        metadata: { spent_today: spentToday, requested }
      });
      return { ok: false, error: "Vượt giới hạn tip/ngày theo anti-fraud." };
    }
  }

  const creatorCanEarn = await isCreatorMonetizationAllowed(input.toCreatorUserId);
  if (!creatorCanEarn) {
    return { ok: false, error: "Kiếm tiền đang bị tắt bởi ChapMee cho tác giả này." };
  }

  const contentValidation = await validateContentMonetizable({
    storyId: input.storyId,
    chapterId: input.chapterId
  });
  if (!contentValidation.ok) {
    return { ok: false, error: contentValidation.error };
  }

  let coinAmount = 0;
  let transactionType: "author_tip" | "virtual_gift" = "author_tip";
  let giftId: string | null = null;

  if (input.giftId) {
    if (!supportsGift) {
      return { ok: false, error: "Virtual gifts đang tắt." };
    }
    const gift = await getVirtualGiftById(input.giftId);
    if (!gift.data || !gift.data.is_active) {
      return { ok: false, error: "Gift không tồn tại hoặc đang tắt." };
    }
    coinAmount = gift.data.coin_price;
    transactionType = "virtual_gift";
    giftId = gift.data.id;
  } else {
    if (!supportsTip) {
      return { ok: false, error: "Tips đang tắt." };
    }
    coinAmount = Math.max(0, toSafeNumber(input.tipCoinAmount ?? 0));
  }

  if (coinAmount <= 0) {
    return { ok: false, error: "Số coin ủng hộ không hợp lệ." };
  }

  const recentTipsToCreator = await createClient()
    .then((db) =>
      db
        .from("support_tips")
        .select("id", { count: "exact", head: true })
        .eq("from_user_id", user.id)
        .eq("to_creator_user_id", input.toCreatorUserId)
        .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
    );
  if ((recentTipsToCreator.count ?? 0) >= 8) {
    await addRiskEvent({
      userId: user.id,
      creatorUserId: input.toCreatorUserId,
      eventType: "repeated_tips_same_creator",
      severity: "medium",
      metadata: { recent_tip_count_1h: recentTipsToCreator.count ?? 0 }
    });
  }

  const debit = await debitUserCoins({
    userId: user.id,
    amount: coinAmount,
    spendRule: Boolean(config.settings["rewarded_ads.allowed_use_for_tips"])
      ? "bonus_first"
      : "paid_first",
    reason: transactionType,
    source: input.giftId ? "gift" : "tip",
    transactionCode: `SUP-${requestId}`,
    metadata: {
      request_id: requestId,
      to_creator_user_id: input.toCreatorUserId,
      story_id: input.storyId ?? null,
      chapter_id: input.chapterId ?? null,
      gift_id: giftId
    }
  });

  if (!debit.data) {
    return {
      ok: false,
      error: debit.error ?? "Không thể trừ coin. Có thể số dư không đủ."
    };
  }

  await detectRapidSpendAfterRewardAds({
    userId: user.id,
    transactionId: debit.data.id,
    creatorUserId: input.toCreatorUserId
  });

  const revenue = await calculateCreatorRevenue({
    moduleType: input.giftId ? "gift" : "tip",
    creatorUserId: input.toCreatorUserId,
    coinSpent: coinAmount,
    coinToVndRate: toSafeNumber(config.settings["coin.exchange_rate_vnd"]),
    paidCoinAmount: debit.data.paid_coin_amount ?? 0,
    bonusCoinAmount: debit.data.bonus_coin_amount ?? 0,
    coinLotAllocations: ((debit.data.metadata?.coin_lot_allocations as CoinLotAllocation[] | undefined) ?? []),
    storyId: input.storyId,
    chapterId: input.chapterId,
    metadata: {
      transaction_id: debit.data.id,
      gift_id: giftId
    }
  });

  const holdByConfig = Boolean(config.settings["payout.hold_revenue_enabled"]);
  const holdByRisk = await shouldHoldCreatorRevenue(input.toCreatorUserId);
  const creditStatus = holdByRisk ? "locked" : holdByConfig ? "pending" : "available";

  const creatorRevenue = await recordCreatorNetEarning({
    creatorUserId: input.toCreatorUserId,
    buyerUserId: user.id,
    sourceType: "tip",
    storyId: input.storyId ?? null,
    chapterId: input.chapterId ?? null,
    coinAmount,
    coinToVndRate: toSafeNumber(config.settings["coin.exchange_rate_vnd"]),
    revenue,
    revenueStatus: creditStatus,
    transactionType: input.giftId ? "virtual_gift" : "author_tip",
    transactionSource: input.giftId ? "gift" : "tip",
    metadata: {
      request_id: requestId,
      gift_id: giftId,
      ...revenue.metadata
    }
  });

  if (!creatorRevenue.data) {
    return { ok: false, error: creatorRevenue.error ?? "Không thể ghi nhận doanh thu creator." };
  }

  if ((debit.data.bonus_coin_amount ?? 0) > (debit.data.paid_coin_amount ?? 0) * 2) {
    await addRiskEvent({
      userId: user.id,
      creatorUserId: input.toCreatorUserId,
      transactionId: debit.data.id,
      eventType: "high_bonus_coin_spend_to_creator",
      severity: "high",
      metadata: {
        bonus_coin_amount: debit.data.bonus_coin_amount ?? 0,
        paid_coin_amount: debit.data.paid_coin_amount ?? 0
      }
    });
  }

  const supportTip = await createSupportTipRecord({
    requestId,
    fromUserId: user.id,
    toCreatorUserId: input.toCreatorUserId,
    storyId: input.storyId ?? null,
    chapterId: input.chapterId ?? null,
    giftId,
    coinAmount,
    paidCoinAmount: debit.data.paid_coin_amount ?? 0,
    bonusCoinAmount: debit.data.bonus_coin_amount ?? 0,
    grossValueVnd: revenue.grossValueVnd,
    creatorNetVnd: revenue.creatorRevenueVnd,
    platformFeeVnd: revenue.platformRevenueVnd,
    message: input.message?.trim() || null,
    isAnonymous: Boolean(input.isAnonymous),
    transactionId: debit.data.id
  });
  if (!supportTip.data) {
    return { ok: false, error: supportTip.error ?? "Không thể tạo bản ghi tip/gift." };
  }

  await createNotification(input.toCreatorUserId, "milestone_achieved", {
    title: "Bạn vừa nhận được ủng hộ mới",
    body: input.giftId
      ? "Một độc giả vừa gửi quà cho bạn."
      : "Một độc giả vừa tip cho bạn.",
    targetType: input.storyId ? "story" : "author",
    targetId: input.storyId ?? input.toCreatorUserId,
    metadata: {
      source: input.giftId ? "virtual_gift" : "tip",
      coin_amount: coinAmount
    },
    actorUserId: user.id
  });

  return { ok: true, error: null, tipId: supportTip.data.id };
}
