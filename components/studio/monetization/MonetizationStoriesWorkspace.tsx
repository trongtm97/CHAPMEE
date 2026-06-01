"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button, EmptyState } from "@/components/ui";
import { MonetizationConfirmModal } from "@/components/studio/monetization/MonetizationConfirmModal";
import { MonetizationStoriesEmptyState } from "@/components/studio/monetization/MonetizationStoriesEmptyState";
import { MonetizationToast } from "@/components/studio/monetization/MonetizationToast";
import {
  MonetizationBadge,
  MonetizationFilterChip,
  MonetizationTableButton,
  MonetizationTableSkeleton,
  getBundleStatusBadge,
  getPaidStatusBadge,
  getStoryStatusBadge
} from "@/components/studio/monetization/monetization-ui";
import { StoryMonetizationBulkBar } from "@/components/studio/monetization/StoryMonetizationBulkBar";
import { StoryMonetizationSettingsSheet } from "@/components/studio/monetization/StoryMonetizationSettingsSheet";
import { formatMonetizationCoin, formatMonetizationVnd } from "@/lib/studio/format-monetization-display";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import {
  studioBulkMonetizationAction,
  studioFetchMonetizationStoriesAction,
  studioUpdateStoryMonetizationAction
} from "@/lib/studio/studio-monetization-actions";
import type { StudioMonetizationConfigView, StudioStoryMonetizationRow } from "@/types/studio-monetization";
import type {
  StudioMonetizationBulkAction,
  StudioMonetizationBulkScope,
  StudioMonetizationGenreOption,
  StudioMonetizationPageSize,
  StudioMonetizationStoriesPageResult,
  StudioMonetizationStoryFilter,
  StudioMonetizationStorySort
} from "@/types/studio-monetization-stories";

const PAID_FILTER_OPTIONS: Array<{ value: StudioMonetizationStoryFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "has_paid_chapters", label: "Đang bật phí" },
  { value: "all_free", label: "Miễn phí" },
  { value: "full_access_on", label: "Có bán trọn bộ" },
  { value: "full_story_escrow", label: "Trọn bộ đang giữ" },
  { value: "pending_admin_completion", label: "Chờ admin xác nhận hoàn thành" },
  { value: "admin_completion_confirmed", label: "Hoàn thành đã xác nhận" },
  { value: "unconfigured", label: "Chưa cấu hình" },
  { value: "hidden", label: "Đã ẩn" }
];

const STATUS_FILTER_OPTIONS: Array<{ value: StudioMonetizationStoryFilter; label: string }> = [
  { value: "published", label: "Đang đăng" },
  { value: "completed", label: "Hoàn thành" },
  { value: "draft", label: "Nháp" },
  { value: "hidden", label: "Đã ẩn" }
];

const SORT_OPTIONS: Array<{ value: StudioMonetizationStorySort; label: string }> = [
  { value: "updated", label: "Cập nhật gần nhất" },
  { value: "revenue", label: "Doanh thu cao nhất" },
  { value: "reads", label: "Lượt đọc cao nhất" },
  { value: "title", label: "Tên A-Z" }
];

const PAGE_SIZE_OPTIONS: StudioMonetizationPageSize[] = [10, 25, 50, 100];

type MonetizationStoriesTabProps = {
  canConfigure: boolean;
  config: StudioMonetizationConfigView;
  genreOptions: StudioMonetizationGenreOption[];
  storiesTotalCount: number;
};

function formatStoryStatus(story: StudioStoryMonetizationRow) {
  if (story.isCompleted) return "Hoàn thành";
  if (story.visibility !== "public" || story.status === "hidden") return "Đã ẩn";
  if (story.status === "published" || story.status === "approved") return "Đang đăng";
  return "Nháp";
}

