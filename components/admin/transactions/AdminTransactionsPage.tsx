"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { TransactionCardList } from "@/components/admin/transactions/TransactionCardList";
import { TransactionDetailDrawer } from "@/components/admin/transactions/TransactionDetailDrawer";
import { TransactionEmptyState } from "@/components/admin/transactions/TransactionEmptyState";
import { TransactionFilters } from "@/components/admin/transactions/TransactionFilters";
import { TransactionKpiCards } from "@/components/admin/transactions/TransactionKpiCards";
import { TransactionTable } from "@/components/admin/transactions/TransactionTable";
import { Button, ErrorState } from "@/components/ui";
import { listAdminTransactions } from "@/lib/admin/transactions/get-admin-transactions";
import { exportTransactionsToCsv } from "@/lib/admin/transactions/export-transactions-csv";
import { loadAdminTransactionDetailAction } from "@/lib/admin/transactions/get-transaction-detail";
import {
  buildTransactionFilterQuery,
  getDefaultTransactionFilters
} from "@/lib/admin/transactions/parse-transaction-filters";
import type {
  AdminTransactionDetail,
  AdminTransactionListRow,
  TransactionDashboardFilters,
  TransactionKpiSummary
} from "@/types/admin-transaction";

type Props = {
  initialFilters: TransactionDashboardFilters;
  initialRows: AdminTransactionListRow[];
  initialTotal: number;
  summary: TransactionKpiSummary;
  loadError?: string | null;
  canCreateRefund?: boolean;
};

export function AdminTransactionsPage({
  initialFilters,
  initialRows,
  initialTotal,
  summary,
  loadError,
  canCreateRefund = false
}: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [searchInput, setSearchInput] = useState(initialFilters.search);
  const [selectedId, setSelectedId] = useState<string | null>(initialFilters.selectedId);
  const [detail, setDetail] = useState<AdminTransactionDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(loadError ?? null);
  const [pending, startTransition] = useTransition();
  const [detailPending, startDetailTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.source !== "all" ||
    filters.startDate.length > 0 ||
    filters.endDate.length > 0 ||
    filters.sort !== "newest";

  const applyFilters = useCallback(
    (patch: Partial<TransactionDashboardFilters>, options?: { push?: boolean }) => {
      const next = { ...filters, ...patch };
      setFilters(next);
      if (options?.push !== false) {
        router.push(`/admin/transactions${buildTransactionFilterQuery(next)}`);
      }
      startTransition(async () => {
        setListError(null);
        const result = await listAdminTransactions(next);
        if (result.error) {
          setListError(result.error);
          return;
        }
        setRows(result.rows);
        setTotal(result.total);
      });
    },
    [filters, router]
  );

  const resetFilters = useCallback(() => {
    const next = getDefaultTransactionFilters(filters.pageSize);
    setSearchInput("");
    setFilters(next);
    setSelectedId(null);
    setDetail(null);
    router.push("/admin/transactions");
    startTransition(async () => {
      const result = await listAdminTransactions(next);
      if (!result.error) {
        setRows(result.rows);
        setTotal(result.total);
      }
    });
  }, [filters.pageSize, router]);

  const syncSelectedIdToUrl = useCallback(
    (id: string | null) => {
      const next = { ...filters, selectedId: id };
      router.push(`/admin/transactions${buildTransactionFilterQuery(next)}`, { scroll: false });
      setFilters(next);
    },
    [filters, router]
  );

  const openDetail = useCallback(
    (id: string) => {
      setSelectedId(id);
      syncSelectedIdToUrl(id);
      startDetailTransition(async () => {
        setDetailError(null);
        const result = await loadAdminTransactionDetailAction(id);
        if (result.error) {
          setDetailError(result.error);
          setDetail(null);
          return;
        }
        setDetail(result.data);
      });
    },
    [syncSelectedIdToUrl]
  );

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    syncSelectedIdToUrl(null);
  }, [syncSelectedIdToUrl]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput !== filters.search) {
        applyFilters({ search: searchInput, page: 1 });
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, filters.search, applyFilters]);

  useEffect(() => {
    if (!initialFilters.selectedId || detail || detailPending) return;
    void loadAdminTransactionDetailAction(initialFilters.selectedId).then((result) => {
      if (result.error) {
        setDetailError(result.error);
        return;
      }
      setSelectedId(initialFilters.selectedId);
      setDetail(result.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin"
        >
          ← Admin
        </Link>
        <p className="mt-5 text-sm font-medium uppercase tracking-wide text-cyan-300">Admin</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-white">Giao dịch</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
          Theo dõi toàn bộ giao dịch coin, thanh toán, hoàn tiền, payout và điều chỉnh ví trên
          ChapMee.
        </p>
      </div>

      <TransactionKpiCards
        onFilterNeedsReview={() => applyFilters({ status: "needs_review", page: 1 })}
        summary={summary}
      />

      <TransactionFilters
        filters={filters}
        onApply={() => applyFilters({ page: 1 })}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        onReset={resetFilters}
        onSearchChange={setSearchInput}
        pending={pending}
        searchInput={searchInput}
      />

      {listError ? <ErrorState message={listError} title="Không tải được giao dịch" /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          {total.toLocaleString("vi-VN")} giao dịch
          {hasActiveFilters ? " (đã lọc)" : ""}
        </p>
        <Button
          disabled={rows.length === 0}
          onClick={() => exportTransactionsToCsv(rows)}
          type="button"
          variant="ghost"
        >
          Xuất CSV
        </Button>
      </div>

      {rows.length === 0 ? (
        <TransactionEmptyState
          onReset={resetFilters}
          onViewAll={() => resetFilters()}
        />
      ) : (
        <>
          <TransactionTable onSelect={openDetail} rows={rows} />
          <TransactionCardList onSelect={openDetail} rows={rows} />
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
        <p className="text-sm text-zinc-400">
          Trang {filters.page} / {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            disabled={filters.page <= 1 || pending}
            onClick={() => applyFilters({ page: filters.page - 1 })}
            type="button"
            variant="ghost"
          >
            Trước
          </Button>
          <Button
            disabled={filters.page >= totalPages || pending}
            onClick={() => applyFilters({ page: filters.page + 1 })}
            type="button"
            variant="ghost"
          >
            Sau
          </Button>
        </div>
      </div>

      <TransactionDetailDrawer
        canCreateRefund={canCreateRefund}
        detail={detail}
        error={detailError}
        loading={detailPending}
        onClose={closeDetail}
        open={Boolean(selectedId)}
      />
    </section>
  );
}
