import { UserWalletCard } from "@/components/wallet/UserWalletCard";
import { VipCard } from "@/components/vip/VipCard";
import { loadMeMonetization } from "@/lib/me/loadMeMonetization";

import type { CurrentUserProfile } from "@/lib/auth/getCurrentUser";

type MeDesktopMonetizationSectionProps = {
  userId: string;
  role?: CurrentUserProfile["role"] | null;
};

function WalletSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="h-4 w-32 rounded bg-white/10" />
      <div className="h-10 w-full rounded-xl bg-white/10" />
      <div className="h-24 w-full rounded-xl bg-white/10" />
    </div>
  );
}

export function MeDesktopMonetizationFallback() {
  return (
    <div className="space-y-4">
      <WalletSkeleton />
      <WalletSkeleton />
    </div>
  );
}

export async function MeDesktopMonetizationSection({
  role,
  userId
}: MeDesktopMonetizationSectionProps) {
  const monetization = await loadMeMonetization({ userId, role });

  return (
    <>
      {monetization.showCoinWallet && monetization.wallet ? (
        <UserWalletCard
          chapterUnlocks={monetization.chapterUnlocks}
          coinDisplayName={monetization.coinDisplayName}
          purchaseEnabled={monetization.coinPurchaseEnabled}
          rewardedAdsAvailability={monetization.rewardedAdsAvailability}
          transactions={monetization.transactions}
          wallet={monetization.wallet}
        />
      ) : null}

      <VipCard
        activePlan={monetization.vipPlan}
        enabled={monetization.vipEnabled}
        expiresAt={monetization.vipExpiresAt}
        isActive={monetization.vipActive}
      />
    </>
  );
}
