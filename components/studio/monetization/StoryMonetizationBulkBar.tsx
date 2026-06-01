"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { MonetizationConfirmModal } from "@/components/studio/monetization/MonetizationConfirmModal";
import type { StudioMonetizationBulkAction } from "@/types/studio-monetization-stories";
import type { StudioMonetizationConfigView } from "@/types/studio-monetization";
import { INVALID_COIN_ERROR, validateStudioCoinPrice } from "@/lib/studio/validate-coin-price";

type PendingBulk = {
  action: StudioMonetizationBulkAction;
  coinPrice?: number;
  freeChapters?: number;
  fullAccessPriceCoin?: number;
} | null;

type StoryMonetizationBulkBarProps = {
  count: number;
  chapteredCount?: number;
  standaloneCount?: number;
  config: StudioMonetizationConfigView;
  disabled: boolean;
  pending: boolean;
  onClear: () => void;
  onApply: (input: {
    action: StudioMonetizationBulkAction;
    coinPrice?: number;
    freeChaptersCount?: number;
    fullAccessPriceCoin?: number;
  }) => void;
};

export function StoryMonetizationBulkBar({
  chapteredCount = 0,
  count,
  config,
  disabled,
  pending,
  standaloneCount = 0,
  onClear,
  onApply
}: StoryMonetizationBulkBarProps) {
  const [pendingBulk, setPendingBulk] = useState<PendingBulk>(null);
  const [coinPrice, setCoinPrice] = useState(String(config.paidChapterDefaultCoinPrice));
  const [freeChapters, setFreeChapters] = useState("3");
  const [fullAccessPrice, setFullAccessPrice] = useState("100");
  const [priceError, setPriceError] = useState<string | null>(null);

  if (count === 0) return null;

  function openConfirm(action: StudioMonetizationBulkAction) {
    setPriceError(null);
    if (action === "set_coin_price" || action === "set_full_access_price") {
      const raw = action === "set_full_access_price" ? fullAccessPrice : coinPrice;
      if (!/^\d+$/.test(raw.trim())) {
        setPriceError(INVALID_COIN_ERROR);
        return;
      }
      const check = validateStudioCoinPrice(Number(raw), { required: true, allowFree: false });
      if (!check.ok) {
        setPriceError(check.error);
        return;
      }
      setPendingBulk({
        action,
        coinPrice: action === "set_coin_price" ? check.price ?? undefined : undefined,
        fullAccessPriceCoin:
          action === "set_full_access_price" ? check.price ?? undefined : undefined
      });
      return;
    }
    if (action === "set_free_chapters") {
      setPendingBulk({ action, freeChapters: Number(freeChapters) || 0, coinPrice: Number(coinPrice) });
      return;
    }
    setPendingBulk({ action });
  }

  function confirmLabel(action: StudioMonetizationBulkAction) {
    switch (action) {
      case "enable_paid":
        return "Bật trả phí";
      case "disable_paid":
        return "Tắt trả phí";
      case "set_free_chapters":
        return "Cài chương miễn phí";
      case "set_coin_price":
        return "Cài giá chương";
      case "enable_full_access":
        return "Bật trọn bộ";
      case "disable_full_access":
        return "Tắt trọn bộ";
      case "set_all_free":
        return "Ẩn khỏi kiếm tiền";
      default:
        return "Xác nhận";
    }
  }

  function confirmDescription(action: StudioMonetizationBulkAction) {
    const base = `Áp dụng cho ${count} truyện đã chọn.`;
    if (action === "disable_paid" || action === "disable_full_access" || action === "set_all_free") {
      return `${base} Có thể ảnh hưởng doanh thu tương lai. Quyền đọc đã mua không đổi.`;
    }
    return `${base} Quyền đọc đã mua không bị ảnh hưởng.`;
  }

  const danger = ["disable_paid", "disable_full_access", "set_all_free"];

  return (
    <>
      <div className="rounded-xl border border-cyan-400/25 bg-gradient-to-r from-cyan-500/10 to-zinc-900 p-3 shadow-lg shadow-cyan-950/20">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-white">Đã chọn {count} truyện</span>
          <button
            className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            onClick={onClear}
            type="button"
          >
            Xoá chọn
          </button>
        </div>
        {chapteredCount > 0 && standaloneCount > 0 ? (
          <p className="mb-2 text-xs text-amber-200/90">
            Đã chọn cả truyện nhiều chương ({chapteredCount}) và một phần ({standaloneCount}).
            Một số thao tác chỉ áp dụng cho truyện nhiều chương.
          </p>
        ) : null}
        {priceError ? <p className="mb-2 text-xs text-rose-300">{priceError}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button
            className="!min-h-10 !text-xs !normal-case"
            disabled={disabled || pending}
            onClick={() => openConfirm("enable_paid")}
            type="button"
            variant="secondary"
          >
            Bật trả phí
          </Button>
          <Button
            className="!min-h-10 !text-xs !normal-case text-amber-100"
            disabled={disabled || pending}
            onClick={() => openConfirm("disable_paid")}
            type="button"
            variant="ghost"
          >
            Tắt trả phí
          </Button>
          <input
            aria-label="Số chương miễn phí"
            className="w-14 rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-xs text-white"
            disabled={disabled || pending}
            onChange={(event) => setFreeChapters(event.target.value)}
            value={freeChapters}
          />
          <Button
            className="!min-h-10 !text-xs !normal-case"
            disabled={disabled || pending}
            onClick={() => openConfirm("set_free_chapters")}
            type="button"
            variant="secondary"
          >
            Chương miễn phí
          </Button>
          <input
            aria-label="Giá chương"
            className="w-16 rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-xs text-white"
            disabled={disabled || pending}
            onChange={(event) => setCoinPrice(event.target.value)}
            value={coinPrice}
          />
          <Button
            className="!min-h-10 !text-xs !normal-case"
            disabled={disabled || pending}
            onClick={() => openConfirm("set_coin_price")}
            type="button"
            variant="secondary"
          >
            Giá chương
          </Button>
          <Button
            className="!min-h-10 !text-xs !normal-case border-violet-400/30 bg-violet-500/10 text-violet-100"
            disabled={disabled || pending}
            onClick={() => openConfirm("enable_full_access")}
            type="button"
            variant="secondary"
          >
            Bật trọn bộ
          </Button>
          <Button
            className="!min-h-10 !text-xs !normal-case"
            disabled={disabled || pending}
            onClick={() => openConfirm("disable_full_access")}
            type="button"
            variant="ghost"
          >
            Tắt trọn bộ
          </Button>
        </div>
      </div>

      <MonetizationConfirmModal
        confirmLabel={pendingBulk ? confirmLabel(pendingBulk.action) : "Xác nhận"}
        description={pendingBulk ? confirmDescription(pendingBulk.action) : ""}
        destructive={pendingBulk ? danger.includes(pendingBulk.action) : false}
        onCancel={() => setPendingBulk(null)}
        onConfirm={() => {
          if (!pendingBulk) return;
          onApply({
            action: pendingBulk.action,
            coinPrice: pendingBulk.coinPrice,
            freeChaptersCount: pendingBulk.freeChapters,
            fullAccessPriceCoin: pendingBulk.fullAccessPriceCoin
          });
          setPendingBulk(null);
        }}
        open={Boolean(pendingBulk)}
        pending={pending}
        title="Xác nhận hàng loạt"
      />
    </>
  );
}
