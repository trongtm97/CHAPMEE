"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { buildAllowedCoinPriceOptions } from "@/lib/studio/validate-chapter-coin-price";
import { studioUpdateStoryMonetizationAction } from "@/lib/studio/studio-monetization-actions";
import type {
  StudioMonetizationConfigView,
  StudioStoryMonetizationRow
} from "@/types/studio-monetization";

type StoryMonetizationModalProps = {
  story: StudioStoryMonetizationRow;
  config: StudioMonetizationConfigView;
  canConfigure: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
};

export function StoryMonetizationModal({
  story,
  config,
  canConfigure,
  onClose,
  onSaved
}: StoryMonetizationModalProps) {
  const [isPending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(story.monetizationEnabled);
  const [freeChapters, setFreeChapters] = useState(
    String(Math.max(story.freeChaptersCount, config.paidChapterFreeChaptersRequired))
  );
  const priceOptions = buildAllowedCoinPriceOptions(config);
  const [coinPrice, setCoinPrice] = useState(
    String(story.defaultCoinPrice ?? config.paidChapterDefaultCoinPrice)
  );
  const [error, setError] = useState<string | null>(null);

  const freeCount = Number(freeChapters);
  const price = Number(coinPrice);
  const previewFree = Number.isFinite(freeCount)
    ? Math.max(config.paidChapterFreeChaptersRequired, freeCount)
    : config.paidChapterFreeChaptersRequired;
  const previewPrice = Number.isFinite(price) ? price : config.paidChapterDefaultCoinPrice;

  function saveSettings(input: {
    monetizationEnabled: boolean;
    freeChaptersCount: number;
    coinPrice: number | null;
    successMessage: string;
  }) {
    setError(null);

    if (input.monetizationEnabled && (input.coinPrice == null || input.coinPrice <= 0)) {
      setError(`Vui lòng chọn giá ${config.coinDisplayName} hợp lệ khi bật trả phí.`);
      return;
    }

    if (!Number.isFinite(input.freeChaptersCount) || input.freeChaptersCount < 0) {
      setError("Số chương miễn phí không được âm.");
      return;
    }

    startTransition(async () => {
      const result = await studioUpdateStoryMonetizationAction({
        storyId: story.storyId,
        monetizationEnabled: input.monetizationEnabled,
        freeChaptersCount: input.freeChaptersCount,
        coinPrice: config.paidChapterAllowCustomPrice ? input.coinPrice : null
      });

      if (!result.ok) {
        setError(result.error ?? "Không lưu được cấu hình.");
        return;
      }

      onSaved(input.successMessage);
    });
  }

  function handleSave() {
    saveSettings({
      monetizationEnabled: enabled,
      freeChaptersCount: freeCount,
      coinPrice: price,
      successMessage: `Đã cập nhật kiếm tiền cho "${story.title}".`
    });
  }

  function handleReset() {
    saveSettings({
      monetizationEnabled: false,
      freeChaptersCount: config.paidChapterFreeChaptersRequired,
      coinPrice: null,
      successMessage: `Đã reset cấu hình trả phí cho "${story.title}".`
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-xl">
        <h2 className="text-lg font-bold text-white">Cài đặt trả phí</h2>
        <p className="mt-1 truncate text-sm text-zinc-400">{story.title}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Trạng thái trả phí: {story.monetizationEnabled ? "Đang bật" : "Đang tắt"}
        </p>

        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm text-zinc-100">
            <input
              checked={enabled}
              disabled={!canConfigure || isPending}
              onChange={(event) => setEnabled(event.target.checked)}
              type="checkbox"
            />
            Bật trả phí cho truyện này
          </label>

          <label className="block text-sm text-zinc-300">
            Số chương miễn phí ban đầu (tối thiểu {config.paidChapterFreeChaptersRequired})
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"
              disabled={!canConfigure || isPending}
              min={0}
              onChange={(event) => setFreeChapters(event.target.value)}
              type="number"
              value={freeChapters}
            />
          </label>

          <label className="block text-sm text-zinc-300">
            Giá {config.coinDisplayName} mỗi chương trả phí
            {config.paidChapterAllowCustomPrice ? (
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"
                disabled={!canConfigure || isPending || !enabled}
                onChange={(event) => setCoinPrice(event.target.value)}
                value={coinPrice}
              >
                {priceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option} {config.coinDisplayName}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-sm text-zinc-400">
                Dùng mức mặc định admin: {config.paidChapterDefaultCoinPrice}{" "}
                {config.coinDisplayName}
              </p>
            )}
          </label>

          <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
            {enabled ? (
              <>
                <p>Chương trả phí · {previewPrice} {config.coinDisplayName}</p>
                <p className="mt-1">{previewFree} chương đầu miễn phí</p>
              </>
            ) : (
              <>Truyện đang tắt trả phí — mọi chương hiển thị miễn phí theo cấu hình hiện tại.</>
            )}
          </div>

          <p className="text-xs text-zinc-500">
            Thay đổi chỉ áp dụng cho giao dịch mới, không sửa giao dịch đã phát sinh.
          </p>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button disabled={isPending} onClick={onClose} type="button" variant="secondary">
            Hủy
          </Button>
          <Button
            disabled={!canConfigure || isPending}
            onClick={handleReset}
            type="button"
            variant="ghost"
          >
            Reset về mặc định
          </Button>
          <Button disabled={!canConfigure || isPending} onClick={handleSave} type="button">
            {isPending ? "Đang lưu…" : "Lưu cài đặt"}
          </Button>
        </div>
      </div>
    </div>
  );
}
