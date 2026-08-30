"use client";

import { useMemo, useState } from "react";
import { RecommendationTicketsInfo } from "@/components/rankings/RecommendationTicketsInfo";

type RecommendStoryDialogProps = {
  open: boolean;
  balance: number;
  minTickets: number;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (tickets: number) => void;
};

const QUICK_AMOUNTS = [10, 100, 500, 1000] as const;

export function RecommendStoryDialog({
  open,
  balance,
  minTickets,
  isPending,
  onClose,
  onConfirm
}: RecommendStoryDialogProps) {
  const [amount, setAmount] = useState(String(minTickets));

  const parsed = Math.trunc(Number(amount));
  const canSubmit = parsed >= minTickets && parsed <= balance && balance > 0;

  const quickOptions = useMemo(
    () => QUICK_AMOUNTS.filter((value) => value <= balance && value >= minTickets),
    [balance, minTickets]
  );

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recommend-story-title"
    >
      <button
        aria-label="Đóng"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />
      <div className="relative w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-[#0d1118] p-4 shadow-xl">
        <div>
          <h2 id="recommend-story-title" className="text-lg font-bold text-zinc-100">
            Đề cử truyện
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Bạn có{" "}
            <span className="font-bold text-amber-300">
              {balance.toLocaleString("vi-VN")} Phiếu đề cử
            </span>
          </p>
        </div>

        {balance === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              Bạn chưa có phiếu. Hãy đọc truyện, nạp Coin hoặc tham gia hoạt động trên ChapMee để
              nhận Phiếu đề cử.
            </p>
            <RecommendationTicketsInfo variant="inline" />
          </div>
        ) : (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-500">Số phiếu muốn dùng</span>
              <input
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-100"
                inputMode="numeric"
                min={minTickets}
                onChange={(event) => setAmount(event.target.value)}
                type="number"
                value={amount}
              />
            </label>
            {quickOptions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {quickOptions.map((value) => (
                  <button
                    className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-white/[0.06]"
                    key={value}
                    onClick={() => setAmount(String(value))}
                    type="button"
                  >
                    {value.toLocaleString("vi-VN")}
                  </button>
                ))}
              </div>
            ) : null}
            <p className="text-[11px] text-zinc-500">
              Phiếu đã dùng sẽ giúp truyện tăng hạng trong bảng Được đề cử.
            </p>
          </>
        )}

        <div className="flex gap-2">
          <button
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-semibold text-zinc-300"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
          {balance > 0 ? (
            <button
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-amber-300 px-4 text-sm font-bold text-zinc-950 disabled:opacity-50"
              disabled={!canSubmit || isPending}
              onClick={() => onConfirm(parsed)}
              type="button"
            >
              {isPending ? "Đang xử lý…" : "Dùng Phiếu đề cử"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
