"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button, EmptyState, LoadingState } from "@/components/ui";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { studioPath } from "@/lib/studio/constants";
import { MonetizationConfirmModal } from "@/components/studio/monetization/MonetizationConfirmModal";
import { buildAutoPricingPreview } from "@/lib/studio/auto-pricing-preview";
import { formatMonetizationCoin, formatMonetizationVnd } from "@/lib/studio/format-monetization-display";
import {
  EVEN_COIN_ERROR,
  INVALID_COIN_ERROR,
  validateStudioCoinPrice
} from "@/lib/studio/validate-coin-price";
import {
  studioBulkChapterMonetizationAction,
  studioFetchMonetizationChaptersAction,
  studioFetchStoryMonetizationDetailAction,
  studioSaveStoryMonetizationSettingsAction,
  studioUpdateChapterMonetizationAction
} from "@/lib/studio/studio-monetization-actions";
import type { StudioMonetizationConfigView, StudioStoryMonetizationRow } from "@/types/studio-monetization";
import type {
  MonetizationChapterFilter,
  MonetizationChapterSort
} from "@/lib/studio/get-monetization-chapters-page";
import type { StudioStoryMonetizationDetail } from "@/types/story-monetization";

type TabId = "overview" | "full_access" | "auto" | "chapters" | "history";

type StoryMonetizationDrawerProps = {
  story: StudioStoryMonetizationRow;
  config: StudioMonetizationConfigView;
  canConfigure: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
};

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Tổng quan" },
  { id: "full_access", label: "Bán trọn bộ" },
  { id: "auto", label: "Tự động" },
  { id: "chapters", label: "Chương" },
  { id: "history", label: "Lịch sử" }
];

const CHAPTER_FILTERS: Array<{ value: MonetizationChapterFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "free", label: "Miễn phí" },
  { value: "paid", label: "Trả phí" },
  { value: "auto", label: "Rule tự động" },
  { value: "override", label: "Đã chỉnh riêng" },
  { value: "draft", label: "Chưa xuất bản" },
  { value: "published", label: "Đã đăng" }
];

function parseCoinInput(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true as const, price: null };
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false as const, error: INVALID_COIN_ERROR };
  }
  return validateStudioCoinPrice(Number(trimmed));
}

