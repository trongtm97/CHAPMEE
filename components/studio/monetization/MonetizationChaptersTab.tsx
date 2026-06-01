"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Button, EmptyState, LoadingState } from "@/components/ui";
import { MonetizationConfirmModal } from "@/components/studio/monetization/MonetizationConfirmModal";
import {
  INVALID_COIN_ERROR,
  validateStudioCoinPrice
} from "@/lib/studio/validate-coin-price";
import {
  studioBulkChapterMonetizationAction,
  studioFetchMonetizationChaptersAction,
  studioFetchMonetizationStoriesAction,
  studioUpdateChapterMonetizationAction
} from "@/lib/studio/studio-monetization-actions";
import type { StudioMonetizationConfigView } from "@/types/studio-monetization";
import type {
  MonetizationChapterFilter,
  MonetizationChapterSort
} from "@/lib/studio/get-monetization-chapters-page";
import type { StudioStoryMonetizationRow } from "@/types/studio-monetization";

type MonetizationChaptersTabProps = {
  config: StudioMonetizationConfigView;
  canConfigure: boolean;
};

const FILTERS: Array<{ value: MonetizationChapterFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "free", label: "Miễn phí" },
  { value: "paid", label: "Đang thu phí" },
  { value: "draft", label: "Chưa đăng" },
  { value: "published", label: "Đã đăng" }
];

function parseCoin(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true as const, price: null };
  if (!/^\d+$/.test(trimmed)) return { ok: false as const, error: INVALID_COIN_ERROR };
  return validateStudioCoinPrice(Number(trimmed), { allowFree: false, required: true });
}

