import { Card } from "@/components/ui";
import type { CoinEconomyMetrics } from "@/types/finance";

type CoinEconomyPanelProps = {
  data: CoinEconomyMetrics;
  isEmpty: boolean;
};

export function CoinEconomyPanel({ data, isEmpty }: CoinEconomyPanelProps) {
  const spentTotal = data.spentByModule.reduce((sum, row) => sum + row.coin, 0);

  if (isEmpty && data.paidCoinSold === 0 && spentTotal === 0) {
    return (
      <Card>
        <p className="text-sm text-zinc-400">Chưa có dữ liệu coin.</p>
      </Card>
    );
  }

  const warnings: string[] = [];
  if (data.bonusCoinSpendRatio > 60) {
    warnings.push("Coin thưởng tiêu bất thường (tỷ lệ cao).");
  }
  if (data.suspiciousBonusCoinUsageCount > 0) {
    warnings.push(
      `${data.suspiciousBonusCoinUsageCount} tài khoản có dấu hiệu nhận/tiêu coin thưởng bất thường.`
    );
  }
  if (data.negativeCoinTransactions > 0) {
    warnings.push(`${data.negativeCoinTransactions} giao dịch coin âm cần kiểm tra.`);
  }
  if (data.unpaidCoinCredits > 0) {
    warnings.push(
      `${data.unpaidCoinCredits} giao dịch nạp coin chưa paid nhưng có thể đã cộng coin.`
    );
  }

  return (
    <Card className="space-y-4">
      <p className="text-xs text-zinc-500">
        Phân loại: <span className="text-zinc-300">Coin nạp</span> (mua) ·{" "}
        <span className="text-zinc-300">Coin thưởng</span> (bonus)
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Coin nạp đã bán" value={data.paidCoinSold.toLocaleString("vi-VN")} />
        <Metric label="Coin thưởng đã phát" value={data.bonusCoinGranted.toLocaleString("vi-VN")} />
        <Metric label="Coin nạp còn lại" value={data.remainingPaidCoinBalance.toLocaleString("vi-VN")} />
        <Metric label="Coin thưởng còn lại" value={data.remainingBonusCoinBalance.toLocaleString("vi-VN")} />
        <Metric label="Coin đã tiêu" value={spentTotal.toLocaleString("vi-VN")} />
        <Metric label="Tỷ lệ tiêu coin thưởng" value={`${data.bonusCoinSpendRatio}%`} />
        <Metric label="Coin bị hoàn" value={data.coinsRefunded.toLocaleString("vi-VN")} />
        <Metric label="Coin admin điều chỉnh" value={data.adminCoinAdjusted.toLocaleString("vi-VN")} />
      </div>
      {warnings.length > 0 ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-sm text-amber-100">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      ) : null}
      {data.spentByModule.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">Coin tiêu theo module</p>
          {data.spentByModule.map((item) => (
            <div className="flex items-center justify-between text-sm" key={item.module}>
              <span className="text-zinc-400">{item.module}</span>
              <span className="text-zinc-200">{item.coin.toLocaleString("vi-VN")} coin</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 px-3 py-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