export function StoryMonetizationDrawer({
  story,
  config,
  canConfigure,
  onClose,
  onSaved
}: StoryMonetizationDrawerProps) {
  const isStandalone = story.structureType === "standalone";
  const visibleTabs = useMemo(
    () =>
      isStandalone
        ? TABS.filter((item) => item.id !== "auto" && item.id !== "chapters")
        : TABS,
    [isStandalone]
  );
  const [tab, setTab] = useState<TabId>("overview");
  const [isPending, startTransition] = useTransition();
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [detail, setDetail] = useState<StudioStoryMonetizationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fullAccessEnabled, setFullAccessEnabled] = useState(story.fullAccessEnabled);
  const [fullAccessPrice, setFullAccessPrice] = useState(
    story.fullAccessPriceCoin != null ? String(story.fullAccessPriceCoin) : ""
  );

  const [autoEnabled, setAutoEnabled] = useState(story.autoPricingEnabled);
  const [freeFirstCount, setFreeFirstCount] = useState(String(story.freeFirstChaptersCount));
  const [autoPaidFrom, setAutoPaidFrom] = useState(
    String(story.freeFirstChaptersCount + 1)
  );
  const [autoPrice, setAutoPrice] = useState(
    story.autoPriceCoin != null ? String(story.autoPriceCoin) : String(config.paidChapterDefaultCoinPrice)
  );
  const [overwriteOverrides, setOverwriteOverrides] = useState(false);

  const loadDetail = useCallback(() => {
    setLoadingDetail(true);
    startTransition(async () => {
      const result = await studioFetchStoryMonetizationDetailAction(story.storyId);
      if (result.error || !result.data) {
        setError(result.error ?? "Không tải được dữ liệu truyện.");
        setLoadingDetail(false);
        return;
      }
      setDetail(result.data);
      setFullAccessEnabled(result.data.full_access_enabled);
      setFullAccessPrice(
        result.data.full_access_price_coin != null
          ? String(result.data.full_access_price_coin)
          : ""
      );
      setAutoEnabled(result.data.auto_pricing_enabled);
      setFreeFirstCount(String(result.data.free_first_chapters_count));
      setAutoPaidFrom(
        String(result.data.auto_paid_from_chapter ?? result.data.free_first_chapters_count + 1)
      );
      setAutoPrice(
        result.data.auto_price_coin != null
          ? String(result.data.auto_price_coin)
          : String(config.paidChapterDefaultCoinPrice)
      );
      setLoadingDetail(false);
    });
  }, [config.paidChapterDefaultCoinPrice, story.storyId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (isStandalone && (tab === "auto" || tab === "chapters")) {
      setTab("overview");
    }
  }, [isStandalone, tab]);

  const autoPreview = useMemo(() => {
    if (!detail) return "";
    return buildAutoPricingPreview({
      ...detail,
      auto_pricing_enabled: autoEnabled,
      free_first_chapters_count: Number(freeFirstCount) || 0,
      auto_paid_from_chapter: Number(autoPaidFrom) || null,
      auto_price_coin: Number(autoPrice) || null
    });
  }, [autoEnabled, autoPaidFrom, autoPrice, detail, freeFirstCount]);

  function saveFullAccess() {
    setError(null);
    const priceCheck = parseCoinInput(fullAccessPrice);
    if (!priceCheck.ok) {
      setError(priceCheck.error);
      return;
    }
    if (fullAccessEnabled && priceCheck.price == null) {
      setError("Vui lòng nhập giá trọn bộ.");
      return;
    }

    startTransition(async () => {
      const result = await studioSaveStoryMonetizationSettingsAction({
        storyId: story.storyId,
        patch: {
          full_access_enabled: fullAccessEnabled,
          full_access_price_coin: fullAccessEnabled ? priceCheck.price : null,
          full_access_includes_future_chapters: true
        }
      });
      if (!result.ok) {
        setError(result.error ?? "Không lưu được.");
        return;
      }
      onSaved(`Đã lưu bán trọn bộ cho "${story.title}".`);
      loadDetail();
    });
  }

  function saveAutoRule(applyNow: boolean) {
    setError(null);
    const priceCheck = parseCoinInput(autoPrice);
    if (!priceCheck.ok) {
      setError(priceCheck.error);
      return;
    }
    if (autoEnabled && priceCheck.price == null) {
      setError("Vui lòng nhập giá chương.");
      return;
    }

    startTransition(async () => {
      const result = await studioSaveStoryMonetizationSettingsAction({
        storyId: story.storyId,
        patch: {
          auto_pricing_enabled: autoEnabled,
          free_first_chapters_count: Math.max(0, Number(freeFirstCount) || 0),
          auto_paid_from_chapter: Math.max(1, Number(autoPaidFrom) || 1),
          auto_price_coin: autoEnabled ? priceCheck.price : null
        },
        applyAutoPricing: applyNow && autoEnabled,
        overwriteOverrides
      });
      if (!result.ok) {
        setError(result.error ?? "Không lưu được rule tự động.");
        return;
      }
      onSaved(
        applyNow
          ? `Đã áp dụng rule tự động cho "${story.title}".`
          : `Đã lưu rule mặc định cho "${story.title}".`
      );
      loadDetail();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-stretch sm:justify-end">
      <div className="flex h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl border border-white/10 bg-zinc-950 shadow-xl sm:h-full sm:rounded-none sm:border-l">
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-white">Cài đặt kiếm tiền</h2>
            <p className="truncate text-sm text-zinc-400">
              {story.title}
              {isStandalone ? " · Truyện một phần" : ""}
            </p>
          </div>
          <Button onClick={onClose} type="button" variant="secondary">
            Đóng
          </Button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-2">
          {visibleTabs.map((item) => (
            <button
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
                tab === item.id
                  ? "bg-cyan-400/15 text-cyan-100"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
              key={item.id}
              onClick={() => setTab(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {loadingDetail && tab !== "chapters" ? (
            <LoadingState label="Đang tải cấu hình truyện…" />
          ) : null}

          {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}

          {tab === "overview" && detail && !loadingDetail ? (
            <div className="space-y-3 text-sm">
              <OverviewRow label="Trạng thái" value={story.status} />
              {isStandalone ? (
                <>
                  <OverviewRow label="Hình thức" value="Truyện một phần" />
                  <OverviewRow label="Doanh thu" value={formatMonetizationVnd(detail.revenueVnd)} />
                  <OverviewRow
                    label="Mua trọn bộ"
                    value={detail.fullAccessPurchaseCount.toLocaleString("vi-VN")}
                  />
                </>
              ) : (
                <>
                  <OverviewRow
                    label="Số chương"
                    value={`${detail.totalChapterCount} (${detail.paidChapterCount} trả phí)`}
                  />
                  <OverviewRow label="Doanh thu" value={formatMonetizationVnd(detail.revenueVnd)} />
                  <OverviewRow
                    label="Mua trọn bộ"
                    value={detail.fullAccessPurchaseCount.toLocaleString("vi-VN")}
                  />
                  <OverviewRow
                    label="Mở khóa chương"
                    value={detail.chapterUnlockCount.toLocaleString("vi-VN")}
                  />
                </>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Link
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/5"
                  href={getStoryDetailHref({
                    slug: story.slug,
                    public_code: story.publicCode
                  })}
                >
                  Xem truyện
                </Link>
                {isStandalone ? (
                  <Link
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/5"
                    href={studioPath(`/stories/${story.storyId}/content`)}
                  >
                    Soạn nội dung
                  </Link>
                ) : (
                  <Button onClick={() => setTab("chapters")} type="button" variant="secondary">
                    Quản lý chương
                  </Button>
                )}
              </div>
            </div>
          ) : null}

          {tab === "full_access" ? (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm text-zinc-100">
                <input
                  checked={fullAccessEnabled}
                  disabled={!canConfigure || isPending}
                  onChange={(event) => setFullAccessEnabled(event.target.checked)}
                  type="checkbox"
                />
                Bật bán trọn bộ
              </label>
              <label className="block text-sm text-zinc-300">
                Giá trọn bộ ({config.coinDisplayName})
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"
                  disabled={!canConfigure || isPending || !fullAccessEnabled}
                  inputMode="numeric"
                  onChange={(event) => setFullAccessPrice(event.target.value)}
                  placeholder="VD: 100"
                  value={fullAccessPrice}
                />
              </label>
              <p className="text-xs text-zinc-500">
                {EVEN_COIN_ERROR.replace("Giá coin", "Giá")} · Không giới hạn tối đa.
              </p>
              {!isStandalone ? (
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input checked disabled type="checkbox" />
                  Bao gồm cả chương tương lai
                </label>
              ) : null}
              <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
                {fullAccessEnabled && fullAccessPrice.trim() ? (
                  <>
                    Độc giả trả {fullAccessPrice} {config.coinDisplayName} một lần để đọc toàn bộ
                    {isStandalone ? " truyện một phần này." : " truyện hiện tại và chương mới sau này."}
                  </>
                ) : (
                  <>Bán trọn bộ đang tắt.</>
                )}
              </div>
              <Button disabled={!canConfigure || isPending} onClick={saveFullAccess} type="button">
                {isPending ? "Đang lưu…" : "Lưu bán trọn bộ"}
              </Button>
            </div>
          ) : null}

          {tab === "auto" ? (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm text-zinc-100">
                <input
                  checked={autoEnabled}
                  disabled={!canConfigure || isPending}
                  onChange={(event) => setAutoEnabled(event.target.checked)}
                  type="checkbox"
                />
                Bật tự động thu phí theo chương
              </label>
              <label className="block text-sm text-zinc-300">
                Miễn phí bao nhiêu chương đầu
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"
                  disabled={!canConfigure || isPending}
                  min={0}
                  onChange={(event) => setFreeFirstCount(event.target.value)}
                  type="number"
                  value={freeFirstCount}
                />
              </label>
              <label className="block text-sm text-zinc-300">
                Từ chương số
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"
                  disabled={!canConfigure || isPending}
                  min={1}
                  onChange={(event) => setAutoPaidFrom(event.target.value)}
                  type="number"
                  value={autoPaidFrom}
                />
              </label>
              <label className="block text-sm text-zinc-300">
                Giá mỗi chương ({config.coinDisplayName})
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"
                  disabled={!canConfigure || isPending}
                  inputMode="numeric"
                  onChange={(event) => setAutoPrice(event.target.value)}
                  value={autoPrice}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  checked={overwriteOverrides}
                  disabled={!canConfigure || isPending}
                  onChange={(event) => setOverwriteOverrides(event.target.checked)}
                  type="checkbox"
                />
                Ghi đè chương đã chỉnh riêng
              </label>
              <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
                {autoPreview}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!canConfigure || isPending}
                  onClick={() => saveAutoRule(true)}
                  type="button"
                >
                  Áp dụng rule
                </Button>
                <Button
                  disabled={!canConfigure || isPending}
                  onClick={() => saveAutoRule(false)}
                  type="button"
                  variant="secondary"
                >
                  Lưu làm mặc định
                </Button>
              </div>
            </div>
          ) : null}

          {tab === "chapters" ? (
            <ChaptersTab
              canConfigure={canConfigure}
              coinDisplayName={config.coinDisplayName}
              isPending={isPending}
              onSaved={onSaved}
              storyId={story.storyId}
              storyTitle={story.title}
            />
          ) : null}

          {tab === "history" ? (
            <EmptyState
              description="Hệ thống audit log sẽ hiển thị tại đây khi có dữ liệu."
              title="Chưa có lịch sử thay đổi"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-2">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-100">{value}</span>
    </div>
  );
}

function ChaptersTab({
  storyId,
  storyTitle,
  coinDisplayName,
  canConfigure,
  isPending,
  onSaved
}: {
  storyId: string;
  storyTitle: string;
  coinDisplayName: string;
  canConfigure: boolean;
  isPending: boolean;
  onSaved: (message: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [rows, setRows] = useState<
    import("@/types/story-monetization").StudioChapterMonetizationRow[]
  >([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MonetizationChapterFilter>("all");
  const [sort, setSort] = useState<MonetizationChapterSort>("episode_asc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkPrice, setBulkPrice] = useState("10");
  const [pendingBulk, setPendingBulk] = useState<
    "set_free" | "set_price" | "apply_auto" | "clear_override" | null
  >(null);
  const [, startTransition] = useTransition();

  const loadChapters = useCallback(() => {
    setLoading(true);
    startTransition(async () => {
      const result = await studioFetchMonetizationChaptersAction({
        storyId,
        page,
        pageSize,
        search,
        filter,
        sort
      });
      setRows(result.rows);
      setTotalCount(result.totalCount);
      setChapterError(result.error);
      setLoading(false);
    });
  }, [filter, page, pageSize, search, sort, storyId]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  const allPageSelected =
    rows.length > 0 && rows.every((row) => selectedIds.includes(row.chapterId));

  function runBulk(action: "set_free" | "set_price" | "apply_auto" | "clear_override") {
    if (selectedIds.length === 0) {
      setChapterError("Chưa chọn chương nào.");
      return;
    }
    if (action === "set_price") {
      const check = parseCoinInput(bulkPrice);
      if (!check.ok) {
        setChapterError(check.error);
        return;
      }
    }

    startTransition(async () => {
      const result = await studioBulkChapterMonetizationAction({
        storyId,
        chapterIds: selectedIds,
        action,
        priceCoin: action === "set_price" ? Number(bulkPrice) : undefined
      });
      if (!result.ok && result.successCount === 0) {
        setChapterError(result.error ?? "Không áp dụng được.");
        return;
      }
      setPendingBulk(null);
      setSelectedIds([]);
      onSaved(`Đã cập nhật ${result.successCount} chương của "${storyTitle}".`);
      loadChapters();
    });
  }

  function saveInline(chapterId: string, isPaid: boolean, rawPrice: string) {
    const check = parseCoinInput(rawPrice);
    if (!check.ok) {
      setChapterError(check.error);
      return;
    }
    startTransition(async () => {
      const result = await studioUpdateChapterMonetizationAction({
        storyId,
        chapterId,
        isPaid,
        priceCoin: isPaid ? check.price : null
      });
      if (!result.ok) {
        setChapterError(result.error ?? "Không lưu được chương.");
        return;
      }
      loadChapters();
    });
  }

  return (
    <div className="space-y-3">
      <input
        className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        placeholder="Tìm chương…"
        type="search"
        value={search}
      />
      <div className="flex flex-wrap gap-2">
        {CHAPTER_FILTERS.map((option) => (
          <button
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
              filter === option.value
                ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                : "border-white/10 text-zinc-400"
            }`}
            key={option.value}
            onClick={() => {
              setFilter(option.value);
              setPage(1);
            }}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <select
        className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
        onChange={(event) => setSort(event.target.value as MonetizationChapterSort)}
        value={sort}
      >
        <option value="episode_asc">Số chương tăng dần</option>
        <option value="episode_desc">Số chương giảm dần</option>
        <option value="updated">Mới cập nhật</option>
        <option value="price_high">Giá cao nhất</option>
        <option value="price_low">Giá thấp nhất</option>
      </select>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-2">
          <span className="text-xs font-semibold text-cyan-100">
            Đã chọn {selectedIds.length} chương
          </span>
          <Button
            disabled={!canConfigure || isPending}
            onClick={() => setPendingBulk("set_free")}
            type="button"
            variant="secondary"
          >
            Miễn phí
          </Button>
          <input
            className="w-20 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-sm text-white"
            disabled={!canConfigure}
            onChange={(event) => setBulkPrice(event.target.value)}
            value={bulkPrice}
          />
          <Button
            disabled={!canConfigure || isPending}
            onClick={() => setPendingBulk("set_price")}
            type="button"
            variant="secondary"
          >
            Đặt giá
          </Button>
          <Button
            disabled={!canConfigure || isPending}
            onClick={() => setPendingBulk("apply_auto")}
            type="button"
            variant="secondary"
          >
            Áp dụng rule
          </Button>
          <Button
            disabled={!canConfigure || isPending}
            onClick={() => setPendingBulk("clear_override")}
            type="button"
            variant="ghost"
          >
            Bỏ override
          </Button>
        </div>
      ) : null}

      {loading ? <LoadingState label="Đang tải chương…" /> : null}
      {chapterError ? <p className="text-sm text-rose-300">{chapterError}</p> : null}

      {!loading && rows.length === 0 ? (
        <EmptyState description="Thử đổi bộ lọc." title="Không có chương phù hợp" />
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead className="bg-white/[0.03] text-zinc-500">
              <tr>
                <th className="px-2 py-2">
                  <input
                    checked={allPageSelected}
                    disabled={!canConfigure}
                    onChange={() => {
                      if (allPageSelected) {
                        const pageIds = new Set(rows.map((row) => row.chapterId));
                        setSelectedIds((current) => current.filter((id) => !pageIds.has(id)));
                      } else {
                        setSelectedIds((current) => [
                          ...new Set([...current, ...rows.map((row) => row.chapterId)])
                        ]);
                      }
                    }}
                    type="checkbox"
                  />
                </th>
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Tiêu đề</th>
                <th className="px-2 py-2">Trả phí</th>
                <th className="px-2 py-2">Giá</th>
                <th className="px-2 py-2">Nguồn</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ChapterRow
                  canConfigure={canConfigure}
                  coinDisplayName={coinDisplayName}
                  isPending={isPending}
                  key={row.chapterId}
                  onSave={saveInline}
                  onToggleSelect={() =>
                    setSelectedIds((current) =>
                      current.includes(row.chapterId)
                        ? current.filter((id) => id !== row.chapterId)
                        : [...current, row.chapterId]
                    )
                  }
                  row={row}
                  selected={selectedIds.includes(row.chapterId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>{totalCount.toLocaleString("vi-VN")} chương</span>
        <div className="flex gap-2">
          <Button
            disabled={page <= 1 || loading}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            type="button"
            variant="secondary"
          >
            Trước
          </Button>
          <span className="self-center">Trang {page}</span>
          <Button
            disabled={page * pageSize >= totalCount || loading}
            onClick={() => setPage((value) => value + 1)}
            type="button"
            variant="secondary"
          >
            Sau
          </Button>
        </div>
      </div>

      <MonetizationConfirmModal
        confirmLabel="Xác nhận"
        description={`Áp dụng cho ${selectedIds.length} chương đã chọn.`}
        onCancel={() => setPendingBulk(null)}
        onConfirm={() => pendingBulk && runBulk(pendingBulk)}
        open={Boolean(pendingBulk)}
        pending={isPending}
        title="Xác nhận hàng loạt chương"
      />
    </div>
  );
}

function ChapterRow({
  row,
  selected,
  canConfigure,
  isPending,
  coinDisplayName,
  onToggleSelect,
  onSave
}: {
  row: import("@/types/story-monetization").StudioChapterMonetizationRow;
  selected: boolean;
  canConfigure: boolean;
  isPending: boolean;
  coinDisplayName: string;
  onToggleSelect: () => void;
  onSave: (chapterId: string, isPaid: boolean, rawPrice: string) => void;
}) {
  const [isPaid, setIsPaid] = useState(row.isPaid);
  const [price, setPrice] = useState(row.priceCoin != null ? String(row.priceCoin) : "");

  useEffect(() => {
    setIsPaid(row.isPaid);
    setPrice(row.priceCoin != null ? String(row.priceCoin) : "");
  }, [row.isPaid, row.priceCoin]);

  return (
    <tr className="border-t border-white/10">
      <td className="px-2 py-2">
        <input checked={selected} disabled={!canConfigure} onChange={onToggleSelect} type="checkbox" />
      </td>
      <td className="px-2 py-2 text-zinc-300">{row.episodeNumber}</td>
      <td className="max-w-[10rem] truncate px-2 py-2 text-zinc-200">{row.title}</td>
      <td className="px-2 py-2">
        <input
          checked={isPaid}
          disabled={!canConfigure || isPending}
          onChange={(event) => setIsPaid(event.target.checked)}
          type="checkbox"
        />
      </td>
      <td className="px-2 py-2">
        <input
          className="w-20 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
          disabled={!canConfigure || isPending || !isPaid}
          onChange={(event) => setPrice(event.target.value)}
          value={price}
        />
      </td>
      <td className="px-2 py-2 text-zinc-500">
        {row.monetizationOverride ? "Riêng" : row.pricingSource.replace(/_/g, " ")}
        <button
          className="ml-2 text-cyan-300 hover:text-cyan-200"
          disabled={!canConfigure || isPending}
          onClick={() => onSave(row.chapterId, isPaid, price)}
          type="button"
        >
          Lưu
        </button>
        {isPaid && row.priceCoin != null ? (
          <span className="ml-1 text-zinc-600">
            ({formatMonetizationCoin(row.priceCoin, coinDisplayName)})
          </span>
        ) : null}
      </td>
    </tr>
  );
}