export function MonetizationChaptersTab({ config, canConfigure }: MonetizationChaptersTabProps) {
  const [isPending, startTransition] = useTransition();
  const [storySearch, setStorySearch] = useState("");
  const [storyOptions, setStoryOptions] = useState<StudioStoryMonetizationRow[]>([]);
  const [selectedStory, setSelectedStory] = useState<StudioStoryMonetizationRow | null>(null);
  const [loadingStories, setLoadingStories] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<
    import("@/types/story-monetization").StudioChapterMonetizationRow[]
  >([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<MonetizationChapterFilter>("all");
  const [sort, setSort] = useState<MonetizationChapterSort>("episode_asc");
  const [chapterSearch, setChapterSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkPrice, setBulkPrice] = useState(String(config.paidChapterDefaultCoinPrice));
  const [applyFrom, setApplyFrom] = useState("1");
  const [pendingBulk, setPendingBulk] = useState<
    "free" | "price" | "from" | "restore" | null
  >(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoadingStories(true);
      startTransition(async () => {
        const result = await studioFetchMonetizationStoriesAction({
          page: 1,
          pageSize: 25,
          search: storySearch.trim(),
          filter: "all",
          sort: "title"
        });
        setStoryOptions(result.rows);
        setLoadingStories(false);
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [storySearch]);

  const loadChapters = useCallback(() => {
    if (!selectedStory) return;
    setLoading(true);
    startTransition(async () => {
      const result = await studioFetchMonetizationChaptersAction({
        storyId: selectedStory.storyId,
        page,
        pageSize: 50,
        search: chapterSearch,
        filter,
        sort
      });
      setRows(result.rows);
      setTotalCount(result.totalCount);
      setError(result.error);
      setLoading(false);
    });
  }, [chapterSearch, filter, page, selectedStory, sort]);

  useEffect(() => {
    if (selectedStory) {
      setPage(1);
      setSelectedIds([]);
    }
  }, [selectedStory]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  function runBulk(action: "free" | "price" | "from" | "restore") {
    if (!selectedStory || selectedIds.length === 0) {
      setError("Chưa chọn chương.");
      return;
    }

    if (action === "from") {
      const fromNum = Number(applyFrom);
      if (!Number.isFinite(fromNum) || fromNum < 1) {
        setError("Số chương bắt đầu không hợp lệ.");
        return;
      }
      const priceCheck = parseCoin(bulkPrice);
      if (!priceCheck.ok) {
        setError(priceCheck.error);
        return;
      }
      const targetIds = rows
        .filter((row) => row.episodeNumber >= fromNum)
        .map((row) => row.chapterId);
      if (targetIds.length === 0) {
        setError("Không có chương phù hợp trên trang hiện tại.");
        return;
      }
      startTransition(async () => {
        const result = await studioBulkChapterMonetizationAction({
          storyId: selectedStory.storyId,
          chapterIds: targetIds,
          action: "set_price",
          priceCoin: priceCheck.price
        });
        setPendingBulk(null);
        if (result.successCount > 0) loadChapters();
        else setError(result.error ?? "Không áp dụng được.");
      });
      return;
    }

    if (action === "price") {
      const priceCheck = parseCoin(bulkPrice);
      if (!priceCheck.ok) {
        setError(priceCheck.error);
        return;
      }
    }

    startTransition(async () => {
      const result = await studioBulkChapterMonetizationAction({
        storyId: selectedStory.storyId,
        chapterIds: selectedIds,
        action: action === "free" ? "set_free" : action === "restore" ? "apply_auto" : "set_price",
        priceCoin: action === "price" ? Number(bulkPrice) : undefined
      });
      setPendingBulk(null);
      setSelectedIds([]);
      if (result.successCount > 0) loadChapters();
      else setError(result.error ?? "Không áp dụng được.");
    });
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm text-zinc-400">
        Chọn truyện
        <input
          className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(event) => setStorySearch(event.target.value)}
          placeholder="Tìm truyện…"
          type="search"
          value={storySearch}
        />
      </label>

      {loadingStories ? <LoadingState label="Đang tìm truyện…" /> : null}

      {!loadingStories && storyOptions.length > 0 && !selectedStory ? (
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/10">
          {storyOptions.map((story) => (
            <li key={story.storyId}>
              <button
                className="w-full truncate px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
                onClick={() => setSelectedStory(story)}
                type="button"
              >
                {story.title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selectedStory ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-white">{selectedStory.title}</span>
          <button
            className="text-cyan-300 hover:text-cyan-200"
            onClick={() => setSelectedStory(null)}
            type="button"
          >
            Đổi truyện
          </button>
        </div>
      ) : null}

      {!selectedStory ? (
        <EmptyState description="Chọn truyện để quản lý giá từng chương." title="Chưa chọn truyện" />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  filter === item.value
                    ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                    : "border-white/10 text-zinc-400"
                }`}
                key={item.value}
                onClick={() => {
                  setFilter(item.value);
                  setPage(1);
                }}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(event) => {
              setChapterSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm chương…"
            type="search"
            value={chapterSearch}
          />

          {selectedIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2">
              <span className="text-xs text-zinc-400">Đã chọn {selectedIds.length}</span>
              <Button
                disabled={!canConfigure || isPending}
                onClick={() => setPendingBulk("free")}
                type="button"
                variant="secondary"
              >
                Miễn phí
              </Button>
              <input
                className="w-16 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-sm text-white"
                onChange={(event) => setBulkPrice(event.target.value)}
                value={bulkPrice}
              />
              <Button
                className="!min-h-9 !px-2.5 !py-1.5 !text-xs !normal-case"
                disabled={!canConfigure || isPending}
                onClick={() => setPendingBulk("price")}
                type="button"
                variant="secondary"
              >
                Set giá
              </Button>
              <Button
                className="!min-h-9 !px-2.5 !py-1.5 !text-xs !normal-case"
                disabled={!canConfigure || isPending}
                onClick={() => setPendingBulk("restore")}
                type="button"
                variant="ghost"
              >
                Khôi phục theo truyện
              </Button>
              <Button
                className="!min-h-9 !px-2.5 !py-1.5 !text-xs !normal-case"
                onClick={() => setSelectedIds([])}
                type="button"
                variant="ghost"
              >
                Bỏ chọn
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-white/10 p-2">
            <label className="text-xs text-zinc-500">
              Từ chương
              <input
                className="mt-1 w-16 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-sm text-white"
                onChange={(event) => setApplyFrom(event.target.value)}
                value={applyFrom}
              />
            </label>
            <label className="text-xs text-zinc-500">
              Giá ({config.coinDisplayName})
              <input
                className="mt-1 w-16 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-sm text-white"
                onChange={(event) => setBulkPrice(event.target.value)}
                value={bulkPrice}
              />
            </label>
            <Button
              className="!min-h-9 !px-2.5 !py-1.5 !text-xs !normal-case"
              disabled={!canConfigure || isPending}
              onClick={() => setPendingBulk("from")}
              type="button"
              variant="secondary"
            >
              Áp dụng từ chương này
            </Button>
          </div>

          {loading ? <LoadingState label="Đang tải chương…" /> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          {!loading && rows.length > 0 ? (
            <ul className="space-y-2 lg:hidden">
              {rows.map((row) => (
                <li
                  className="rounded-lg border border-white/10 p-3"
                  key={row.chapterId}
                >
                  <div className="flex items-start gap-2">
                    <input
                      checked={selectedIds.includes(row.chapterId)}
                      disabled={!canConfigure}
                      onChange={() =>
                        setSelectedIds((current) =>
                          current.includes(row.chapterId)
                            ? current.filter((id) => id !== row.chapterId)
                            : [...current, row.chapterId]
                        )
                      }
                      type="checkbox"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">
                        #{row.episodeNumber} · {row.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {row.isPaid ? `${row.priceCoin} coin` : "Miễn phí"} · {row.status}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {!loading && rows.length === 0 ? (
            <EmptyState description="Thử đổi bộ lọc hoặc từ khóa." title="Không có chương phù hợp" />
          ) : null}

          <p className="text-xs text-zinc-500">{totalCount} chương · Trang {page}</p>
        </>
      )}

      <MonetizationConfirmModal
        confirmLabel="Xác nhận"
        description="Áp dụng thay đổi cho các chương đã chọn."
        onCancel={() => setPendingBulk(null)}
        onConfirm={() => pendingBulk && runBulk(pendingBulk)}
        open={Boolean(pendingBulk)}
        pending={isPending}
        title="Xác nhận hàng loạt"
      />
    </div>
  );
}
