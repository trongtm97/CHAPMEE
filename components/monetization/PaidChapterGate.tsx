import { Card } from "@/components/ui";
import { UnlockChapterButton } from "@/components/monetization/UnlockChapterButton";
import type { PaymentMode } from "@/types/payment";
import type { RewardedAdsAvailability } from "@/types/rewarded-ad";
import { RewardedAdButton } from "@/components/ads/RewardedAdButton";

type PaidChapterGateProps = {
  storyId: string;
  chapterId: string;
  storyTitle: string;
  chapterTitle: string;
  creatorName: string | null;
  coinPrice: number;
  walletBalance: number;
  isLoggedIn: boolean;
  purchaseEnabled: boolean;
  purchaseMode: PaymentMode;
  rewardedAdsAvailability?: RewardedAdsAvailability | null;
};

export function PaidChapterGate({
  storyId,
  chapterId,
  storyTitle,
  chapterTitle,
  creatorName,
  coinPrice,
  walletBalance,
  isLoggedIn,
  purchaseEnabled,
  purchaseMode,
  rewardedAdsAvailability = null
}: PaidChapterGateProps) {
  return (
    <Card className="space-y-3 border-amber-300/30 bg-amber-300/5">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-amber-200">
        Chương trả phí
      </p>
      <div className="space-y-1">
        <p className="text-lg font-black text-white">{chapterTitle}</p>
        <p className="text-sm text-zinc-300">{storyTitle}</p>
        {creatorName ? (
          <p className="text-sm text-zinc-400">Tác giả: {creatorName}</p>
        ) : null}
      </div>
      <div className="flex items-center justify-between text-sm">
        <p className="text-zinc-300">Giá mở khóa</p>
        <p className="font-semibold text-amber-100">{coinPrice} coin</p>
      </div>
      <div className="flex items-center justify-between text-sm">
        <p className="text-zinc-300">Số coin hiện có</p>
        <p className="font-semibold text-zinc-100">{walletBalance} coin</p>
      </div>
      <UnlockChapterButton
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
