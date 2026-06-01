"use server";

import { randomUUID } from "crypto";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { calculateCreatorRevenue } from "@/lib/monetization/creator-revenue";
import { getPurchaseUiPolicyForRequest } from "@/lib/payments/purchase-mode";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { getChapterMonetizationSetting } from "@/lib/supabase/chapter-monetization";
import {
  createChapterUnlock,
  getChapterUnlockByUser
} from "@/lib/supabase/chapter-unlocks";
import { getStoryFullAccessUnlock } from "@/lib/supabase/story-monetization";
import { isCreatorMonetizationAllowed } from "@/lib/creator-access";
import { createClient } from "@/lib/supabase/server";
import { recordCreatorNetEarning } from "@/lib/finance/record-creator-net-earning";
import { calculateWalletBalance, debitUserCoins } from "@/lib/wallets/user-wallet";
import { addRiskEvent, detectRapidSpendAfterRewardAds, shouldBlockTransaction, shouldHoldCreatorRevenue } from "@/lib/risk/risk-engine";
import type { CoinLotAllocation } from "@/types/coin-lot";

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildPreviewContent(input: {
  content: string;
  enabled: boolean;
  percent: number;
  chars: number;
}) {
  if (!input.enabled) return "";
  const base = input.content.trim();
  if (!base) return "";
  const byPercent = Math.floor((base.length * input.percent) / 100);
  const targetLength = Math.min(base.length, Math.max(input.chars, byPercent, 0));
  return base.slice(0, targetLength);
}

export async function getPaidChapterReaderState(input: {
  userId: string | null;
  storyId: string;
  chapterId: string;
  creatorUserId: string | null;
  episodeNumber: number;
  content: string;
}) {
  const config = await getMonetizationConfig({ includePrivate: true });
  const enabled =
    Boolean(config.settings["monetization.enabled"]) &&
    Boolean(config.settings["coin.enabled"]) &&
    Boolean(config.settings["creator_monetization.enabled"]) &&
    Boolean(config.settings["paid_chapters.enabled"]);

  if (!enabled || !input.creatorUserId) {
    return { locked: false as const };
  }

  const settingResult = await getChapterMonetizationSetting(input.chapterId);
  const setting = settingResult.data;
  if (!setting?.is_paid) {
    return { locked: false as const };
  }

  const freeRequired = toNumber(config.settings["paid_chapters.free_chapters_required"]);
  if (input.episodeNumber <= freeRequired) {
    return { locked: false as const };
  }

  if (input.userId) {
    const fullAccess = await getStoryFullAccessUnlock(input.userId, input.storyId);
    if (fullAccess.data?.status === "active") {
      return { locked: false as const };
    }

    const unlock = await getChapterUnlockByUser(input.userId, input.chapterId);
    if (unlock.data) {
      return { locked: false as const };
    }
  }

  const creatorCanEarn = await isCreatorMonetizationAllowed(input.creatorUserId);
  if (!creatorCanEarn) {
    return { locked: false as const };
  }

  const coinPrice = Math.max(
    toNumber(config.settings["paid_chapters.min_coin_price"], 1),
    toNumber(setting.coin_price, toNumber(config.settings["paid_chapters.default_coin_price"], 10))
  );
  const previewContent = buildPreviewContent({
    content: input.content,
    enabled: setting.free_preview_enabled,
    percent: toNumber(
      setting.free_preview_percent,
      toNumber(config.settings["paid_chapters.default_free_preview_percent"], 20)
    ),
    chars: toNumber(setting.free_preview_chars, 300)
  });
  const wallet = input.userId ? await calculateWalletBalance(input.userId) : null;
  const purchasePolicy = await getPurchaseUiPolicyForRequest();

  return {
    locked: true as const,
    coinPrice,
    previewContent,
    purchaseEnabled:
      Boolean(config.settings["coin.purchase_enabled"]) &&
      !purchasePolicy.hideTopUp &&
      purchasePolicy.showSePayTopUp,
    purchaseMode: purchasePolicy.purchaseMode,
    walletBalance:
      (wallet?.data?.paid_coin_balance ?? 0) +
      (wallet?.data?.bonus_coin_balance ?? 0)
  };
}

