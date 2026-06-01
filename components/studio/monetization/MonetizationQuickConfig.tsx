"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { MonetizationConfirmModal } from "@/components/studio/monetization/MonetizationConfirmModal";
import { buildAllowedCoinPriceOptions } from "@/lib/studio/validate-chapter-coin-price";
import type { StudioMonetizationConfigView } from "@/types/studio-monetization";
import type { StudioMonetizationBulkScope } from "@/types/studio-monetization-stories";

type MonetizationQuickConfigProps = {
  config: StudioMonetizationConfigView;
  canConfigure: boolean;
  disabled: boolean;
  pending: boolean;
  selectedCount: number;
  onApply: (input: {
    scope: StudioMonetizationBulkScope;
    monetizationEnabled?: boolean;
    coinPrice?: number;
    freeChaptersCount?: number;
    reset?: boolean;
  }) => void;
};

type PendingQuick = {
  scope: StudioMonetizationBulkScope;
  title: string;
  description: string;
  monetizationEnabled?: boolean;
  coinPrice?: number;
  freeChaptersCount?: number;
  reset?: boolean;
} | null;

export function MonetizationQuickConfig({
  config,
  canConfigure,
  disabled,
  pending,
  selectedCount,
  onApply
}: MonetizationQuickConfigProps) {
  const [pendingQuick, setPendingQuick] = useState<PendingQuick>(null);
  const [coinPrice, setCoinPrice] = useState(String(config.paidChapterDefaultCoinPrice));
  const [freeChapters, setFreeChapters] = useState(
    String(config.paidChapterFreeChaptersRequired)
  );
  const priceOptions = buildAllowedCoinPriceOptions(config);

  if (!config.paidChaptersEnabled) {
    return null;
  }

  function scopeSummary(scope: StudioMonetizationBulkScope) {
    if (scope === "all") return "tất cả truyện";
    if (scope === "published") return "truyện đang đăng";
    if (scope === "completed") return "truyện đã hoàn thành";
    return `${selectedCount.toLocaleString("vi-VN")} truyện đã chọn`;
  }

  function openQuick(partial: Omit<NonNullable<PendingQuick>, "description"> & { description?: string }) {
    if (partial.scope === "selected" && selectedCount === 0) {
      return;
    }
    setPendingQuick({
      ...partial,
      description:
        partial.description ??
        `Áp dụng cho ${scopeSummary(partial.scope)}. Thay đổi chỉ ảnh hưởng giao dịch mới.`
    });
  }

  const scopes: Array<{ scope: StudioMonetizationBulkScope; label: string }> = [
    { scope: "all", label: "Tất cả truyện" },
    { scope: "published", label: "Truyện đang đăng" },
    { scope: "completed", label: "Truyện đã hoàn thành" },
    { scope: "selected", label: "Truyện đã chọn" }
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
      <div>
        <h2 className="text-base font-bold text-white">Cấu hình nhanh</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Áp dụng hàng loạt cho nhóm truyện. Mọi thay đổi cần xác nhận trước khi lưu.
        </p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Giá & chương miễn phí mặc định
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="block text-xs text-zinc-400">
              Đặt giá coin
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
                disabled={!canConfigure || disabled || pending}
                onChange={(event) => setCoinPrice(event.target.value)}
                value={coinPrice}
              >
                {priceOptions.map((price) => (
                  <option key={price} value={price}>
                    {price} {config.coinDisplayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-zinc-400">
              Số chương miễn phí
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
                disabled={!canConfigure || disabled || pending}
                min={0}
                onChange={(event) => setFreeChapters(event.target.value)}
                type="number"
                value={freeChapters}
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Thao tác nhanh
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {scopes.map(({ scope, label }) => (
              <Button
                disabled={
                  !canConfigure ||
                  disabled ||
                  pending ||
                  (scope === "selected" && selectedCount === 0)
                }
                key={`${scope}-enable`}
                onClick={() =>
                  openQuick({
                    scope,
                    title: "Bật trả phí hàng loạt",
                    monetizationEnabled: true
                  })
                }
                type="button"
                variant="secondary"
              >
                Bật trả phí · {label}
              </Button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {scopes.map(({ scope, label }) => (
              <Button
                disabled={
                  !canConfigure ||
                  disabled ||
                  pending ||
                  (scope === "selected" && selectedCount === 0)
                }
                key={`${scope}-price`}
                onClick={() =>
                  openQuick({
                    scope,
                    title: "Đặt giá coin hàng loạt",
                    coinPrice: Number(coinPrice),
                    monetizationEnabled: true
                  })
                }
                type="button"
                variant="ghost"
              >
                Đặt giá · {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <MonetizationConfirmModal
        confirmLabel="Áp dụng hàng loạt"
        description={pendingQuick?.description ?? ""}
        onCancel={() => setPendingQuick(null)}
        onConfirm={() => {
          if (!pendingQuick) return;
          onApply({
            scope: pendingQuick.scope,
            monetizationEnabled: pendingQuick.monetizationEnabled,
            coinPrice: pendingQuick.coinPrice ?? Number(coinPrice),
            freeChaptersCount: pendingQuick.freeChaptersCount ?? Number(freeChapters),
            reset: pendingQuick.reset
          });
          setPendingQuick(null);
        }}
        open={Boolean(pendingQuick)}
        pending={pending}
        title={pendingQuick?.title ?? "Xác nhận cấu hình nhanh"}
      />
    </section>
  );
}
