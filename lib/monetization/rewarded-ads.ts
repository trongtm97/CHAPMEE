"use server";

import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getMonetizationConfig } from "@/lib/monetization/config";
import {
  countRewardedSessionsTodayByUser,
  createRewardedAdSession,
  getLatestRewardedAdSessionForUser,
  getRewardedAdSessionById,
  updateRewardedAdSessionStatus
} from "@/lib/data/rewarded-ads";
import { creditUserCoins } from "@/lib/wallets/user-wallet";
import type { RewardedAdsAvailability } from "@/types/rewarded-ad";
import { addRiskEvent } from "@/lib/risk/risk-engine";

type UserRole = "user" | "admin" | "moderator" | "founder";

function num(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function baseEnabled(settings: Record<string, unknown>) {
  return (
    Boolean(settings["monetization.enabled"]) &&
    Boolean(settings["coin.enabled"]) &&
    Boolean(settings["rewarded_ads.enabled"]) &&
    Boolean(settings["coin.reward_enabled"])
  );
}

export async function getRewardedAdsAvailability(input: {
  userId: string | null;
  role?: UserRole | null;
}): Promise<RewardedAdsAvailability> {
  const config = await getMonetizationConfig({ includePrivate: true });
  const settings = config.settings as Record<string, unknown>;
  const enabled = baseEnabled(settings);
  const rewardCoinAmount = Math.max(1, num(settings["rewarded_ads.reward_coin_amount"], 10));
  const dailyLimitPerUser = Math.max(
    1,
    num(settings["rewarded_ads.daily_limit_per_user"], 3)
  );
  const cooldownMinutes = Math.max(0, num(settings["rewarded_ads.cooldown_minutes"], 5));
  const minWatchSeconds = Math.max(1, num(settings["rewarded_ads.min_watch_seconds"], 15));
  const expiresDaysRaw = num(settings["rewarded_ads.bonus_coin_expires_days"], 0);
  const bonusCoinExpiresDays = expiresDaysRaw > 0 ? expiresDaysRaw : null;
  const providerMockEnabled = Boolean(settings["rewarded_ads.provider_mock_enabled"]);
  const mockAllowedByEnvironment =
    Boolean(settings["monetization.test_mode"]) ||
    process.env.NODE_ENV !== "production" ||
    input.role === "admin" ||
    input.role === "founder";
  const allowedUseForPaidChapters = Boolean(
    settings["rewarded_ads.allowed_use_for_paid_chapters"]
  );
  const allowedUseForTips = Boolean(settings["rewarded_ads.allowed_use_for_tips"]);

  if (!enabled || !input.userId) {
    return {
      enabled,
      providerMockEnabled,
      rewardCoinAmount,
      dailyLimitPerUser,
      cooldownMinutes,
      minWatchSeconds,
      bonusCoinExpiresDays,
      allowedUseForPaidChapters,
      allowedUseForTips,
      remainingToday: enabled ? dailyLimitPerUser : 0,
      nextAvailableAt: null,
      canStart:
        enabled && providerMockEnabled && mockAllowedByEnvironment && Boolean(input.userId),
      blockedReason: !enabled
        ? "Rewarded ads đang tắt."
        : !mockAllowedByEnvironment
          ? "Mock ads chỉ khả dụng trong test/dev/admin mode."
          : "Bạn cần đăng nhập."
    };
  }

  const [today, latest] = await Promise.all([
    countRewardedSessionsTodayByUser(input.userId, ["rewarded"]),
    getLatestRewardedAdSessionForUser(input.userId)
  ]);

  const rewardedToday = today.data;
  const remainingToday = Math.max(dailyLimitPerUser - rewardedToday, 0);
  const nextAvailableAt =
    latest.data && cooldownMinutes > 0
      ? new Date(
          new Date(latest.data.created_at).getTime() + cooldownMinutes * 60 * 1000
        ).toISOString()
      : null;
  const cooldownBlocked =
    nextAvailableAt != null && new Date(nextAvailableAt).getTime() > Date.now();
  const dailyBlocked = remainingToday <= 0;
  const canStart =
    enabled &&
    providerMockEnabled &&
    mockAllowedByEnvironment &&
    !cooldownBlocked &&
    !dailyBlocked;

  return {
    enabled,
    providerMockEnabled,
    rewardCoinAmount,
    dailyLimitPerUser,
    cooldownMinutes,
    minWatchSeconds,
    bonusCoinExpiresDays,
    allowedUseForPaidChapters,
    allowedUseForTips,
    remainingToday,
    nextAvailableAt,
    canStart,
    blockedReason: !providerMockEnabled
      ? "Mock provider đang tắt."
      : !mockAllowedByEnvironment
        ? "Mock ads chỉ khả dụng trong test/dev/admin mode."
      : dailyBlocked
        ? "Bạn đã đạt giới hạn hôm nay."
        : cooldownBlocked
          ? "Bạn cần chờ thêm trước khi xem quảng cáo tiếp theo."
          : null
  };
}

export async function startRewardedAdSessionAction(input?: { placement?: string }) {
  const { user, profile } = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để nhận coin.", data: null };
  }

  const availability = await getRewardedAdsAvailability({
    userId: user.id,
    role: profile?.role
  });
  if (!availability.enabled) {
    return { ok: false, error: "Rewarded ads đang tắt.", data: null };
  }

  if (availability.remainingToday <= 0) {
    await addRiskEvent({
      userId: user.id,
      eventType: "daily_reward_limit_attempt",
      severity: "medium",
      metadata: { placement: input?.placement ?? "unknown" }
    });
    await trackServerEvent({
      eventName: "rewarded_ad_limit_reached",
      category: "monetization",
      targetType: "user",
      targetId: user.id,
      metadata: { placement: input?.placement ?? "unknown", reason: "daily_limit" }
    });
    return { ok: false, error: "Bạn đã đạt giới hạn quảng cáo hôm nay.", data: null };
  }

  if (availability.blockedReason) {
    await trackServerEvent({
      eventName: "rewarded_ad_limit_reached",
      category: "monetization",
      targetType: "user",
      targetId: user.id,
      metadata: { placement: input?.placement ?? "unknown", reason: "cooldown_or_disabled" }
    });
    return { ok: false, error: availability.blockedReason, data: null };
  }

  const failedResult = await countRewardedSessionsTodayByUser(user.id, [
    "failed",
    "cancelled"
  ]);
  if (failedResult.data >= 8) {
    await addRiskEvent({
      userId: user.id,
      eventType: "high_failed_ad_sessions",
      severity: "high",
      metadata: { failed_or_cancelled_today: failedResult.data }
    });
    console.warn("Suspicious rewarded ad behavior", {
      userId: user.id,
      failedOrCancelledToday: failedResult.data
    });
  }

  const session = await createRewardedAdSession({
    userId: user.id,
    provider: "mock",
    rewardCoinAmount: availability.rewardCoinAmount,
    metadata: { placement: input?.placement ?? "unknown", mode: "mock" }
  });
  if (!session.data) {
    return { ok: false, error: session.error ?? "Không thể tạo phiên quảng cáo.", data: null };
  }

  const startedToday = await countRewardedSessionsTodayByUser(user.id, ["started", "completed", "rewarded"]);
  if (startedToday.data >= availability.dailyLimitPerUser * 3) {
    await addRiskEvent({
      userId: user.id,
      eventType: "too_many_ad_sessions",
      severity: "medium",
      metadata: { started_today: startedToday.data, daily_limit: availability.dailyLimitPerUser }
    });
  }

  await trackServerEvent({
    eventName: "rewarded_ad_started",
    category: "monetization",
    targetType: "user",
    targetId: user.id,
    metadata: {
      session_id: session.data.id,
      placement: input?.placement ?? "unknown",
      reward_coin_amount: availability.rewardCoinAmount
    }
  });

  return {
    ok: true,
    error: null,
    data: {
      sessionId: session.data.id,
      minWatchSeconds: availability.minWatchSeconds,
      rewardCoinAmount: availability.rewardCoinAmount
    }
  };
}