export async function unlockPaidChapterAction(input: {
  chapterId: string;
  storyId: string;
  requestId?: string;
}) {
  const { user } = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để mở khóa chương." };
  }

  try {
    await assertActionAccess("chapter.purchase");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const requestId = input.requestId?.trim() || randomUUID();
  if (await shouldBlockTransaction(user.id, "chapter_unlock")) {
    await addRiskEvent({
      userId: user.id,
      eventType: "transaction_flagged",
      severity: "high",
      reason: "Chapter unlock bị chặn bởi risk profile.",
      metadata: { story_id: input.storyId, chapter_id: input.chapterId }
    });
    return { ok: false, error: "Giao dịch đang được xem xét bảo mật." };
  }

  await trackServerEvent({
    eventName: "paid_chapter_unlock_clicked",
    targetType: "chapter",
    targetId: input.chapterId,
    category: "monetization",
    metadata: { story_id: input.storyId, chapter_id: input.chapterId }
  });

  const existing = await getChapterUnlockByUser(user.id, input.chapterId);
  if (existing.data) {
    return { ok: true, alreadyUnlocked: true, error: null };
  }

  const supabase = await createClient();
  const { data: chapter } = await supabase
    .from("episodes")
    .select("id, story_id, status, episode_number, stories(id, status, visibility, creator_profiles(user_id))")
    .eq("id", input.chapterId)
    .maybeSingle();
  if (!chapter) {
    return { ok: false, error: "Không tìm thấy chapter." };
  }

  const story = Array.isArray(chapter.stories) ? chapter.stories[0] : chapter.stories;
  const creator =
    story && "creator_profiles" in story
      ? Array.isArray(story.creator_profiles)
        ? story.creator_profiles[0]
        : story.creator_profiles
      : null;
  const creatorUserId = creator?.user_id;
  if (!creatorUserId) return { ok: false, error: "Không xác định được creator." };

  if (
    ["hidden", "rejected"].includes(String(chapter.status)) ||
    ["hidden", "rejected"].includes(String(story?.status))
  ) {
    return { ok: false, error: "Nội dung này không hỗ trợ kiếm tiền." };
  }

  const config = await getMonetizationConfig({ includePrivate: true });
  const enabled =
    Boolean(config.settings["monetization.enabled"]) &&
    Boolean(config.settings["coin.enabled"]) &&
    Boolean(config.settings["creator_monetization.enabled"]) &&
    Boolean(config.settings["paid_chapters.enabled"]);
  if (!enabled) return { ok: false, error: "Paid chapter đang tắt." };

  const monetization = await getChapterMonetizationSetting(input.chapterId);
  if (!monetization.data?.is_paid) {
    return { ok: false, error: "Chapter này hiện không phải chapter trả phí." };
  }

  const freeRequired = toNumber(config.settings["paid_chapters.free_chapters_required"]);
  if (toNumber(chapter.episode_number) <= freeRequired) {
    return { ok: false, error: "Chapter đầu bắt buộc miễn phí theo cấu hình admin." };
  }

  const creatorCanEarn = await isCreatorMonetizationAllowed(creatorUserId);
  if (!creatorCanEarn) {
    return {
      ok: false,
      error: "Kiếm tiền đang bị tắt bởi ChapMee cho tài khoản này."
    };
  }

  const chapterPrice = Math.min(
    toNumber(config.settings["paid_chapters.max_coin_price"], 999999),
    Math.max(
      toNumber(config.settings["paid_chapters.min_coin_price"], 1),
      toNumber(
        monetization.data.coin_price,
        toNumber(config.settings["paid_chapters.default_coin_price"], 10)
      )
    )
  );
  const wallet = await calculateWalletBalance(user.id);
  const currentBalance =
    (wallet.data?.paid_coin_balance ?? 0) + (wallet.data?.bonus_coin_balance ?? 0);
  if (currentBalance < chapterPrice) {
    await trackServerEvent({
      eventName: "paid_chapter_insufficient_coin",
      targetType: "chapter",
      targetId: input.chapterId,
      category: "monetization",
      metadata: { story_id: input.storyId, chapter_id: input.chapterId, coin_price: chapterPrice }
    });
    return { ok: false, error: "Không đủ coin để mở khóa chapter." };
  }

  const debit = await debitUserCoins({
    userId: user.id,
    amount: chapterPrice,
    spendRule: Boolean(config.settings["rewarded_ads.allowed_use_for_paid_chapters"])
      ? "bonus_first"
      : "paid_first",
    reason: "chapter_unlock",
    source: "unlock",
    transactionCode: `CHAPTER-UNLOCK-${user.id}-${input.chapterId}`,
    metadata: {
      request_id: requestId,
      chapter_id: input.chapterId,
      story_id: input.storyId,
      creator_user_id: creatorUserId
    }
  });
  if (!debit.data) {
    if ((debit.error ?? "").toLowerCase().includes("duplicate")) {
      const duplicatedUnlock = await getChapterUnlockByUser(user.id, input.chapterId);
      if (duplicatedUnlock.data) {
        return { ok: true, alreadyUnlocked: true, error: null };
      }
    }
    await trackServerEvent({
      eventName: "paid_chapter_unlock_failed",
      targetType: "chapter",
      targetId: input.chapterId,
      category: "monetization",
      metadata: { story_id: input.storyId, chapter_id: input.chapterId, reason: debit.error ?? "debit_failed" }
    });
    return { ok: false, error: debit.error ?? "Không thể trừ coin." };
  }

  await detectRapidSpendAfterRewardAds({
    userId: user.id,
    transactionId: debit.data.id,
    creatorUserId
  });

  const existingAfterDebit = await getChapterUnlockByUser(user.id, input.chapterId);
  if (existingAfterDebit.data) {
    return { ok: true, alreadyUnlocked: true, error: null };
  }

  const revenue = await calculateCreatorRevenue({
    moduleType: "paid_chapter",
    creatorUserId,
    coinSpent: chapterPrice,
    coinToVndRate: toNumber(config.settings["coin.exchange_rate_vnd"], 1000),
    paidCoinAmount: debit.data.paid_coin_amount ?? 0,
    bonusCoinAmount: debit.data.bonus_coin_amount ?? 0,
    coinLotAllocations: ((debit.data.metadata?.coin_lot_allocations as CoinLotAllocation[] | undefined) ?? []),
    storyId: input.storyId,
    chapterId: input.chapterId,
    metadata: {
      transaction_id: debit.data.id
    }
  });

  const unlockRecord = await createChapterUnlock({
    userId: user.id,
    chapterId: input.chapterId,
    storyId: input.storyId,
    creatorUserId,
    coinAmount: chapterPrice,
    paidCoinAmount: debit.data.paid_coin_amount ?? 0,
    bonusCoinAmount: debit.data.bonus_coin_amount ?? 0,
    transactionId: debit.data.id
  });
  if (!unlockRecord.data) {
    await trackServerEvent({
      eventName: "paid_chapter_unlock_failed",
      targetType: "chapter",
      targetId: input.chapterId,
      category: "monetization",
      metadata: { story_id: input.storyId, chapter_id: input.chapterId, reason: unlockRecord.error ?? "unlock_insert_failed" }
    });
    return { ok: false, error: unlockRecord.error ?? "Không thể lưu unlock." };
  }

  const holdByConfig = Boolean(config.settings["payout.hold_revenue_enabled"]);
  const holdByRisk = await shouldHoldCreatorRevenue(creatorUserId);
  const creditStatus = holdByRisk ? "locked" : holdByConfig ? "pending" : "available";

  const credit = await recordCreatorNetEarning({
    creatorUserId,
    buyerUserId: user.id,
    sourceType: "chapter_unlock",
    sourceId: unlockRecord.data.id,
    storyId: input.storyId,
    chapterId: input.chapterId,
    coinAmount: chapterPrice,
    coinToVndRate: toNumber(config.settings["coin.exchange_rate_vnd"], 1000),
    revenue,
    revenueStatus: creditStatus,
    transactionType: "chapter_unlock",
    transactionSource: "unlock",
    metadata: {
      request_id: requestId,
      transaction_id: debit.data.id,
      paid_coin_amount: debit.data.paid_coin_amount ?? 0,
      bonus_coin_amount: debit.data.bonus_coin_amount ?? 0,
      ...revenue.metadata
    }
  });
  if (!credit.data) {
    await trackServerEvent({
      eventName: "paid_chapter_unlock_failed",
      targetType: "chapter",
      targetId: input.chapterId,
      category: "monetization",
      metadata: { story_id: input.storyId, chapter_id: input.chapterId, reason: credit.error ?? "creator_credit_failed" }
    });
    return { ok: false, error: credit.error ?? "Không thể ghi nhận doanh thu creator." };
  }

  const recentUnlocks = await createClient()
    .then((supabase) =>
      supabase
        .from("chapter_unlocks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
    );
  if ((recentUnlocks.count ?? 0) >= 8) {
    await addRiskEvent({
      userId: user.id,
      creatorUserId,
      transactionId: debit.data.id,
      storyId: input.storyId,
      chapterId: input.chapterId,
      eventType: "suspicious_unlock_pattern",
      severity: "medium",
      metadata: { unlock_count_15m: recentUnlocks.count ?? 0 }
    });
  }

  await trackServerEvent({
    eventName: "paid_chapter_unlocked",
    targetType: "chapter",
    targetId: input.chapterId,
    category: "monetization",
    metadata: {
      story_id: input.storyId,
      chapter_id: input.chapterId,
      creator_user_id: creatorUserId,
      coin_price: chapterPrice
    }
  });

  try {
    const { trackTaxonomyStoryPurchaseServer } = await import(
      "@/lib/analytics/track-taxonomy-server"
    );
    await trackTaxonomyStoryPurchaseServer({
      storyId: input.storyId,
      chapterId: input.chapterId,
      revenueCoin: chapterPrice,
      userId: user.id,
      sourceSurface: "catalog"
    });
  } catch {
    // Non-blocking taxonomy analytics
  }

  return { ok: true, alreadyUnlocked: false, error: null };
}
