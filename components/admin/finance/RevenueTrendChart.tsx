"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import type { FinanceDailyTrendPoint } from "@/types/finance";

type TrendMode = "revenue" | "coin" | "payout";

type RevenueTrendChartProps = {
  points: FinanceDailyTrendPoint[];
  isEmpty: boolean;
};

function maxOf(points: FinanceDailyTrendPoint[], mode: TrendMode) {
  return Math.max(
    1,
    ...points.map((p) => {
      if (mode === "revenue") return p.revenueVnd;
      if (mode === "coin") return Math.max(p.coinPurchased, p.coinSpent);
      return p.payoutVnd;
    })
  );
}

export function RevenueTrendChart({ points, isEmpty }: RevenueTrendChartProps) {
  const [mode, setMode] = useState<TrendMode>("revenue");
  const max = maxOf(points, mode);

  const modes: Array<{ id: TrendMode; label: string }> = [
    { id: "revenue", label: "Doanh thu" },
    { id: "coin", label: "Coin" },
    { id: "payout", label: "Rút tiền" }
  ];

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-black text-white">Xu hướng theo ngày</h3>
        <div className="flex flex-wrap gap-2">
          {modes.map((m) => (
            <button
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                mode === m.id
                  ? "bg-cyan-300 text-zinc-950"
                  : "border border-white/10 text-zinc-300"
              }`}
              key={m.id}
              onClick={() => setMode(m.id)}
              type="button"
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {isEmpty || points.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Chưa có dữ liệu biểu đồ trong khoảng thời gian này.
        </p>
      ) : (
        <div className="space-y-2">
          {points.map((point) => {
            const value =
              mode === "revenue"
                ? point.revenueVnd
                : mode === "coin"
                  ? point.coinPurchased + point.coinSpent
                  : point.payoutVnd;
            const pct = Math.round((value / max) * 100);
            const label =
              mode === "coin"
                ? `Nạp ${point.coinPurchased.toLocaleString("vi-VN")} · Tiêu ${point.coinSpent.toLocaleString("vi-VN")}`
                : mode === "revenue"
                  ? `${point.revenueVnd.toLocaleString("vi-VN")} đ`
                  : `${point.payoutVnd.toLocaleString("vi-VN")} đ`;

            return (
              <div className="grid grid-cols-[88px_1fr_auto] items-center gap-2 text-xs" key={point.date}>
                <span className="text-zinc-500">{point.date}</span>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-cyan-400/80"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-zinc-300">{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
