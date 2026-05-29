import { Card, SectionHeader } from "@/components/ui";
import type { CreatorWallet } from "@/types/wallet";

type CreatorRevenueCardProps = {
  payoutEnabled: boolean;
  wallet: CreatorWallet;
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VND`;
}

export function CreatorRevenueCard({
  payoutEnabled,
  wallet
}: CreatorRevenueCardProps) {
  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Số liệu ví doanh thu thật, không dựng dữ liệu giả."
        title="Ví Doanh Thu"
      />
      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Pending</p>
            <p className="text-base font-black text-white">
              {formatVnd(wallet.pending_revenue_vnd)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Available</p>
            <p className="text-base font-black text-white">
              {formatVnd(wallet.available_revenue_vnd)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Locked</p>
            <p className="text-base font-black text-white">
              {formatVnd(wallet.locked_revenue_vnd)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Total earned</p>
            <p className="text-base font-black text-cyan-200">
              {formatVnd(wallet.total_earned_vnd)}
            </p>
          </div>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-black uppercase tracking-[0.12em] text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!payoutEnabled}
          type="button"
        >
          Yêu cầu rút tiền
        </button>
      </Card>
    </section>
  );
}
