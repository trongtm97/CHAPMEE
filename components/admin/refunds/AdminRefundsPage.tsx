"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { CreateManualRefundModal } from "@/components/admin/refunds/CreateManualRefundModal";
import { RefundActionModals, type RefundModalState } from "@/components/admin/refunds/RefundActionModals";
import { RefundCardList } from "@/components/admin/refunds/RefundCardList";
import { RefundDetailDrawer } from "@/components/admin/refunds/RefundDetailDrawer";
import { RefundEmptyState } from "@/components/admin/refunds/RefundEmptyState";
import { RefundFilters } from "@/components/admin/refunds/RefundFilters";
import { RefundKpiCards } from "@/components/admin/refunds/RefundKpiCards";
import { RefundTable, type RefundRowAction } from "@/components/admin/refunds/RefundTable";
import { Button, ErrorState } from "@/components/ui";
import { exportRefundsCsv } from "@/lib/admin/refunds/export-refunds-csv";
import { loadRefundDetailByRowId } from "@/lib/admin/refunds/get-refund-detail";
import { listAdminRefunds } from "@/lib/admin/refunds/list-admin-refunds";
import {
  buildRefundFilterQuery,
  getDefaultRefundFilters
} from "@/lib/admin/refunds/refund-labels";
import { completeRefundRecord, transitionRefundStatus } from "@/lib/finance/refunds";
import type {
  AdminRefundDetail,
  AdminRefundListRow,
  RefundAdminCapabilities,
  RefundDashboardFilters,
  RefundKpiSummary
} from "@/types/admin-refund";

type Props = {
  initialFilters: RefundDashboardFilters;
  initialRows: AdminRefundListRow[];
  initialTotal: number;
  summary: RefundKpiSummary;
  capabilities: RefundAdminCapabilities;
  initialDetail?: AdminRefundDetail | null;
  loadError?: string | null;
};

