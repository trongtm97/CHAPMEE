"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { GiftGrid } from "@/components/monetization/GiftGrid";
import { submitSupportAction } from "@/lib/monetization/tip-actions";
import type { VirtualGift } from "@/types/gift";
import Link from "next/link";

type TipGiftSheetProps = {
  toCreatorUserId: string;
  storyId?: string | null;
  chapterId?: string | null;
  gifts: VirtualGift[];
  purchaseEnabled: boolean;
};

const initialState = { ok: false, error: null as string | null };
const quickTips = [10, 30, 50, 100];
function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function TipGiftSheet({
  toCreatorUserId,
  storyId,
  chapterId,
  gifts,
  purchaseEnabled
}: TipGiftSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tipCoinAmount, setTipCoinAmount] = useState<number>(10);
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [requestId, setRequestId] = useState(() => createRequestId());
  const [state, action, pending] = useActionState(submitSupportAction, initialState);

  const selectedGift = useMemo(
    () => gifts.find((gift) => gift.id === selectedGiftId) ?? null,
    [gifts, selectedGiftId]
  );

  return (
    <div className="space-y-2">
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 text-sm font-black uppercase tracking-[0.12em] text-cyan-200"
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        Ủng hộ
      </button>
      {isOpen ? (
        <form action={action} className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
          <input name="to_creator_user_id" type="hidden" value={toCreatorUserId} />
          <input name="story_id" type="hidden" value={storyId ?? ""} />
          <input name="chapter_id" type="hidden" value={chapterId ?? ""} />
          <input name="request_id" type="hidden" value={requestId} />
          <input name="gift_id" type="hidden" value={selectedGiftId ?? ""} />
          <input
            name="tip_coin_amount"
            type="hidden"
            value={String(selectedGift ? selectedGift.coin_price : tipCoinAmount)}
          />
          <input name="is_anonymous" type="hidden" value={String(isAnonymous)} />
          <input name="message" type="hidden" value={message} />

          <p className="text-sm font-semibold text-white">Tip nhanh</p>
          <div className="flex flex-wrap gap-2">
            {quickTips.map((amount) => (
              <button
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                  !selectedGift && tipCoinAmount === amount
                    ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100"
                    : "border-white/10 text-zinc-300"
                }`}
                key={amount}
                onClick={() => {
                  setSelectedGiftId(null);
                  setTipCoinAmount(amount);
                }}
                type="button"
              >
                {amount} coin
              </button>
            ))}
          </div>

          <p className="text-sm font-semibold text-white">Hoặc chọn quà</p>
          <GiftGrid
            gifts={gifts}
            onSelectGift={(giftId, coinPrice) => {
              setSelectedGiftId(giftId);
              setTipCoinAmount(coinPrice);
            }}
            selectedGiftId={selectedGiftId}
          />

          <textarea
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
            maxLength={160}
            onChange={(event) => setMessage(event.currentTarget.value)}
            placeholder="Lời nhắn ngắn cho tác giả (optional)"
            rows={3}
            value={message}
          />
          <label className="text-sm text-zinc-300">
            <input
              checked={isAnonymous}
              onChange={(event) => setIsAnonymous(event.currentTarget.checked)}
              type="checkbox"
            />{" "}
            Ủng hộ ẩn danh
          </label>

          {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
          {state.error?.toLowerCase().includes("không thể trừ coin") && purchaseEnabled ? (
            <Link className="text-sm font-semibold text-cyan-300" href="/coin/checkout">
              Bạn không đủ coin. Nạp coin ngay
            </Link>
          ) : null}
          {state.ok ? (
            <p className="text-sm text-emerald-300">Ủng hộ thành công. Cảm ơn bạn!</p>
          ) : null}
          <Button
            loading={pending}
            onClick={() => {
              if (state.ok) setRequestId(createRequestId());
            }}
            type="submit"
          >
            Xác nhận ủng hộ
          </Button>
        </form>
      ) : null}
    </div>
  );
}
