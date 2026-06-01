"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { AnnouncementBulkActionBar } from "@/components/admin/announcements/AnnouncementBulkActionBar";
import { AnnouncementFilters } from "@/components/admin/announcements/AnnouncementFilters";
import { AnnouncementPagination } from "@/components/admin/announcements/AnnouncementPagination";
import { AnnouncementSummaryCards } from "@/components/admin/announcements/AnnouncementSummaryCards";
import { AnnouncementTable } from "@/components/admin/announcements/AnnouncementTable";
import { ErrorState } from "@/components/ui";
import { listAnnouncementIdsForBulkAction } from "@/lib/admin/announcement-actions";
import {
  getAnnouncementStatsForAdminAction,
  listAnnouncementsForAdminAction
} from "@/lib/admin/announcement-list-action";
import {
  buildAnnouncementListQuery,
  countActiveAnnouncementFilters,
  getDefaultAnnouncementListFilters
} from "@/lib/platform-content/parse-announcement-filters";
import type { AnnouncementStats } from "@/lib/platform-content/announcements";
import type { AdminAnnouncementCapabilities } from "@/types/admin-announcements";
import type { AnnouncementListFilters } from "@/lib/platform-content/parse-announcement-filters";
import type { PlatformAnnouncement } from "@/types/platform-content";

type Props = {
  initialFilters: AnnouncementListFilters;
  initialItems: PlatformAnnouncement[];
  initialTotal: number;
  initialStats: AnnouncementStats;
  capabilities: AdminAnnouncementCapabilities;
  loadError?: string | null;
};

export function AdminAnnouncementsPage({
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

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const hasFilters = countActiveAnnouncementFilters(filters) > 0;

  const refreshList = useCallback(
    (next: AnnouncementListFilters, push = true) => {
      startTransition(async () => {
        setListError(null);
        const [listResult, statsResult] = await Promise.all([
          listAnnouncementsForAdminAction(next),
          getAnnouncementStatsForAdminAction()
        ]);

        if (listResult.error) {
          setListError(listResult.error);
          return;
        }

        setItems(listResult.items);
        setTotal(listResult.total);
        setFilters(next);
        if (!statsResult.error && statsResult.stats) {
          setStats(statsResult.stats);
        }
        setSelectedIds((current) =>
          current.filter((id) => listResult.items.some((item) => item.id === id))
        );

        if (push) {
          router.push(`/admin/announcements${buildAnnouncementListQuery(next)}`);
        }
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
      const result = await listAnnouncementIdsForBulkAction(filters);
      if (result.error) {
        showToast(result.error);
        return;
      }
      setSelectedIds(result.ids);
      showToast(`Đã chọn ${result.ids.length} thông báo theo bộ lọc.`);
    });
  }

  if (listError && items.length === 0) {
    return <ErrorState message={listError} title="Không thể tải thông báo" variant="danger" />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Thông báo nền tảng</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Quản lý thông báo chính thức của ChapMee: bảo trì, chính sách, tính năng, cảnh báo và
            thông tin dành cho tác giả/độc giả. Khác blog SEO và notification campaign.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
            href="/thong-bao"
            target="_blank"
          >
            Xem trang công khai
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
            href="/admin/announcements?status=scheduled"
          >
            Lịch đăng
          </Link>
          {capabilities.canCreate ? (
            <Link
              className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400"
              href="/admin/announcements/new"
            >
              Tạo thông báo
            </Link>
          ) : null}
        </div>
      </header>

      <AnnouncementSummaryCards
        onFilterSeo={() => refreshList({ ...filters, seo: "seo_issue", page: 1 })}
        onFilterStatus={(status) => refreshList({ ...filters, status: status as AnnouncementListFilters["status"], page: 1 })}
        stats={stats}
      />

      {toast ? (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
          {toast}
        </div>
      ) : null}

      <AnnouncementFilters
        filters={filters}
        onApply={() => refreshList({ ...filters, search: searchInput.trim(), page: 1 })}
        onChange={(patch) => refreshList({ ...filters, ...patch })}
        onReset={() => {
          setSearchInput("");
          setSelectedIds([]);
          refreshList(getDefaultAnnouncementListFilters());
        }}
        onSearchInputChange={setSearchInput}
        pending={pending}
        searchInput={searchInput}
      />

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <button
            className="rounded-lg border border-white/10 px-2 py-1 transition hover:bg-white/5"
            onClick={() => setSelectedIds(items.map((item) => item.id))}
            type="button"
          >
            Chọn tất cả trang ({items.length})
          </button>
          <button
            className="rounded-lg border border-white/10 px-2 py-1 transition hover:bg-white/5"
            disabled={pending}
            onClick={selectAllByFilter}
            type="button"
          >
            Chọn theo bộ lọc ({total})
          </button>
        </div>
      ) : null}

      <AnnouncementTable
        capabilities={capabilities}
        hasFilters={hasFilters}
        items={items}
        onClearFilters={() => {
          setSearchInput("");
          refreshList(getDefaultAnnouncementListFilters());
        }}
        onRefresh={() => refreshList(filters, false)}
        onSelectionChange={setSelectedIds}
        onToast={showToast}
        selectedIds={selectedIds}
      />

      <AnnouncementPagination
        onPageChange={(page) => refreshList({ ...filters, page })}
        onPageSizeChange={(pageSize) => refreshList({ ...filters, pageSize, page: 1 })}
        page={filters.page}
        pageSize={filters.pageSize}
        pending={pending}
        total={total}
        totalPages={totalPages}
      />

      <AnnouncementBulkActionBar
        onClearSelection={() => setSelectedIds([])}
        onDone={showToast}
        onRefresh={() => refreshList(filters, false)}
        selectedCount={selectedIds.length}
        selectedIds={selectedIds}
      />
    </div>
  );
}
