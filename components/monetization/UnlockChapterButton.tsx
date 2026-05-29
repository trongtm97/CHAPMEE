"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";
import { unlockPaidChapterAction } from "@/lib/monetization/paid-chapters";
import type { PaymentMode } from "@/types/payment";

type UnlockChapterButtonProps = {
  storyId: string;
  chapterId: string;
  isLoggedIn: boolean;
  purchaseEnabled: boolean;
  purchaseMode: PaymentMode;
  walletBalance: number;
  coinPrice: number;
};

function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function UnlockChapterButton({
  storyId,
  chapterId,
  isLoggedIn,
  purchaseEnabled,
  purchaseMode,
  walletBalance,
  coinPrice
}: UnlockChapterButtonProps) {
  const [requestId, setRequestId] = useState(createRequestId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isLoggedIn) {
    return (
      <Link
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-black uppercase tracking-[0.12em] text-zinc-950"
        href={`/login?next=/stories/${storyId}`}
      >
        Đăng nhập để mở khóa
      </Link>
    );
  }

  async function onUnlock() {
    setPending(true);
    setError(null);
    const result = await unlockPaidChapterAction({ storyId, chapterId, requestId });
    setPending(false);

    if (!result.ok) {
      setError(result.error ?? "Không thể mở khóa chương.");
      return;
    }
    setSuccess(true);
    setRequestId(createRequestId());
    window.location.reload();
  }

  return (
    <div className="space-y-2">
      <Button
        disabled={pending || walletBalance < coinPrice}
        loading={pending}
        onClick={onUnlock}
        type="button"
      >
        Mở khóa chương
      </Button>
      {walletBalance < coinPrice ? (
        purchaseMode === "store_billing" ? (
          <p className="text-sm text-zinc-300">
            Bạn chưa đủ coin. Mua coin trong ứng dụng để tiếp tục.
          </p>
        ) : purchaseMode === "consumption_only" ? (
          <p className="text-sm text-zinc-400">Bạn cần thêm coin để mở nội dung này. Quay lại sau hoặc xem nội dung miễn phí khác.</p>
        ) : purchaseEnabled ? (
          <Link className="text-sm font-semibold text-cyan-300" href="/wallet/top-up">
            Bạn không đủ coin. Nạp coin ngay
          </Link>
        ) : (
          <p className="text-sm text-zinc-400">Bạn chưa đủ coin và nạp coin đang tắt.</p>
        )
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">Mở khóa thành công!</p> : null}
    </div>
  );
}
