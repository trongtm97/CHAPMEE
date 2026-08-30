"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  MonetizationBadge,
  getBundleStatusBadge
} from "@/components/studio/monetization/monetization-ui";
import { Button, LoadingState } from "@/components/ui";
import {
  EVEN_COIN_ERROR,
  INVALID_COIN_ERROR,
  validateStudioCoinPrice
} from "@/lib/studio/validate-coin-price";
import {
  studioFetchStoryMonetizationDetailAction,
  studioSaveStoryMonetizationSettingsAction,
  studioUpdateStoryMonetizationAction
} from "@/lib/studio/studio-monetization-actions";
import type { StudioMonetizationConfigView, StudioStoryMonetizationRow } from "@/types/studio-monetization";

type StoryMonetizationSettingsSheetProps = {
  story: StudioStoryMonetizationRow;
  config: StudioMonetizationConfigView;
  canConfigure: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
};

function parseCoin(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true as const, price: null };
  if (!/^\d+$/.test(trimmed)) return { ok: false as const, error: INVALID_COIN_ERROR };
  return validateStudioCoinPrice(Number(trimmed));
}

export function StoryMonetizationSettingsSheet({
  story,
  config,
  canConfigure,
  onClose,
  onSaved
}: StoryMonetizationSettingsSheetProps) {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paidEnabled, setPaidEnabled] = useState(story.paidChapterCount > 0);
  const [freeChapters, setFreeChapters] = useState(String(story.freeChaptersCount));
  const [chapterPrice, setChapterPrice] = useState(
    String(story.defaultCoinPrice ?? config.paidChapterDefaultCoinPrice)
  );
  const [bundleEnabled, setBundleEnabled] = useState(story.fullAccessEnabled);
  const [bundlePrice, setBundlePrice] = useState(
    story.fullAccessPriceCoin != null ? String(story.fullAccessPriceCoin) : ""
  );
  const [sheetTab, setSheetTab] = useState<"pricing" | "bundle">("pricing");
  const paidLockedByOrigin = !story.canSellChapters;
  const bundleLockedByOrigin = !story.canSellStoryBundle;

  useEffect(() => {
    startTransition(async () => {
      const result = await studioFetchStoryMonetizationDetailAction(story.storyId);
      if (result.data) {
        setPaidEnabled(result.data.paidChapterCount > 0 || result.data.auto_pricing_enabled);
        setFreeChapters(String(result.data.free_first_chapters_count));
        setChapterPrice(
          String(result.data.auto_price_coin ?? story.defaultCoinPrice ?? config.paidChapterDefaultCoinPrice)
        );
        setBundleEnabled(result.data.full_access_enabled);
        setBundlePrice(
          result.data.full_access_price_coin != null
            ? String(result.data.full_access_price_coin)
            : ""
        );
      }
      setLoading(false);
    });
  }, [config.paidChapterDefaultCoinPrice, story.defaultCoinPrice, story.storyId]);

  function handleSave() {
    setError(null);
    const freeCount = Math.max(0, Number(freeChapters) || 0);
    if (!Number.isFinite(freeCount) || freeCount < 0) {
      setError("Số chương miễn phí phải >= 0.");
      return;
    }

    const priceCheck = parseCoin(chapterPrice);
    if (!priceCheck.ok) {
      setError(priceCheck.error);
      return;
    }
    if (paidEnabled && (priceCheck.price == null || priceCheck.price <= 0)) {
      setError("Khi bật trả phí, giá chương phải là số coin chẵn lớn hơn 0.");
      return;
    }

    const bundleCheck = parseCoin(bundlePrice);
    if (!bundleCheck.ok) {
      setError(bundleCheck.error);
      return;
    }
    if (bundleEnabled && (bundleCheck.price == null || bundleCheck.price <= 0)) {
      setError("Khi bật bán trọn bộ, giá trọn bộ phải là số coin chẵn lớn hơn 0.");
      return;
    }

    startTransition(async () => {
      const chapterResult = await studioUpdateStoryMonetizationAction({
        storyId: story.storyId,
        monetizationEnabled: paidEnabled,
        freeChaptersCount: freeCount,
        coinPrice: paidEnabled ? priceCheck.price : null
      });

      if (!chapterResult.ok) {
        setError(chapterResult.error ?? "Không lưu được cấu hình chương.");
        return;
      }

      const bundleResult = await studioSaveStoryMonetizationSettingsAction({
        storyId: story.storyId,
        patch: {
          auto_pricing_enabled: paidEnabled,
          free_first_chapters_count: freeCount,
          auto_paid_from_chapter: freeCount + 1,
          auto_price_coin: paidEnabled ? priceCheck.price : null,
          full_access_enabled: bundleEnabled,
          full_access_price_coin: bundleEnabled ? bundleCheck.price : null,
          full_access_includes_future_chapters: true
        },
        applyAutoPricing: paidEnabled,
        overwriteOverrides: false
      });

      if (!bundleResult.ok) {
        setError(bundleResult.error ?? "Không lưu được bán trọn bộ.");
        return;
      }

      onSaved(`Đã lưu cài đặt cho "${story.title}".`);
    });
  }

  const bundleBadge = getBundleStatusBadge(story);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/60 sm:items-stretch">
      <div className="flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-white/10 bg-zinc-950 shadow-xl sm:max-h-none sm:max-w-lg sm:rounded-none sm:border-l sm:border-t-0">
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-white">Cài đặt trả phí</h2>
            <p className="truncate text-sm text-zinc-400">{story.title}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <MonetizationBadge tone="slate">
                {story.isCompleted ? "Hoàn thành" : "Đang ra"}
              </MonetizationBadge>
              <MonetizationBadge tone={bundleBadge.tone}>{bundleBadge.label}</MonetizationBadge>
              <MonetizationBadge tone={story.contentOrigin === "translation" ? "amber" : "cyan"}>
                {story.contentOrigin === "translation" ? "Truyện Dịch" : "Truyện Sáng Tác"}
              </MonetizationBadge>
            </div>
            {story.contentOrigin === "translation" ? (
              <p className="mt-2 text-xs text-zinc-400">
                {story.canReceiveTips ? "Tips: Đã xác minh quyền" : "Tips: Cần xác minh quyền"} ·{" "}
                {story.canShareAdsRevenue
                  ? "Ads revenue: Đã xác minh quyền"
                  : "Ads revenue: Cần xác minh quyền"}
              </p>
            ) : null}
          </div>
          <Button onClick={onClose} type="button" variant="secondary">
            Đóng
          </Button>
        </header>

        <div className="border-b border-white/10 px-4">
          <nav className="flex gap-1">
            {[
              { id: "pricing" as const, label: "Giá truyện/chương" },
              { id: "bundle" as const, label: "Bán trọn bộ" }
            ].map((tab) => (
              <button
                className={`rounded-t-lg px-3 py-2 text-xs font-semibold sm:text-sm ${
                  sheetTab === tab.id
                    ? "bg-cyan-500/10 text-cyan-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                key={tab.id}
                onClick={() => setSheetTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? <LoadingState label="Đang tải…" /> : null}

          {!loading && sheetTab === "pricing" ? (
            <div className="space-y-5">
              <label className="flex items-center gap-2 text-sm text-zinc-100">
                <input
                  checked={paidEnabled}
                  disabled={!canConfigure || isPending || paidLockedByOrigin}
                  onChange={(event) => setPaidEnabled(event.target.checked)}
                  type="checkbox"
                />
                Bật trả phí cho truyện này
              </label>
              {paidLockedByOrigin ? (
                <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100">
                  {story.originPolicyNote}
                </p>
              ) : null}

              <label className="block text-sm text-zinc-300">
                Số chương đầu miễn phí
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"
                  disabled={!canConfigure || isPending || paidLockedByOrigin}
                  min={0}
                  onChange={(event) => setFreeChapters(event.target.value)}
                  type="number"
                  value={freeChapters}
                />
              </label>

              <label className="block text-sm text-zinc-300">
                Giá mỗi chương sau phần miễn phí ({config.coinDisplayName})
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"
                  disabled={!canConfigure || isPending || !paidEnabled || paidLockedByOrigin}
                  inputMode="numeric"
                  onChange={(event) => setChapterPrice(event.target.value)}
                  value={chapterPrice}
                />
              </label>

              <p className="text-xs text-zinc-500">{EVEN_COIN_ERROR} · Không giới hạn tối đa.</p>
            </div>
          ) : null}

          {!loading && sheetTab === "bundle" ? (
            <div className="space-y-5">
              <label className="flex items-center gap-2 text-sm text-zinc-100">
                <input
                  checked={bundleEnabled}
                  disabled={!canConfigure || isPending || bundleLockedByOrigin}
                  onChange={(event) => setBundleEnabled(event.target.checked)}
                  type="checkbox"
                />
                Bán trọn bộ
              </label>
              {bundleLockedByOrigin ? (
                <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100">
                  {story.originPolicyNote}
                </p>
              ) : null}

              <label className="block text-sm text-zinc-300">
                Giá trọn bộ ({config.coinDisplayName})
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"
                  disabled={!canConfigure || isPending || !bundleEnabled || bundleLockedByOrigin}
                  inputMode="numeric"
                  onChange={(event) => setBundlePrice(event.target.value)}
                  value={bundlePrice}
                />
              </label>

              <p className="rounded-xl border border-violet-400/20 bg-violet-400/5 px-3 py-2 text-xs leading-relaxed text-violet-100">
                Người mua trọn bộ sẽ đọc được toàn bộ chương hiện tại và các chương tương lai
                của truyện này.
              </p>

              <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs leading-relaxed text-amber-100">
                Doanh thu trọn bộ sẽ được giữ cho đến khi truyện hoàn thành và được admin xác
                nhận.
              </p>

              <p className="text-xs text-zinc-500">{EVEN_COIN_ERROR} · Không giới hạn tối đa.</p>
            </div>
          ) : null}

          {!loading ? (
            <div className="mt-4">
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </div>
          ) : null}
        </div>

        <footer className="flex gap-2 border-t border-white/10 px-4 py-3">
          <Button
            className="flex-1"
            disabled={!canConfigure || isPending || loading}
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            Huỷ
          </Button>
          <Button
            className="flex-1"
            disabled={
              !canConfigure ||
              isPending ||
              loading ||
              (sheetTab === "pricing" && paidLockedByOrigin) ||
              (sheetTab === "bundle" && bundleLockedByOrigin)
            }
            onClick={handleSave}
            type="button"
          >
            {isPending ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
