"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { CreatorDetailDrawer } from "@/components/admin/creators/CreatorDetailDrawer";
import { CreatorDetailPanel } from "@/components/admin/creators/CreatorDetailPanel";
import {
  CreatorFilters,
  getDefaultCreatorFilters
} from "@/components/admin/creators/CreatorFilters";
import { CreatorSummaryCards } from "@/components/admin/creators/CreatorSummaryCards";
import { CreatorTable } from "@/components/admin/creators/CreatorTable";
import type { CreatorModalType } from "@/components/admin/creators/CreatorActionModals";
import { Button } from "@/components/ui";
import { listAdminCreators } from "@/lib/admin/get-creators";
import { loadAdminCreatorDetailAction } from "@/lib/admin/load-creator-detail";
import { buildCreatorFilterQuery } from "@/lib/admin/parse-creator-dashboard-filters";
import type {
  AdminCreatorDetail,
  AdminCreatorListRow,
  CreatorAdminCapabilities,
  CreatorDashboardFilters,
  CreatorDetailTab,
  CreatorOperationsSummary
} from "@/types/admin-creator";

type Props = {
  initialFilters: CreatorDashboardFilters;
  initialCreators: AdminCreatorListRow[];
  initialTotal: number;
  summary: CreatorOperationsSummary;
  capabilities: CreatorAdminCapabilities;
  moderatorId: string;
  loadError?: boolean;
};

export function AdminCreatorsPage({
  initialFilters,
  initialCreators,
  initialTotal,
  summary,
  capabilities,
  loadError
}: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [creators, setCreators] = useState(initialCreators);
  const [total, setTotal] = useState(initialTotal);
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialFilters.selectedUserId));
  const [selectedId, setSelectedId] = useState<string | null>(
    initialFilters.selectedUserId ?? null
  );
  const [detail, setDetail] = useState<AdminCreatorDetail | null>(null);
  const [searchInput, setSearchInput] = useState(initialFilters.query);
  const [pendingModal, setPendingModal] = useState<CreatorModalType | null>(null);
  const [pendingTab, setPendingTab] = useState<CreatorDetailTab | null>(null);
  const [pending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const rangeStart = total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1;
  const rangeEnd = Math.min(filters.page * filters.pageSize, total);

  const hasActiveFilters =
    filters.studio !== "all" ||
    filters.monetization !== "all" ||
    filters.verification !== "all" ||
    filters.quality !== "all" ||
    filters.finance !== "all" ||
    filters.sort !== "newest" ||
    filters.query.trim().length > 0;

  const applyFilters = useCallback(
    (patch: Partial<CreatorDashboardFilters>) => {
      const next = { ...filters, ...patch };
      setFilters(next);
      router.push(`/admin/creators${buildCreatorFilterQuery(next)}`);
      startTransition(async () => {
        const result = await listAdminCreators(next);
        if (!result.error) {
          setCreators(result.creators);
          setTotal(result.total);
        }
      });
    },
    [filters, router]
  );

  const resetFilters = useCallback(() => {
    const next = getDefaultCreatorFilters(filters.pageSize);
    setSearchInput("");
    setFilters(next);
    router.push("/admin/creators");
    startTransition(async () => {
      const result = await listAdminCreators(next);
      if (!result.error) {
        setCreators(result.creators);
        setTotal(result.total);
      }
    });
  }, [filters.pageSize, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput !== filters.query) {
        applyFilters({ query: searchInput, page: 1 });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, filters.query, applyFilters]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    startTransition(async () => {
      const result = await loadAdminCreatorDetailAction(selectedId);
      setDetail(result.detail);
    });
  }, [selectedId]);

  function openCreator(
    row: AdminCreatorListRow,
    opts?: { modal?: CreatorModalType; tab?: CreatorDetailTab }
  ) {
    setSelectedId(row.userId);
    setDrawerOpen(true);
    setPendingModal(opts?.modal ?? null);
    setPendingTab(opts?.tab ?? null);
    const next = { ...filters, selectedUserId: row.userId };
    setFilters(next);
    router.push(`/admin/creators${buildCreatorFilterQuery(next)}`, { scroll: false });
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedId(null);
    setDetail(null);
    setPendingModal(null);
    setPendingTab(null);
    const next = { ...filters };
    delete next.selectedUserId;
    setFilters(next);
    router.push(`/admin/creators${buildCreatorFilterQuery(next)}`, { scroll: false });
  }

  function refreshDetail() {
    applyFilters({});
    if (selectedId) {
      void loadAdminCreatorDetailAction(selectedId).then((r) => setDetail(r.detail));
    }
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-8 text-center">
        <p className="text-white">Không tải được dữ liệu tác giả.</p>
        <Button className="mt-4" onClick={() => router.refresh()} type="button">
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Quản trị
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Quản lý tác giả</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-400">
          Duyệt Studio, xác minh tác giả, quản lý kiếm tiền, tỷ lệ chia doanh thu, chất lượng
          nội dung và lịch sử rút tiền.
        </p>
      </div>

      <CreatorSummaryCards
        onNavigate={(patch) => applyFilters({ ...patch, page: 1 })}
        summary={summary}
      />

      <CreatorFilters
        filters={filters}
        onApply={applyFilters}
        onReset={resetFilters}
        onSearchChange={setSearchInput}
        searchInput={searchInput}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-400">
        <p>
          {rangeStart}–{rangeEnd} trong {total.toLocaleString("vi-VN")} tác giả
          {pending ? " · Đang tải…" : ""}
        </p>
        <div className="flex gap-2">
          <Button
            disabled={pending || filters.page <= 1}
            onClick={() => applyFilters({ page: filters.page - 1 })}
            type="button"
            variant="secondary"
          >
            Trước
          </Button>
          <span className="flex items-center px-2 text-xs">
            Trang {filters.page}/{totalPages}
          </span>
          <Button
            disabled={pending || filters.page >= totalPages}
            onClick={() => applyFilters({ page: filters.page + 1 })}
            type="button"
            variant="secondary"
          >
            Sau
          </Button>
        </div>
      </div>

      <CreatorTable
        creators={creators}
        hasActiveFilters={hasActiveFilters}
        onOpenModalFromRow={(row, type) => openCreator(row, { modal: type })}
        onOpenTabFromRow={(row, tab) => openCreator(row, { tab: tab as CreatorDetailTab })}
        onResetFilters={resetFilters}
        onView={(row) => openCreator(row)}
      />

      <CreatorDetailDrawer onClose={closeDrawer} open={drawerOpen && Boolean(selectedId)}>
        {detail ? (
          <CreatorDetailPanel
            capabilities={capabilities}
            detail={detail}
            initialModal={pendingModal}
            initialTab={pendingTab}
            onClearInitial={() => {
              setPendingModal(null);
              setPendingTab(null);
            }}
            onClose={closeDrawer}
            onRefresh={refreshDetail}
          />
        ) : selectedId ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
            Đang tải chi tiết tác giả…
          </div>
        ) : null}
      </CreatorDetailDrawer>
    </div>
  );
}