export function AdminRefundsPage({
  initialFilters,
  initialRows,
  initialTotal,
  summary,
  capabilities,
  initialDetail = null,
  loadError
}: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [searchInput, setSearchInput] = useState(initialFilters.search);
  const [selectedRow, setSelectedRow] = useState<AdminRefundListRow | null>(
    initialRows.find((r) => r.id === initialFilters.selectedId) ?? null
  );
  const [detail, setDetail] = useState<AdminRefundDetail | null>(initialDetail);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(loadError ?? null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [modal, setModal] = useState<RefundModalState>(null);
  const [createOpen, setCreateOpen] = useState(initialFilters.createMode);

  useEffect(() => {
    if (initialFilters.createMode && capabilities.canCreate) {
      setCreateOpen(true);
    }
  }, [initialFilters.createMode, capabilities.canCreate]);
  const [pending, startTransition] = useTransition();
  const [detailPending, startDetailTransition] = useTransition();
  const [actionPending, startActionTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const refreshList = useCallback(
    (next: RefundDashboardFilters) => {
      startTransition(async () => {
        setListError(null);
        const result = await listAdminRefunds(next);
        if (result.error) {
          setListError(result.error);
          return;
        }
        setRows(result.rows);
        setTotal(result.total);
      });
    },
    []
  );

  const applyFilters = useCallback(
    (patch: Partial<RefundDashboardFilters>, options?: { push?: boolean }) => {
      const next = { ...filters, ...patch, search: patch.search ?? filters.search };
      if (patch.search === undefined && searchInput !== filters.search) {
        next.search = searchInput;
      }
      setFilters(next);
      if (options?.push !== false) {
        router.push(`/admin/refunds${buildRefundFilterQuery(next)}`);
      }
      refreshList(next);
    },
    [filters, refreshList, router, searchInput]
  );

  const resetFilters = useCallback(() => {
    const next = getDefaultRefundFilters(filters.pageSize);
    setSearchInput("");
    setFilters(next);
    setSelectedRow(null);
    setDetail(null);
    router.push("/admin/refunds");
    refreshList(next);
  }, [filters.pageSize, refreshList, router]);

  const openDetail = useCallback(
    (row: AdminRefundListRow) => {
      setSelectedRow(row);
      const next = { ...filters, selectedId: row.id };
      router.push(`/admin/refunds${buildRefundFilterQuery(next)}`, { scroll: false });
      setFilters(next);
      startDetailTransition(async () => {
        setDetailError(null);
        const result = await loadRefundDetailByRowId(row.refundId, row.kind);
        if (result.error) {
          setDetailError(result.error);
          return;
        }
        setDetail(result.detail);
      });
    },
    [filters, router]
  );

  const closeDetail = useCallback(() => {
    setSelectedRow(null);
    setDetail(null);
    const next = { ...filters, selectedId: null };
    router.push(`/admin/refunds${buildRefundFilterQuery(next)}`, { scroll: false });
    setFilters(next);
  }, [filters, router]);

  const runAction = useCallback(
    (action: RefundRowAction, row: AdminRefundListRow, payload?: { reason?: string; internalNote?: string }) => {
      if (row.kind !== "refund") return;
      startActionTransition(async () => {
        setActionError(null);
        setActionMsg(null);
        let result: { ok: boolean; error: string | null };

        switch (action) {
          case "approve":
            result = await transitionRefundStatus({ refundId: row.refundId, status: "approved" });
            break;
          case "reject":
            result = await transitionRefundStatus({
              refundId: row.refundId,
              status: "rejected",
              reason: payload?.reason,
              internalNote: payload?.internalNote
            });
            break;
          case "processing":
            result = await transitionRefundStatus({ refundId: row.refundId, status: "processing" });
            break;
          case "complete":
            result = await completeRefundRecord(row.refundId);
            break;
          case "failed":
            result = await transitionRefundStatus({
              refundId: row.refundId,
              status: "failed",
              reason: payload?.reason,
              internalNote: payload?.internalNote
            });
            break;
          default:
            return;
        }

        if (!result.ok) {
          setActionError(result.error);
          return;
        }
        setActionMsg("Đã cập nhật trạng thái hoàn tiền.");
        setModal(null);
        refreshList(filters);
        if (selectedRow?.id === row.id) {
          const detailResult = await loadRefundDetailByRowId(row.refundId, row.kind);
          if (detailResult.detail) setDetail(detailResult.detail);
        }
      });
    },
    [filters, refreshList, selectedRow]
  );

  const handleExport = useCallback(() => {
    startTransition(async () => {
      const result = await exportRefundsCsv(filters);
      if (result.error) {
        setListError(result.error);
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `refunds-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }, [filters]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin">
            ← Admin
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-normal text-white">Hoàn tiền</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Quản lý hoàn coin, hoàn tiền, hoàn giao dịch và xử lý khiếu nại tài chính.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {capabilities.canCreate ? (
            <Button onClick={() => setCreateOpen(true)} type="button">
              Tạo hoàn tiền
            </Button>
          ) : null}
          {capabilities.canExport ? (
            <Button loading={pending} onClick={handleExport} type="button" variant="secondary">
              Xuất danh sách
            </Button>
          ) : null}
          {capabilities.canViewAudit ? (
            <Link href="/admin/audit?action=refund">
              <Button type="button" variant="secondary">
                Nhật ký hoàn tiền
              </Button>
            </Link>
          ) : null}
          <Link href="/admin/monetization-settings">
            <Button type="button" variant="ghost">
              Cấu hình hoàn tiền
            </Button>
          </Link>
        </div>
      </div>

      <RefundKpiCards
        onFilterStatus={(status) => {
          if (status === "quality_low_refund") {
            applyFilters({ refundType: "quality_low_refund", page: 1 });
          } else {
            applyFilters({ status: status as RefundDashboardFilters["status"], page: 1 });
          }
        }}
        summary={summary}
      />

      <RefundFilters
        filters={filters}
        onApply={() => applyFilters({ search: searchInput, page: 1 })}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onReset={resetFilters}
        onSearchChange={setSearchInput}
        pending={pending}
        searchInput={searchInput}
      />

      {listError ? <ErrorState message={listError} title="Lỗi tải danh sách" /> : null}
      {actionError ? <ErrorState message={actionError} title="Lỗi thao tác" variant="danger" /> : null}
      {actionMsg ? (
        <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {actionMsg}
        </p>
      ) : null}

      {rows.length === 0 && !pending ? (
        <RefundEmptyState onCreateManual={capabilities.canCreate ? () => setCreateOpen(true) : undefined} />
      ) : (
        <>
          <RefundTable
            capabilities={capabilities}
            onAction={(action, row) => {
              if (action === "detail") openDetail(row);
              else setModal({ action, row });
            }}
            onSelect={openDetail}
            rows={rows}
            selectedId={selectedRow?.id ?? null}
          />
          <RefundCardList
            capabilities={capabilities}
            onAction={(action, row) => {
              if (action === "detail") openDetail(row);
              else setModal({ action, row });
            }}
            onSelect={openDetail}
            rows={rows}
          />

          <div className="flex items-center justify-between gap-3 text-sm text-zinc-400">
            <p>
              {total} yêu cầu · Trang {filters.page}/{totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                disabled={filters.page <= 1 || pending}
                onClick={() => applyFilters({ page: filters.page - 1 })}
                type="button"
                variant="secondary"
              >
                Trước
              </Button>
              <Button
                disabled={filters.page >= totalPages || pending}
                onClick={() => applyFilters({ page: filters.page + 1 })}
                type="button"
                variant="secondary"
              >
                Sau
              </Button>
            </div>
          </div>
        </>
      )}

      <RefundDetailDrawer
        capabilities={capabilities}
        detail={detail}
        error={detailError}
        loading={detailPending}
        onAction={(action) => {
          if (!selectedRow) return;
          if (action === "add_note") return;
          setModal({ action, row: selectedRow });
        }}
        onAddNote={() => {}}
        onClose={closeDetail}
        open={Boolean(selectedRow)}
        pending={actionPending}
      />

      <RefundActionModals
        modal={modal}
        onClose={() => setModal(null)}
        onConfirm={(payload) => {
          if (!modal) return;
          runAction(modal.action, modal.row, payload);
        }}
        pending={actionPending}
      />

      <CreateManualRefundModal
        initialCoinAmount={0}
        initialTransactionId={initialFilters.prefilledTx}
        initialUserId={initialFilters.prefilledUserId}
        onClose={() => {
          setCreateOpen(false);
          if (initialFilters.createMode) {
            const next = { ...filters, createMode: false, prefilledTx: "", prefilledUserId: "" };
            setFilters(next);
            router.replace(`/admin/refunds${buildRefundFilterQuery(next)}`, { scroll: false });
          }
        }}
        onCreated={() => refreshList(filters)}
        open={createOpen}
      />
    </div>
  );
}