export async function trackRewardedAdOfferViewedAction(input?: {
  placement?: string;
}) {
  const { user } = await getCurrentUser();
  if (!user) {
    return;
  }
  await trackServerEvent({
    eventName: "rewarded_ad_offer_viewed",
    category: "monetization",
    targetType: "user",
    targetId: user.id,
    metadata: { placement: input?.placement ?? "unknown" }
  });
}

export async function cancelRewardedAdSessionAction(input: {
  sessionId: string;
  reason?: string;
}) {
  const { user } = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập.", data: null };
  }

  const existing = await getRewardedAdSessionById(input.sessionId);
  if (!existing.data || existing.data.user_id !== user.id) {
    return { ok: false, error: "Phiên quảng cáo không hợp lệ.", data: null };
  }
  if (existing.data.status === "rewarded") {
    return { ok: true, error: null, data: existing.data };
  }

  const updated = await updateRewardedAdSessionStatus({
    sessionId: input.sessionId,
    userId: user.id,
    status: "cancelled",
    metadata: {
      ...(existing.data.metadata ?? {}),
      cancel_reason: input.reason ?? "user_cancelled"
    }
  });

  await trackServerEvent({
    eventName: "rewarded_ad_failed",
    category: "monetization",
    targetType: "user",
    targetId: user.id,
    metadata: {
      session_id: input.sessionId,
      reason: input.reason ?? "user_cancelled",
      status: "cancelled"
    }
  });

  return { ok: true, error: null, data: updated.data };
}

