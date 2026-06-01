"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { FeedbackDetailPanel } from "@/components/admin/feedback/FeedbackDetailPanel";
import { FeedbackEmptyState } from "@/components/admin/feedback/FeedbackEmptyState";
import { FeedbackFilters } from "@/components/admin/feedback/FeedbackFilters";
import { FeedbackKpiCards } from "@/components/admin/feedback/FeedbackKpiCards";
import { FeedbackCardList, FeedbackTable } from "@/components/admin/feedback/FeedbackList";
import { Button, ErrorState } from "@/components/ui";
import { exportFeedbackCsvAction } from "@/lib/admin/feedback-actions";
import { getFeedbackKpiSummary } from "@/lib/admin/feedback/get-kpis";
import { listAdminFeedback } from "@/lib/admin/get-feedback-list";
import {
  buildFeedbackFilterQuery,
  getDefaultFeedbackFilters
} from "@/lib/admin/parse-feedback-filters";
import type {
  FeedbackAdminCapabilities,
  FeedbackDashboardFilters,
  FeedbackKpiSummary
} from "@/types/admin-feedback";
import type { AdminFeedbackListItem } from "@/types/contact-settings";

type Props = {
  initialFilters: FeedbackDashboardFilters;
  initialItems: AdminFeedbackListItem[];
  initialTotal: number;
  summary: FeedbackKpiSummary;
  capabilities: FeedbackAdminCapabilities;
  loadError?: boolean;
};

export function AdminFeedbackPage({
  initialFilters,
  initialItems,
  initialTotal,
  summary: initialSummary,
  capabilities,
  loadError
}: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [summary, setSummary] = useState(initialSummary);
  const [searchInput, setSearchInput] = useState(initialFilters.search);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialFilters.selectedFeedbackId ?? null
  );
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialFilters.selectedFeedbackId));
  const [listError, setListError] = useState(loadError ? "Không thể tải danh sách feedback." : null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const refreshAll = useCallback((next: FeedbackDashboardFilters) => {
    startTransition(async () => {
      setListError(null);
      const [listResult, kpi] = await Promise.all([
        listAdminFeedback(next),
        getFeedbackKpiSummary()
      ]);
      if (listResult.error) {
        setListError(listResult.error);
        return;
      }
      setItems(listResult.items);
      setTotal(listResult.total);
      setSummary(kpi);
    });
  }, []);

  const applyFilters = useCallback(
    (patch: Partial<FeedbackDashboardFilters>, push = true) => {
      const next = {
        ...filters,
        ...patch,
        search: patch.search ?? searchInput
      };
      setFilters(next);
      if (push) {
        router.push(`/admin/feedback${buildFeedbackFilterQuery(next)}`);
      }
      refreshAll(next);
    },
    [filters, refreshAll, router, searchInput]
  );

  const resetFilters = useCallback(() => {
    const next = getDefaultFeedbackFilters();
    setSearchInput("");
    setFilters(next);
    setSelectedId(null);
    setDrawerOpen(false);
    router.push("/admin/feedback");
    refreshAll(next);
  }, [refreshAll, router]);

  function selectItem(id: string) {
    setSelectedId(id);
    setDrawerOpen(true);
    const next = { ...filters, selectedFeedbackId: id };
    router.push(`/admin/feedback${buildFeedbackFilterQuery(next)}`, { scroll: false });
    setFilters(next);
  }

  function exportCsv() {
    startTransition(async () => {
      const result = await exportFeedbackCsvAction(filters);
      if (result.error || !result.csv) {
        setToast(result.error ?? "Không thể xuất CSV.");
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `feedback-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setToast("Đã xuất CSV.");
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <nav className="text-sm text-zinc-500">
          <Link className="hover:text-zinc-300" href="/admin">
            Admin
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">Quản lý feedback</span>
        </nav>
        <Link
          className="shrink-0 text-xs font-medium text-cyan-300/90 hover:text-cyan-200"
          href="/admin/settings/contact"
        >
          Cấu hình form góp ý →
        </Link>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Quản lý feedback</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Xem và xử lý góp ý, báo lỗi, khiếu nại và yêu cầu hỗ trợ người dùng gửi về ChapMee.
          </p>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-2 self-start">
          {capabilities.canExport ? (
            <Button className="whitespace-nowrap" disabled={pending} onClick={exportCsv} type="button">
              Xuất CSV
            </Button>
          ) : null}
          <Button
            className="whitespace-nowrap"
            disabled={pending}
            onClick={resetFilters}
            type="button"
            variant="secondary"
          >
            Reset bộ lọc
          </Button>
        </div>
      </div>

      <FeedbackKpiCards
        onFilterStatus={(status) => {
          if (status === "urgent-filter") {
            applyFilters({ priority: "urgent", page: 1 });
          } else {
            applyFilters({ status: status as FeedbackDashboardFilters["status"], page: 1 });
          }
        }}
        summary={summary}
      />

      <FeedbackFilters
        filters={filters}
        onApply={() => applyFilters({ search: searchInput, page: 1 })}
        onChange={(patch) => applyFilters(patch)}
        onReset={resetFilters}
        onSearchInputChange={setSearchInput}
        pending={pending}
        searchInput={searchInput}
      />

      {toast ? (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {toast}
        </p>
      ) : null}

      {listError ? (
        <ErrorState
          action={
            <Button disabled={pending} onClick={() => refreshAll(filters)} type="button" variant="secondary">
              Tải lại
            </Button>
          }
          message={listError}
          title="Không thể tải feedback"
        />
      ) : items.length === 0 ? (
        <FeedbackEmptyState onReset={resetFilters} />
      ) : (
        <>
          <FeedbackTable
            capabilities={capabilities}
            items={items}
            onSelect={selectItem}
            selectedId={selectedId}
          />
          <FeedbackCardList
            capabilities={capabilities}
            items={items}
            onSelect={selectItem}
            selectedId={selectedId}
          />
        </>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">
            Trang {filters.page} / {totalPages} · {total} mục
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
      ) : null}

      <FeedbackDetailPanel
        capabilities={capabilities}
        feedbackId={selectedId}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedId(null);
          applyFilters({ selectedFeedbackId: undefined }, true);
        }}
        onUpdated={() => refreshAll(filters)}
        open={drawerOpen}
      />
    </div>
  );
}
