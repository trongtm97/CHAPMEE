import { Card, SectionHeader } from "@/components/ui";
import Link from "next/link";
import type { TransactionRow } from "@/types/transaction";
import type { UserWallet } from "@/types/wallet";
import type { ChapterUnlock } from "@/types/paid-chapter";
import type { RewardedAdsAvailability } from "@/types/rewarded-ad";
import { RewardedAdButton } from "@/components/ads/RewardedAdButton";

type UserWalletCardProps = {
  wallet: UserWallet;
  transactions: TransactionRow[];
  coinDisplayName: string;
  purchaseEnabled: boolean;
  chapterUnlocks?: ChapterUnlock[];
  rewardedAdsAvailability?: RewardedAdsAvailability | null;
};

export function UserWalletCard({
  wallet,
  transactions,
  coinDisplayName,
  purchaseEnabled,
  chapterUnlocks = [],
  rewardedAdsAvailability = null
}: UserWalletCardProps) {
  const total = wallet.paid_coin_balance + wallet.bonus_coin_balance;

  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Chỉ hiển thị khi monetization + coin được admin bật."
        title="Ví Coin"
      />
      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Paid</p>
            <p className="text-xl font-black text-white">{wallet.paid_coin_balance}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Bonus</p>
            <p className="text-xl font-black text-white">{wallet.bonus_coin_balance}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Tổng</p>
            <p className="text-xl font-black text-cyan-200">
              {total} {coinDisplayName}
            </p>
          </div>
        </div>

        {purchaseEnabled ? (
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black uppercase tracking-[0.12em] text-zinc-950"
            href="/wallet/top-up"
          >
            Nạp coin
          </Link>
        ) : null}

        {rewardedAdsAvailability?.enabled ? (
          <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/5 p-3">
            <p className="mb-2 text-sm font-semibold text-cyan-100">Nhận coin miễn phí</p>
            <RewardedAdButton
              availability={rewardedAdsAvailability}
              placement="wallet_card"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">Giao dịch gần đây</p>
          {transactions.length === 0 ? (
            <p className="text-sm text-zinc-400">Chưa có giao dịch coin nào.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm"
                  key={tx.id}
                >
                  <div>
                    <p className="font-semibold text-zinc-100">{tx.type}</p>
                    <p className="text-xs text-zinc-400">{tx.source}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-zinc-100">
                      {tx.direction === "debit" ? "-" : "+"}
                      {tx.coin_amount ?? 0}
                    </p>
                    <p className="text-xs text-zinc-400">{tx.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">Chương đã mở khóa</p>
          {chapterUnlocks.length === 0 ? (
            <p className="text-sm text-zinc-400">Bạn chưa mở khóa chương nào.</p>
          ) : (
            <div className="space-y-2">
              {chapterUnlocks.map((unlock) => (
                <div
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm"
                  key={unlock.id}
                >
                  <p className="font-semibold text-zinc-100">Chapter {unlock.chapter_id.slice(0, 8)}</p>
                  <p className="text-zinc-300">-{unlock.coin_amount} coin</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
