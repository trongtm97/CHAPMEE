"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { MockRewardedAdModal } from "@/components/ads/MockRewardedAdModal";
import {
  cancelRewardedAdSessionAction,
  completeRewardedAdSessionAction,
  startRewardedAdSessionAction,
  trackRewardedAdOfferViewedAction
} from "@/lib/monetization/rewarded-ads";
import type { RewardedAdsAvailability } from "@/types/rewarded-ad";

type RewardedAdButtonProps = {
  availability: RewardedAdsAvailability;
  placement: "wallet_card" | "pay_gate" | "coin_checkout";
  className?: string;
};

export function RewardedAdButton({
  availability,
  placement,
  className
}: RewardedAdButtonProps) {
  const [pending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rewardAmount, setRewardAmount] = useState(availability.rewardCoinAmount);
  const [minWatchSeconds, setMinWatchSeconds] = useState(availability.minWatchSeconds);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      void trackRewardedAdOfferViewedAction({ placement });
    });
  }, [placement]);

  const helperText = useMemo(() => {
    if (!availability.enabled) {
      return null;
    }
    if (!availability.canStart) {
      return availability.blockedReason;
    }
    return `Hôm nay còn ${availability.remainingToday}/${availability.dailyLimitPerUser} lượt.`;
  }, [availability]);

  function startAd() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await startRewardedAdSessionAction({ placement });
      if (!result.ok || !result.data) {
        setError(result.error ?? "Không thể bắt đầu quảng cáo.");
        return;
      }
      setSessionId(result.data.sessionId);
      setRewardAmount(result.data.rewardCoinAmount);
      setMinWatchSeconds(result.data.minWatchSeconds);
      setModalOpen(true);
    });
  }

  function cancelAd() {
    const currentSessionId = sessionId;
    setModalOpen(false);
    if (!currentSessionId) {
      return;
    }
    startTransition(async () => {
      await cancelRewardedAdSessionAction({ sessionId: currentSessionId, reason: "user_closed_modal" });
      setSessionId(null);
    });
  }

  function claimReward(watchedSeconds: number) {
    const currentSessionId = sessionId;
    if (!currentSessionId) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await completeRewardedAdSessionAction({
        sessionId: currentSessionId,
        watchedSeconds
      });
      if (!result.ok || !result.data) {
        setError(result.error ?? "Không thể nhận coin thưởng.");
        return;
      }
      setModalOpen(false);
      setSessionId(null);
      setSuccess(
        result.data.alreadyRewarded
          ? "Phiên này đã nhận thưởng trước đó."
          : `Bạn nhận được ${result.data.rewardCoinAmount} coin thưởng.`
      );
      window.location.reload();
    });
  }

  if (!availability.enabled) {
    return null;
  }

  return (
    <div className={className ?? "space-y-2"}>
      <Button
        disabled={pending || !availability.canStart}
        loading={pending}
        onClick={startAd}
        type="button"
        variant="secondary"
      >
        Xem quảng cáo để nhận {availability.rewardCoinAmount} coin
      </Button>
      <p className="text-xs text-zinc-400">
        Coin thưởng có thể bị giới hạn theo chính sách.
      </p>
      {helperText ? <p className="text-xs text-zinc-400">{helperText}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

      <MockRewardedAdModal
        key={sessionId ?? "rewarded-ad-modal"}
        minWatchSeconds={minWatchSeconds}
        onCancel={cancelAd}
        onClaim={claimReward}
        open={modalOpen}
        rewardCoinAmount={rewardAmount}
      />
    </div>
  );
}
