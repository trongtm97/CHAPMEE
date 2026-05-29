import { Card } from "@/components/ui";
import { UnlockEarlyAccessButton } from "@/components/monetization/UnlockEarlyAccessButton";
import type { PaymentMode } from "@/types/payment";
import type { RewardedAdsAvailability } from "@/types/rewarded-ad";
import { RewardedAdButton } from "@/components/ads/RewardedAdButton";

type EarlyAccessGateProps = {
  storyId: string;
  chapterId: string;
  coinPrice: number;
  freeAt: string;
  remainingHours: number;
  isLoggedIn: boolean;
  walletBalance: number;
  purchaseEnabled: boolean;
  purchaseMode: PaymentMode;
  rewardedAdsAvailability?: RewardedAdsAvailability | null;
};

export function EarlyAccessGate({
  storyId,
  chapterId,
  coinPrice,
  freeAt,
  remainingHours,
  isLoggedIn,
  walletBalance,
  purchaseEnabled,
  purchaseMode,
  rewardedAdsAvailability = null
}: EarlyAccessGateProps) {
  return (
    <Card className="space-y-3 border-cyan-300/30 bg-cyan-300/5">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-cyan-200">
        Đọc sớm
      </p>
      <p className="text-sm text-zinc-200">
        Đọc sớm ngay với <span className="font-semibold text-white">{coinPrice} coin</span>
      </p>
      <p className="text-sm text-zinc-300">
        Hoặc chờ đến <span className="font-semibold text-zinc-100">{new Date(freeAt).toLocaleString()}</span> để đọc miễn phí.
      </p>
      <p className="text-xs text-zinc-400">Chương này sẽ miễn phí sau khoảng {remainingHours} giờ.</p>
      <UnlockEarlyAccessButton
        chapterId={chapterId}
        coinPrice={coinPrice}
        isLoggedIn={isLoggedIn}
        purchaseEnabled={purchaseEnabled}
        purchaseMode={purchaseMode}
        storyId={storyId}
        walletBalance={walletBalance}
      />
      {rewardedAdsAvailability?.enabled ? (
        <RewardedAdButton availability={rewardedAdsAvailability} placement="pay_gate" />
      ) : null}
    </Card>
  );
}
