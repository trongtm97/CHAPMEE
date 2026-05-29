"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

type MockRewardedAdModalProps = {
  open: boolean;
  minWatchSeconds: number;
  rewardCoinAmount: number;
  onCancel: () => void;
  onClaim: (watchedSeconds: number) => void;
};

export function MockRewardedAdModal({
  open,
  minWatchSeconds,
  rewardCoinAmount,
  onCancel,
  onClaim
}: MockRewardedAdModalProps) {
  const [remaining, setRemaining] = useState(minWatchSeconds);

  useEffect(() => {
    if (!open) {
      return;
    }
    const interval = window.setInterval(() => {
      setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [open, minWatchSeconds]);

  if (!open) {
    return null;
  }

  const watchedSeconds = minWatchSeconds - remaining;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-zinc-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">
          Mock Rewarded Ad
        </p>
        <p className="text-sm text-zinc-200">
          Giả lập video quảng cáo. Xem đủ thời lượng để nhận{" "}
          <span className="font-semibold text-white">{rewardCoinAmount} coin</span>.
        </p>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <p className="text-sm text-zinc-300">
            {remaining > 0
              ? `Còn ${remaining}s để hoàn tất quảng cáo...`
              : "Đã xem đủ thời lượng tối thiểu."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCancel} type="button" variant="secondary">
            Đóng
          </Button>
          <Button
            disabled={remaining > 0}
            onClick={() => onClaim(watchedSeconds)}
            type="button"
          >
            Nhận coin
          </Button>
        </div>
      </div>
    </div>
  );
}
