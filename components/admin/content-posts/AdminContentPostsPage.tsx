"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { ContentPostBulkActionBar } from "@/components/admin/content-posts/ContentPostBulkActionBar";
import { ContentPostFilters } from "@/components/admin/content-posts/ContentPostFilters";
import { ContentPostPagination } from "@/components/admin/content-posts/ContentPostPagination";
import { ContentPostSummaryCards } from "@/components/admin/content-posts/ContentPostSummaryCards";
import { ContentPostTable } from "@/components/admin/content-posts/ContentPostTable";
import { ErrorState } from "@/components/ui";
import { listContentPostIdsForBulkAction } from "@/lib/admin/content-post-actions";
import {
  getContentPostStatsForAdminAction,
  listContentPostsForAdminAction
} from "@/lib/admin/content-post-list-action";
import {
  buildContentPostListQuery,
  getDefaultContentPostListFilters
} from "@/lib/platform-content/parse-post-filters";
import type { ContentPostStats } from "@/lib/platform-content/content-posts";
import type { AdminContentPostCapabilities } from "@/types/admin-content-posts";
import type { ContentPostListFilters } from "@/lib/platform-content/parse-post-filters";
import type { AdminContentPost } from "@/types/platform-content";

type Props = {
  initialFilters: ContentPostListFilters;
  initialItems: AdminContentPost[];
  initialTotal: number;
  initialStats: ContentPostStats;
  capabilities: AdminContentPostCapabilities;
  loadError?: string | null;
};

export function AdminContentPostsPage({
  initialFilters,
  initialItems,
  initialTotal,
  initialStats,
  capabilities,
  loadError
}: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [searchInput, setSearchInput] = useState(initialFilters.search);
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [stats, setStats] = useState(initialStats);
  const [listError, setListError] = useState(loadError);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const hasFilters =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.postType !== "all" ||
    filters.indexFilter !== "all" ||
    filters.seoFilter !== "all" ||
    filters.dateRange !== "all";

  const refreshList = useCallback(
    (next: ContentPostListFilters, push = true) => {
      startTransition(async () => {
        setListError(null);
        const [listResult, statsResult] = await Promise.all([
          listContentPostsForAdminAction(next),
          getContentPostStatsForAdminAction()
        ]);
        if (listResult.error) {
          setListError(listResult.error);
          return;
        }
        setItems(listResult.items);
        setTotal(listResult.total);
        setFilters(next);
        if (!statsResult.error && statsResult.stats) setStats(statsResult.stats);
        setSelectedIds((current) => current.filter((id) => listResult.items.some((i) => i.id === id)));
        if (push) router.push(`/admin/content-hub${buildContentPostListQuery(next)}`);
      });
    },
    [router]
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  }

  function selectAllByFilter() {
    startTransition(async () => {
      const result = await listContentPostIdsForBulkAction(filters);
      if (result.error) {
        showToast(result.error);
        return;
      }
      setSelectedIds(result.ids);
      showToast(`Đã chọn ${result.ids.length} bài theo bộ lọc.`);
    });
  }

  if (listError && items.length === 0) {
    return <ErrorState message={listError} title="Không thể tải bài viết" variant="danger" />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Bài viết</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Quản lý blog, hướng dẫn, editorial, chính sách và nội dung SEO của ChapMee.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
            href="/bai-viet"
            target="_blank"
          >
            Xem trang công khai
          </Link>
          <Link
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
            href="/admin/seo/audit"
          >
            Kiểm tra SEO
          </Link>
          {capabilities.canCreate ? (
            <Link
              className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
              href="/admin/content-hub/new"
            >
              Tạo bài viết
            </Link>
          ) : null}
        </div>
      </header>

      <ContentPostSummaryCards
        onFilterNoindex={() => refreshList({ ...filters, indexFilter: "noindex", page: 1 })}
        onFilterSeo={() => refreshList({ ...filters, seoFilter: "has_issue", page: 1 })}
        onFilterStatus={(status) =>
          refreshList({ ...filters, status: status as ContentPostListFilters["status"], page: 1 })
        }
        stats={stats}
      />

      {toast ? (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
          {toast}
        </div>
      ) : null}

      <ContentPostFilters
        filters={filters}
        onApply={() => refreshList({ ...filters, search: searchInput.trim(), page: 1 })}
        onChange={(patch) => refreshList({ ...filters, ...patch })}
        onReset={() => {
          setSearchInput("");
          setSelectedIds([]);
          refreshList(getDefaultContentPostListFilters());
        }}
        onSearchInputChange={setSearchInput}
        pending={pending}
        searchInput={searchInput}
      />

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
          <button
            className="rounded-lg border border-white/10 px-2 py-1 hover:bg-white/5"
            onClick={() => setSelectedIds(items.map((i) => i.id))}
            type="button"
          >
            Chọn trang ({items.length})
          </button>
          <button
            className="rounded-lg border border-white/10 px-2 py-1 hover:bg-white/5"
            disabled={pending}
            onClick={selectAllByFilter}
            type="button"
          >
            Chọn theo bộ lọc ({total})
          </button>
        </div>
      ) : null}

      <ContentPostTable
        capabilities={capabilities}
        hasFilters={hasFilters}
        items={items}
        onClearFilters={() => {
          setSearchInput("");
          refreshList(getDefaultContentPostListFilters());
        }}
        onRefresh={() => refreshList(filters, false)}
        onSelectionChange={setSelectedIds}
        onToast={showToast}
        selectedIds={selectedIds}
      />

      <ContentPostPagination
        onPageChange={(page) => refreshList({ ...filters, page })}
        onPageSizeChange={(pageSize) => refreshList({ ...filters, pageSize, page: 1 })}
        page={filters.page}
        pageSize={filters.pageSize}
        pending={pending}
        total={total}
      />

      <ContentPostBulkActionBar
        onClearSelection={() => setSelectedIds([])}
        onDone={showToast}
        onRefresh={() => refreshList(filters, false)}
        selectedCount={selectedIds.length}
        selectedIds={selectedIds}
      />
    </div>
  );
}