function formatUpdatedAt(iso: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function MonetizationStoriesTab({
  canConfigure,
  config,
  genreOptions,
  storiesTotalCount
}: MonetizationStoriesTabProps) {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageData, setPageData] = useState<StudioMonetizationStoriesPageResult | null>(null);
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [paidFilter, setPaidFilter] = useState<StudioMonetizationStoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StudioMonetizationStoryFilter | "">("");
  const [sort, setSort] = useState<StudioMonetizationStorySort>("updated");
  const [genreId, setGenreId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<StudioMonetizationPageSize>(25);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingStory, setEditingStory] = useState<StudioStoryMonetizationRow | null>(null);
  const [menuStoryId, setMenuStoryId] = useState<string | null>(null);
  const [pendingToggle, setPendingToggle] = useState<StudioStoryMonetizationRow | null>(null);
  const [pendingReset, setPendingReset] = useState<StudioStoryMonetizationRow | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null
  );

  const activeFilter = statusFilter || paidFilter;
  const hasActiveFilters =
    paidFilter !== "all" ||
    Boolean(statusFilter) ||
    sort !== "updated" ||
    pageSize !== 25 ||
    Boolean(genreId) ||
    query.length > 0;

  function clearFilters() {
    setSearchInput("");
    setQuery("");
    setPaidFilter("all");
    setStatusFilter("");
    setSort("updated");
    setGenreId("");
    setPageSize(25);
    setPage(1);
  }

  const loadStories = useCallback(() => {
    setLoading(true);
    setError(null);

    startTransition(async () => {
      const result = await studioFetchMonetizationStoriesAction({
        page,
        pageSize,
        search: query,
        filter: activeFilter,
        sort,
        genreId: genreId || undefined
      });

      setPageData(result);
      setError(result.error);
      setLoading(false);
    });
  }, [activeFilter, genreId, page, pageSize, query, sort]);

  useEffect(() => {
    if (storiesTotalCount === 0) {
      setLoading(false);
      return;
    }
    loadStories();
  }, [loadStories, storiesTotalCount]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const rows = pageData?.rows ?? [];
  const totalCount = pageData?.totalCount ?? 0;
  const totalPages = pageData?.totalPages ?? 1;
  const currentPage = pageData?.page ?? page;
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalCount);

  const allPageSelected = useMemo(
    () => rows.length > 0 && rows.every((row) => selectedIds.includes(row.storyId)),
    [rows, selectedIds]
  );

  const selectedStructureCounts = useMemo(() => {
    const selectedRows = rows.filter((row) => selectedIds.includes(row.storyId));
    return {
      chaptered: selectedRows.filter((row) => row.structureType === "chaptered").length,
      standalone: selectedRows.filter((row) => row.structureType === "standalone").length
    };
  }, [rows, selectedIds]);

  function toggleSelect(storyId: string) {
    setSelectedIds((current) =>
      current.includes(storyId) ? current.filter((id) => id !== storyId) : [...current, storyId]
    );
  }

  function toggleSelectAllPage() {
    if (allPageSelected) {
      const pageIds = new Set(rows.map((row) => row.storyId));
      setSelectedIds((current) => current.filter((id) => !pageIds.has(id)));
      return;
    }
    setSelectedIds((current) => [...new Set([...current, ...rows.map((row) => row.storyId)])]);
  }

  function showBulkResult(label: string, result: { successCount: number; failedCount: number; error?: string }) {
    if (result.error && result.successCount === 0) {
      setToast({ message: result.error, variant: "error" });
      return;
    }
    const message =
      result.failedCount > 0
        ? `${label}: ${result.successCount} thành công, ${result.failedCount} thất bại.`
        : `${label} ${result.successCount} truyện.`;
    setToast({ message, variant: result.successCount > 0 ? "success" : "error" });
    if (result.successCount > 0) {
      setSelectedIds([]);
      loadStories();
    }
  }

  function runBulk(
    scope: StudioMonetizationBulkScope,
    action: StudioMonetizationBulkAction,
    options?: {
      coinPrice?: number;
      freeChaptersCount?: number;
      fullAccessPriceCoin?: number;
      autoPriceCoin?: number;
      autoPaidFromChapter?: number;
      overwriteOverrides?: boolean;
    }
  ) {
    startTransition(async () => {
      const result = await studioBulkMonetizationAction({
        scope,
        selectedStoryIds: selectedIds,
        action,
        coinPrice: options?.coinPrice,
        freeChaptersCount: options?.freeChaptersCount,
        fullAccessPriceCoin: options?.fullAccessPriceCoin,
        autoPriceCoin: options?.autoPriceCoin,
        autoPaidFromChapter: options?.autoPaidFromChapter,
        overwriteOverrides: options?.overwriteOverrides
      });
      showBulkResult("Áp dụng hàng loạt", result);
    });
  }

  function handleRowToggle(story: StudioStoryMonetizationRow) {
    startTransition(async () => {
      const result = await studioUpdateStoryMonetizationAction({
        storyId: story.storyId,
        monetizationEnabled: !story.monetizationEnabled,
        freeChaptersCount: story.freeChaptersCount,
        coinPrice: story.defaultCoinPrice
      });

      if (!result.ok) {
        setToast({ message: result.error ?? "Không cập nhật được.", variant: "error" });
        return;
      }

      setToast({
        message: story.monetizationEnabled ? "Đã tắt trả phí." : "Đã bật trả phí.",
        variant: "success"
      });
      setPendingToggle(null);
      loadStories();
    });
  }

  if (!config.paidChaptersEnabled) {
    return (
      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 text-sm text-zinc-400">
        Admin chưa bật chương trả phí trên nền tảng.
      </section>
    );
  }

  if (storiesTotalCount === 0) {
    return <MonetizationStoriesEmptyState />;
  }

  return (
    <>
      <div className="sticky top-0 z-10 -mx-1 space-y-3 bg-zinc-950/95 px-1 py-2 backdrop-blur">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-3">
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/50"
            disabled={loading}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm theo tên truyện…"
            type="search"
            value={searchInput}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-zinc-400">
              {totalCount === 0
                ? `0 / ${storiesTotalCount.toLocaleString("vi-VN")} truyện`
                : `Đang xem ${rangeStart.toLocaleString("vi-VN")}–${rangeEnd.toLocaleString("vi-VN")} trong ${totalCount.toLocaleString("vi-VN")} truyện`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                className="sm:hidden !min-h-9 !py-1.5 !text-xs !normal-case"
                onClick={() => setFiltersOpen((value) => !value)}
                type="button"
                variant="secondary"
              >
                Bộ lọc
              </Button>
              {hasActiveFilters ? (
                <Button
                  className="!min-h-9 !py-1.5 !text-xs !normal-case"
                  onClick={clearFilters}
                  type="button"
                  variant="ghost"
                >
                  Xoá lọc
                </Button>
              ) : null}
            </div>
          </div>

          <div className={`mt-3 space-y-3 ${filtersOpen ? "block" : "hidden sm:block"}`}>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Trạng thái trả phí
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PAID_FILTER_OPTIONS.map((option) => (
                  <MonetizationFilterChip
                    active={paidFilter === option.value && !statusFilter}
                    disabled={loading}
                    key={option.value}
                    onClick={() => {
                      setPaidFilter(option.value);
                      setStatusFilter("");
                      setPage(1);
                    }}
                  >
                    {option.label}
                  </MonetizationFilterChip>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Trạng thái truyện
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <MonetizationFilterChip
                    active={statusFilter === option.value}
                    disabled={loading}
                    key={option.value}
                    onClick={() => {
                      setStatusFilter(option.value);
                      setPage(1);
                    }}
                  >
                    {option.label}
                  </MonetizationFilterChip>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <select
                aria-label="Sắp xếp"
                className="rounded-lg border border-white/10 bg-zinc-950 px-2 py-2.5 text-sm text-white"
                disabled={loading}
                onChange={(event) => {
                  setSort(event.target.value as StudioMonetizationStorySort);
                  setPage(1);
                }}
                value={sort}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Số mục mỗi trang"
                className="rounded-lg border border-white/10 bg-zinc-950 px-2 py-2.5 text-sm text-white"
                disabled={loading}
                onChange={(event) => {
                  setPageSize(Number(event.target.value) as StudioMonetizationPageSize);
                  setPage(1);
                }}
                value={pageSize}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} / trang
                  </option>
                ))}
              </select>
              {genreOptions.length > 0 ? (
                <select
                  aria-label="Thể loại"
                  className="rounded-lg border border-white/10 bg-zinc-950 px-2 py-2.5 text-sm text-white"
                  disabled={loading}
                  onChange={(event) => {
                    setGenreId(event.target.value);
                    setPage(1);
                  }}
                  value={genreId}
                >
                  <option value="">Tất cả thể loại</option>
                  {genreOptions.map((genre) => (
                    <option key={genre.id} value={genre.id}>
                      {genre.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>
        </div>

        {selectedIds.length > 0 ? (
          <div className="sticky bottom-20 z-20 sm:static sm:bottom-auto">
            <StoryMonetizationBulkBar
              chapteredCount={selectedStructureCounts.chaptered}
              config={config}
              count={selectedIds.length}
              disabled={!canConfigure}
              onApply={(input) => runBulk("selected", input.action, input)}
              onClear={() => setSelectedIds([])}
              pending={isPending}
              standaloneCount={selectedStructureCounts.standalone}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">
        {loading ? <MonetizationTableSkeleton rows={Math.min(pageSize, 8)} /> : null}
        {error ? (
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3">
            <p className="text-sm text-rose-100">{error}</p>
            <Button className="mt-3" onClick={loadStories} type="button" variant="secondary">
              Thử lại
            </Button>
          </div>
        ) : null}

        {!loading && rows.length === 0 ? (
          <EmptyState
            description={
              hasActiveFilters
                ? "Thử đổi bộ lọc hoặc từ khóa tìm kiếm."
                : "Chưa có truyện phù hợp."
            }
            title="Không có truyện phù hợp"
          />
        ) : null}

        {!loading && rows.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-white/10 lg:block">
              <table className="min-w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-10" />
                  <col className="w-[26%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                  <col className="w-[7%]" />
                  <col className="w-[9%]" />
                  <col className="w-[12%]" />
                  <col className="w-[9%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead className="bg-white/[0.04] text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-2 py-2">
                      <input
                        aria-label="Chọn tất cả trang"
                        checked={allPageSelected}
                        disabled={!canConfigure}
                        onChange={toggleSelectAllPage}
                        type="checkbox"
                      />
                    </th>
                    <th className="px-2 py-2">Truyện</th>
                    <th className="px-2 py-2">Trạng thái</th>
                    <th className="px-2 py-2">Kiếm tiền</th>
                    <th className="px-2 py-2 text-center">Miễn phí</th>
                    <th className="px-2 py-2 text-right">Giá chương</th>
                    <th className="px-2 py-2">Trọn bộ</th>
                    <th className="px-2 py-2 text-right">Doanh thu</th>
                    <th className="whitespace-nowrap px-2 py-2 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((story) => {
                    const paidBadge = getPaidStatusBadge(story);
                    const bundleBadge = getBundleStatusBadge(story);
                    const statusBadge = getStoryStatusBadge(story);
                    return (
                      <tr
                        className="border-t border-white/5 transition hover:bg-white/[0.02]"
                        key={story.storyId}
                      >
                        <td className="px-2 py-2 align-middle">
                          <input
                            checked={selectedIds.includes(story.storyId)}
                            disabled={!canConfigure}
                            onChange={() => toggleSelect(story.storyId)}
                            type="checkbox"
                          />
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <div className="flex min-w-0 items-center gap-2">
                            <StoryCover coverUrl={story.coverUrl} title={story.title} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-zinc-100">{story.title}</p>
                              {story.genreName ? (
                                <p className="truncate text-xs text-zinc-500">{story.genreName}</p>
                              ) : null}
                              <p className="truncate text-xs text-zinc-600">
                                {story.structureType === "standalone"
                                  ? "Một phần"
                                  : "Nhiều chương"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <MonetizationBadge tone={statusBadge.tone}>
                            {statusBadge.label}
                          </MonetizationBadge>
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <MonetizationBadge tone={paidBadge.tone}>{paidBadge.label}</MonetizationBadge>
                        </td>
                        <td className="px-2 py-2 align-middle text-center text-zinc-300">
                          {story.structureType === "standalone"
                            ? "—"
                            : story.freeChaptersCount}
                        </td>
                        <td className="px-2 py-2 align-middle text-right text-zinc-300">
                          {story.structureType === "standalone"
                            ? story.fullAccessPriceCoin != null
                              ? formatMonetizationCoin(
                                  story.fullAccessPriceCoin,
                                  config.coinDisplayName
                                )
                              : "—"
                            : story.defaultCoinPrice != null
                              ? formatMonetizationCoin(
                                  story.defaultCoinPrice,
                                  config.coinDisplayName
                                )
                              : "—"}
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <div className="space-y-0.5">
                            <MonetizationBadge tone={bundleBadge.tone}>{bundleBadge.label}</MonetizationBadge>
                            {story.fullAccessEnabled && story.fullAccessPriceCoin != null ? (
                              <p className="text-xs text-violet-200/80">
                                {formatMonetizationCoin(
                                  story.fullAccessPriceCoin,
                                  config.coinDisplayName
                                )}
                              </p>
                            ) : null}
                            {(story.lockedFullStoryRevenueVnd ?? 0) > 0 ? (
                              <p className="text-xs text-amber-200/90">
                                Giữ {formatMonetizationVnd(story.lockedFullStoryRevenueVnd ?? 0)}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-2 py-2 align-middle text-right">
                          <span
                            className={
                              story.revenueVnd > 0
                                ? "font-semibold text-emerald-300"
                                : "text-zinc-500"
                            }
                          >
                            {formatMonetizationVnd(story.revenueVnd)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 align-middle text-right">
                          <StoryRowActions
                            canConfigure={canConfigure}
                            menuOpen={menuStoryId === story.storyId}
                            onCloseMenu={() => setMenuStoryId(null)}
                            onConfigure={() => setEditingStory(story)}
                            onOpenMenu={() =>
                              setMenuStoryId((current) =>
                                current === story.storyId ? null : story.storyId
                              )
                            }
                            onReset={() => setPendingReset(story)}
                            onToggle={() => setPendingToggle(story)}
                            story={story}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 lg:hidden">
              {rows.map((story) => {
                const paidBadge = getPaidStatusBadge(story);
                const bundleBadge = getBundleStatusBadge(story);
                const statusBadge = getStoryStatusBadge(story);
                return (
                  <li key={story.storyId}>
                    <article className="rounded-xl border border-white/10 bg-gradient-to-br from-zinc-950 to-zinc-900/80 p-3">
                      <div className="flex gap-3">
                        <input
                          checked={selectedIds.includes(story.storyId)}
                          className="mt-1 h-4 w-4"
                          disabled={!canConfigure}
                          onChange={() => toggleSelect(story.storyId)}
                          type="checkbox"
                        />
                        <StoryCover coverUrl={story.coverUrl} title={story.title} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-white">{story.title}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {story.genreName ?? "Chưa có thể loại"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <MonetizationBadge tone={statusBadge.tone}>
                              {statusBadge.label}
                            </MonetizationBadge>
                            <MonetizationBadge tone={paidBadge.tone}>{paidBadge.label}</MonetizationBadge>
                            <MonetizationBadge tone={bundleBadge.tone}>{bundleBadge.label}</MonetizationBadge>
                          </div>
                          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg bg-white/[0.03] px-2 py-1.5">
                              <dt className="text-zinc-500">Miễn phí</dt>
                              <dd className="mt-0.5 font-semibold text-zinc-200">
                                {story.freeChaptersCount} chương
                              </dd>
                            </div>
                            <div className="rounded-lg bg-white/[0.03] px-2 py-1.5">
                              <dt className="text-zinc-500">Giá chương</dt>
                              <dd className="mt-0.5 font-semibold text-sky-200">
                                {story.defaultCoinPrice != null
                                  ? formatMonetizationCoin(
                                      story.defaultCoinPrice,
                                      config.coinDisplayName
                                    )
                                  : "—"}
                              </dd>
                            </div>
                            <div className="rounded-lg bg-white/[0.03] px-2 py-1.5">
                              <dt className="text-zinc-500">Doanh thu</dt>
                              <dd
                                className={`mt-0.5 font-semibold ${
                                  story.revenueVnd > 0 ? "text-emerald-300" : "text-zinc-500"
                                }`}
                              >
                                {formatMonetizationVnd(story.revenueVnd)}
                              </dd>
                            </div>
                            <div className="rounded-lg bg-white/[0.03] px-2 py-1.5">
                              <dt className="text-zinc-500">Mở khóa</dt>
                              <dd className="mt-0.5 font-semibold text-zinc-200">
                                {story.unlockCount.toLocaleString("vi-VN")}
                              </dd>
                            </div>
                          </dl>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <MonetizationTableButton
                              className="flex-1"
                              disabled={!canConfigure}
                              onClick={() => setEditingStory(story)}
                              tone="cyan"
                            >
                              Cài đặt
                            </MonetizationTableButton>
                            <MonetizationTableButton
                              className="flex-1"
                              disabled={!canConfigure || isPending}
                              onClick={() => setPendingToggle(story)}
                              tone={story.monetizationEnabled ? "amber" : "green"}
                            >
                              {story.monetizationEnabled ? "Tắt trả phí" : "Bật trả phí"}
                            </MonetizationTableButton>
                          </div>
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-zinc-500">
                Trang {currentPage}/{totalPages} · {totalCount.toLocaleString("vi-VN")} truyện
              </p>
              <div className="flex gap-2">
                <Button
                  disabled={currentPage <= 1 || isPending}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  type="button"
                  variant="secondary"
                >
                  Trước
                </Button>
                <Button
                  disabled={currentPage >= totalPages || isPending}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  type="button"
                  variant="secondary"
                >
                  Sau
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {editingStory ? (
        <StoryMonetizationSettingsSheet
          canConfigure={canConfigure}
          config={config}
          onClose={() => setEditingStory(null)}
          onSaved={(message) => {
            setEditingStory(null);
            setToast({ message, variant: "success" });
            loadStories();
          }}
          story={editingStory}
        />
      ) : null}

      <MonetizationConfirmModal
        confirmLabel="Reset cấu hình"
        description={
          pendingReset
            ? `Reset cấu hình trả phí cho "${pendingReset.title}". Thay đổi chỉ ảnh hưởng giao dịch mới.`
            : ""
        }
        onCancel={() => setPendingReset(null)}
        onConfirm={() => {
          if (!pendingReset) return;
          startTransition(async () => {
            const result = await studioBulkMonetizationAction({
              scope: "selected",
              selectedStoryIds: [pendingReset.storyId],
              action: "reset"
            });
            setPendingReset(null);
            showBulkResult("Reset cấu hình", result);
          });
        }}
        open={Boolean(pendingReset)}
        pending={isPending}
        title="Xác nhận reset cấu hình"
      />

      <MonetizationConfirmModal
        confirmLabel={pendingToggle?.monetizationEnabled ? "Tắt trả phí" : "Bật trả phí"}
        description={
          pendingToggle
            ? `Áp dụng cho "${pendingToggle.title}". Thay đổi chỉ ảnh hưởng giao dịch mới.`
            : ""
        }
        onCancel={() => setPendingToggle(null)}
        onConfirm={() => pendingToggle && handleRowToggle(pendingToggle)}
        open={Boolean(pendingToggle)}
        pending={isPending}
        title="Xác nhận thay đổi trả phí"
      />

      <MonetizationToast
        message={toast?.message ?? null}
        onDismiss={() => setToast(null)}
        variant={toast?.variant}
      />
    </>
  );
}

export { MonetizationStoriesTab as MonetizationStoriesWorkspace };

function StoryCover({ coverUrl, title }: { coverUrl: string | null; title: string }) {
  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="h-10 w-8 shrink-0 rounded object-cover"
        height={40}
        src={coverUrl}
        width={32}
      />
    );
  }

  return (
    <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded border border-white/10 bg-zinc-900 text-[0.6rem] font-bold text-zinc-500">
      {title.slice(0, 1).toUpperCase()}
    </div>
  );
}

function StoryRowActions({
  canConfigure,
  menuOpen,
  onCloseMenu,
  onConfigure,
  onOpenMenu,
  onReset,
  onToggle,
  story
}: {
  canConfigure: boolean;
  menuOpen: boolean;
  onCloseMenu: () => void;
  onConfigure: () => void;
  onOpenMenu: () => void;
  onReset: () => void;
  onToggle: () => void;
  story: StudioStoryMonetizationRow;
}) {
  return (
    <div className="relative inline-flex shrink-0 flex-nowrap items-center justify-end gap-1">
      <MonetizationTableButton disabled={!canConfigure} onClick={onConfigure} tone="cyan">
        Cài đặt
      </MonetizationTableButton>
      <MonetizationTableButton
        disabled={!canConfigure}
        onClick={onToggle}
        tone={story.monetizationEnabled ? "amber" : "green"}
      >
        {story.monetizationEnabled ? "Tắt" : "Bật"}
      </MonetizationTableButton>
      <MonetizationTableButton
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="!h-7 !w-7 !px-0"
        onClick={onOpenMenu}
        title="Thêm thao tác"
        tone="slate"
      >
        ⋯
      </MonetizationTableButton>
      {menuOpen ? (
        <div className="absolute right-0 top-10 z-20 min-w-[10rem] rounded-xl border border-white/10 bg-zinc-950 p-1 shadow-xl">
          <Link
            className="block rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
            href={getStoryDetailHref({
              slug: story.slug,
              public_code: story.publicCode
            })}
            onClick={onCloseMenu}
          >
            Xem chi tiết
          </Link>
          <Link
            className="block rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
            href={
              story.structureType === "standalone"
                ? `/studio/stories/${story.storyId}/content`
                : `/studio/stories/${story.storyId}/chapters`
            }
            onClick={onCloseMenu}
          >
            {story.structureType === "standalone" ? "Soạn nội dung" : "Quản lý chương"}
          </Link>
          <button
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
            disabled={!canConfigure}
            onClick={() => {
              onCloseMenu();
              onConfigure();
            }}
            type="button"
          >
            Cài trọn bộ
          </button>
          <button
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
            disabled={!canConfigure}
            onClick={() => {
              onCloseMenu();
              onToggle();
            }}
            type="button"
          >
            {story.monetizationEnabled ? "Tắt trả phí" : "Bật trả phí"}
          </button>
          <button
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
            disabled={!canConfigure}
            onClick={() => {
              onCloseMenu();
              onReset();
            }}
            type="button"
          >
            Reset về mặc định
          </button>
        </div>
      ) : null}
    </div>
  );
}
