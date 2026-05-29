"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";
import { unlockEarlyAccessAction } from "@/lib/monetization/early-access";
import type { PaymentMode } from "@/types/payment";

type UnlockEarlyAccessButtonProps = {
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

export function UnlockEarlyAccessButton({
  storyId,
  chapterId,
  isLoggedIn,
  purchaseEnabled,
  purchaseMode,
  walletBalance,
  coinPrice
}: UnlockEarlyAccessButtonProps) {
  const [requestId, setRequestId] = useState(createRequestId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoggedIn) {
    return (
      <Link
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-black uppercase tracking-[0.12em] text-zinc-950"
        href={`/login?next=/stories/${storyId}`}
      >
        Đăng nhập để đọc sớm
      </Link>
    );
  }

  async function onUnlock() {
    setPending(true);
    setError(null);
    const result = await unlockEarlyAccessAction({ storyId, chapterId, requestId });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Không thể mở khóa đọc sớm.");
      return;
    }
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
        Đọc sớm với {coinPrice} coin
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
    </div>
  );
}