export async function completeRewardedAdSessionAction(input: {
  sessionId: string;
  watchedSeconds: number;
}) {
  const { user, profile } = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để nhận coin.", data: null };
  }

  try {
    await assertActionAccess("wallet.topup");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, error: error.message, data: null };
    }
    throw error;
  }

  const availability = await getRewardedAdsAvailability({
    userId: user.id,
    role: profile?.role
  });
  if (!availability.enabled) {
    return { ok: false, error: "Rewarded ads đang tắt.", data: null };
  }

  const session = await getRewardedAdSessionById(input.sessionId);
  if (!session.data || session.data.user_id !== user.id) {
    return { ok: false, error: "Phiên quảng cáo không hợp lệ.", data: null };
  }

  if (session.data.status === "rewarded" || session.data.transaction_id) {
    await addRiskEvent({
      userId: user.id,
      eventType: "repeated_reward_claims",
      severity: "critical",
      metadata: { session_id: session.data.id }
    });
    return {
      ok: true,
      error: null,
      data: {
        alreadyRewarded: true,
        rewardCoinAmount: session.data.reward_coin_amount
      }
    };
  }

  if (input.watchedSeconds < availability.minWatchSeconds) {
    await updateRewardedAdSessionStatus({
      sessionId: session.data.id,
      userId: user.id,
      status: "failed",
      watchedSeconds: input.watchedSeconds,
      metadata: {
        ...(session.data.metadata ?? {}),
        fail_reason: "min_watch_not_reached"
      }
    });
    await trackServerEvent({
      eventName: "rewarded_ad_failed",
      category: "monetization",
      targetType: "user",
      targetId: user.id,
      metadata: {
        session_id: session.data.id,
        watched_seconds: input.watchedSeconds,
        min_watch_seconds: availability.minWatchSeconds,
        reason: "min_watch_not_reached"
      }
    });
    return { ok: false, error: "Bạn cần xem hết quảng cáo để nhận coin.", data: null };
  }

  const completed = await updateRewardedAdSessionStatus({
    sessionId: session.data.id,
    userId: user.id,
    status: "completed",
    watchedSeconds: input.watchedSeconds
  });
  if (!completed.data) {
    return { ok: false, error: completed.error ?? "Không thể hoàn tất phiên quảng cáo.", data: null };
  }

  await trackServerEvent({
    eventName: "rewarded_ad_completed",
    category: "monetization",
    targetType: "user",
    targetId: user.id,
    metadata: { session_id: session.data.id, watched_seconds: input.watchedSeconds }
  });

  const expiresAt = availability.bonusCoinExpiresDays
    ? new Date(
        Date.now() + availability.bonusCoinExpiresDays * 24 * 60 * 60 * 1000
      ).toISOString()
    : null;
  const credit = await creditUserCoins({
    userId: user.id,
    amount: session.data.reward_coin_amount,
    coinType: "bonus",
    reason: "rewarded_ad_coin",
    source: "rewarded_ad_coin",
    transactionCode: `RWAD-${session.data.id}`,
    metadata: {
      rewarded_ad_session_id: session.data.id,
      watched_seconds: input.watchedSeconds,
      bonus_coin_expires_at: expiresAt
    }
  });
  if (!credit.data) {
    const duplicate = (credit.error ?? "").toLowerCase().includes("duplicate");
    if (!duplicate) {
      return { ok: false, error: credit.error ?? "Không thể cộng coin thưởng.", data: null };
    }
  }

  const rewarded = await updateRewardedAdSessionStatus({
    sessionId: session.data.id,
    userId: user.id,
    status: "rewarded",
    watchedSeconds: input.watchedSeconds,
    transactionId: credit.data?.id ?? session.data.transaction_id,
    metadata: {
      ...(session.data.metadata ?? {}),
      rewarded_source: "rewarded_ad_coin"
    }
  });

  await trackServerEvent({
    eventName: "rewarded_ad_rewarded",
    category: "monetization",
    targetType: "user",
    targetId: user.id,
    metadata: {
      session_id: session.data.id,
      reward_coin_amount: session.data.reward_coin_amount,
      transaction_id: rewarded.data?.transaction_id ?? credit.data?.id ?? null
    }
  });

  return {
    ok: true,
    error: null,
    data: {
      alreadyRewarded: false,
      rewardCoinAmount: session.data.reward_coin_amount
    }
  };
}
