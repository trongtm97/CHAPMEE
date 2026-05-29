import { Card } from "@/components/ui";

type CoinSafetyLimitsProps = {
  maxPerUserPerAction: number;
  maxBatchUsers: number;
  maxBatchTotalCoins: number;
  highAmountWarning: number;
};

export function CoinSafetyLimits({
  maxPerUserPerAction,
  maxBatchUsers,
  maxBatchTotalCoins,
  highAmountWarning
}: CoinSafetyLimitsProps) {
  return (
    <Card className="space-y-2">
      <p className="text-sm font-semibold text-white">Giới hạn an toàn</p>
      <ul className="space-y-1 text-sm text-zinc-400">
        <li>
          Tối đa mỗi lần cho 1 user:{" "}
          <span className="font-semibold text-zinc-200">
            {maxPerUserPerAction.toLocaleString("vi-VN")} coin
          </span>
        </li>
        <li>
          Tối đa mỗi batch:{" "}
          <span className="font-semibold text-zinc-200">{maxBatchUsers} user</span>
        </li>
        <li>
          Tối đa tổng coin mỗi batch:{" "}
          <span className="font-semibold text-zinc-200">
            {maxBatchTotalCoins.toLocaleString("vi-VN")} coin
          </span>
        </li>
        <li>
          Cảnh báo vàng + bắt buộc ghi chú khi trên{" "}
          <span className="font-semibold text-amber-200">
            {highAmountWarning.toLocaleString("vi-VN")} coin
          </span>
        </li>
        <li>Không cho trừ coin làm số dư âm.</li>
        <li>Coin nạp luôn cần lý do rõ ràng.</li>
      </ul>
    </Card>
  );
}
