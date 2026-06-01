"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui";
import { simulateAdRevenueSplit } from "@/lib/creator-ad-revenue/revenue-simulator";
import type { CreatorAdRevenuePolicy } from "@/types/creator-ad-revenue-policy";

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

export function RevenueSimulatorPanel({ policy }: { policy: CreatorAdRevenuePolicy }) {
  const [gross, setGross] = useState("10000000");
  const [invalid, setInvalid] = useState("500000");
  const [fees, setFees] = useState("0");

  const result = useMemo(
    () =>
      simulateAdRevenueSplit({
        grossRevenueVnd: Number(gross) || 0,
        invalidTrafficAdjustmentVnd: Number(invalid) || 0,
        taxAndFeesVnd: Number(fees) || 0,
        creatorPoolPercent: policy.creator_pool_percent,
        reservePercent: policy.reserve_percent
      }),
    [gross, invalid, fees, policy.creator_pool_percent, policy.reserve_percent]
  );

  return (
    <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-cyan-100">Mô phỏng công thức chia</h3>
        <p className="text-xs text-zinc-500 mt-1">
          Chỉ là mô phỏng nội bộ — không phải đối soát thật hay số chi trả cuối cùng.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-zinc-400">
          Doanh thu QC hợp lệ tháng (VND)
          <Input className="mt-1" inputMode="numeric" value={gross} onChange={(e) => setGross(e.target.value)} />
        </label>
        <label className="text-xs text-zinc-400">
          Điều chỉnh / invalid traffic (VND)
          <Input className="mt-1" inputMode="numeric" value={invalid} onChange={(e) => setInvalid(e.target.value)} />
        </label>
        <label className="text-xs text-zinc-400">
          Thuế / phí khấu trừ (VND)
          <Input className="mt-1" inputMode="numeric" value={fees} onChange={(e) => setFees(e.target.value)} />
        </label>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {[
          ["Doanh thu hợp lệ sau điều chỉnh", result.netValidRevenueVnd],
          ["Quỹ tác giả", result.creatorPoolVnd],
          ["Giữ dự phòng", result.reserveVnd],
          ["Có thể phân bổ cho tác giả", result.distributableVnd],
          ["ChapMee giữ lại (phần còn lại)", result.platformRetainedVnd]
        ].map(([label, value]) => (
          <div className="flex justify-between gap-2 rounded-lg bg-black/20 px-3 py-2" key={String(label)}>
            <dt className="text-zinc-400">{label}</dt>
            <dd className="font-medium text-white">{formatVnd(value as number)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
