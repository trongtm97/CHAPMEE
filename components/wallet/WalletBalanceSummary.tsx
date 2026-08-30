import { formatXu } from "@/lib/format/money";
import { XuIcon } from "@/components/wallet/XuIcon";

type WalletBalanceSummaryProps = {
  paidCoinBalance: number;
  bonusCoinBalance: number;
};

function BalanceRow({
  emphasized = false,
  label,
  value
}: {
  emphasized?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
        emphasized
          ? "border-amber-300/20 bg-amber-300/8"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p
        className={`min-w-0 text-sm font-medium ${
          emphasized ? "text-amber-100/85" : "text-zinc-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`shrink-0 whitespace-nowrap text-right text-base font-black tabular-nums sm:text-lg ${
          emphasized ? "text-amber-50" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function WalletBalanceSummary({
  paidCoinBalance,
  bonusCoinBalance
}: WalletBalanceSummaryProps) {
  const totalCoinBalance = paidCoinBalance + bonusCoinBalance;

  return (
    <div className="space-y-3">
      <BalanceRow label="Xu đã mua" value={formatXu(paidCoinBalance)} />
      <BalanceRow label="Xu thưởng" value={formatXu(bonusCoinBalance)} />
      <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <XuIcon size="sm" />
          <p className="min-w-0 text-sm font-semibold text-amber-100/85">Tổng Xu khả dụng</p>
        </div>
        <p className="shrink-0 whitespace-nowrap text-right text-lg font-black text-amber-50 tabular-nums sm:text-xl">
          {formatXu(totalCoinBalance)}
        </p>
      </div>
    </div>
  );
}
