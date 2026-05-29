"use client";

import type { VirtualGift } from "@/types/gift";

type GiftGridProps = {
  gifts: VirtualGift[];
  selectedGiftId: string | null;
  onSelectGift: (giftId: string, coinPrice: number) => void;
};

export function GiftGrid({ gifts, selectedGiftId, onSelectGift }: GiftGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {gifts.map((gift) => (
        <button
          className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
            selectedGiftId === gift.id
              ? "border-cyan-300/60 bg-cyan-300/10"
              : "border-white/10 bg-white/[0.02]"
          }`}
          key={gift.id}
          onClick={() => onSelectGift(gift.id, gift.coin_price)}
          type="button"
        >
          <p className="font-semibold text-white">
            {gift.emoji ? `${gift.emoji} ` : ""}{gift.name}
          </p>
          <p className="text-xs text-zinc-400">{gift.coin_price} coin</p>
        </button>
      ))}
    </div>
  );
}
