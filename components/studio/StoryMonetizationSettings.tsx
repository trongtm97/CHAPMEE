"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { buildAllowedCoinPriceOptions } from "@/lib/studio/validate-chapter-coin-price";
import { studioUpdateStoryMonetizationAction } from "@/lib/studio/studio-monetization-actions";
import type {
  StudioMonetizationConfigView,
  StudioStoryMonetizationRow
} from "@/types/studio-monetization";

type StoryMonetizationSettingsProps = {
  stories: StudioStoryMonetizationRow[];
  config: StudioMonetizationConfigView;
  canConfigure: boolean;
};

export function StoryMonetizationSettings({
  stories,
  config,
  canConfigure
}: StoryMonetizationSettingsProps) {
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!config.paidChaptersEnabled) {
    return (
      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 text-sm text-zinc-400">
        Admin chưa bật chương trả phí.
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
      <div>
        <h2 className="text-base font-bold text-white">Thiết lập theo truyện</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Bật trả phí và số chương miễn phí trong phạm vi admin cho phép (
          {config.paidChapterMinCoinPrice}–{config.paidChapterMaxCoinPrice}{" "}
          {config.coinDisplayName}).
        </p>
      </div>

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {stories.length === 0 ? (
        <p className="text-sm text-zinc-500">Chưa có truyện để cấu hình.</p>
      ) : (
        <ul className="space-y-2">
          {stories.map((story) => (
            <li key={story.storyId}>
              <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-100">{story.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {story.monetizationEnabled
                      ? `${story.paidChapterCount} chương trả phí`
                      : "Chưa bật trả phí"}
                    {" · "}
                    {story.revenueVnd > 0
                      ? `${story.revenueVnd.toLocaleString("vi-VN")} ₫`
                      : "Chưa có doanh thu"}
                  </p>
                </div>
                <Button
                  disabled={!canConfigure}
                  onClick={() => {
                    setEditingStoryId(story.storyId);
                    setMessage(null);
                    setError(null);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cài đặt
                </Button>
              </div>

              {editingStoryId === story.storyId ? (
                <StoryMonetizationEditor
                  canConfigure={canConfigure}
                  config={config}
                  onClose={() => setEditingStoryId(null)}
                  onError={setError}
                  onSuccess={(text) => {
                    setMessage(text);
                    setEditingStoryId(null);
                  }}
                  story={story}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StoryMonetizationEditor({
  story,
  config,
  canConfigure,
  onClose,
  onSuccess,
  onError
}: {
  story: StudioStoryMonetizationRow;
  config: StudioMonetizationConfigView;
  canConfigure: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(story.monetizationEnabled);
  const [freeChapters, setFreeChapters] = useState(
    String(Math.max(story.freeChaptersCount, config.paidChapterFreeChaptersRequired))
  );
  const priceOptions = buildAllowedCoinPriceOptions(config);
  const [coinPrice, setCoinPrice] = useState(
    String(story.defaultCoinPrice ?? config.paidChapterDefaultCoinPrice)
  );

  function handleSave() {
    onError("");
    startTransition(async () => {
      const result = await studioUpdateStoryMonetizationAction({
        storyId: story.storyId,
        monetizationEnabled: enabled,
        freeChaptersCount: Number(freeChapters),
        coinPrice: config.paidChapterAllowCustomPrice ? Number(coinPrice) : null
      });

      if (!result.ok) {
        onError(result.error ?? "Không lưu được cấu hình.");
        return;
      }

      onSuccess(`Đã cập nhật kiếm tiền cho "${story.title}".`);
      window.location.reload();
    });
  }

  return (
    <div className="mt-2 space-y-3 rounded-xl border border-sky-400/30 bg-sky-400/5 p-4">
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
        Chương miễn phí đầu (tối thiểu {config.paidChapterFreeChaptersRequired})
        <input
          className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          disabled={!canConfigure || isPending}
          min={config.paidChapterFreeChaptersRequired}
          onChange={(event) => setFreeChapters(event.target.value)}
          type="number"
          value={freeChapters}
        />
      </label>

      <label className="block text-sm text-zinc-300">
        Giá mở khóa / chương ({config.coinDisplayName})
        {config.paidChapterAllowCustomPrice ? (
          <select
            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            disabled={!canConfigure || isPending || !enabled}
            onChange={(event) => setCoinPrice(event.target.value)}
            value={coinPrice}
          >
            {priceOptions.map((price) => (
              <option key={price} value={price}>
                {price} {config.coinDisplayName}
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

      <div className="flex flex-wrap gap-2">
        <Button disabled={!canConfigure || isPending} onClick={handleSave} type="button">
          {isPending ? "Đang lưu..." : "Lưu"}
        </Button>
        <Button onClick={onClose} type="button" variant="secondary">
          Đóng
        </Button>
      </div>
    </div>
  );
}
