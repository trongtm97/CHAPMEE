"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { WithdrawalCardList } from "@/components/admin/withdrawals/WithdrawalCardList";
import { WithdrawalDetailDrawer } from "@/components/admin/withdrawals/WithdrawalDetailDrawer";
import { WithdrawalEmptyState } from "@/components/admin/withdrawals/WithdrawalEmptyState";
import { WithdrawalFilters } from "@/components/admin/withdrawals/WithdrawalFilters";
import { WithdrawalKpiCards } from "@/components/admin/withdrawals/WithdrawalKpiCards";
import { WithdrawalTable } from "@/components/admin/withdrawals/WithdrawalTable";
import {
  WithdrawalActionModals,
  type WithdrawalModalState
} from "@/components/admin/withdrawals/WithdrawalActionModals";
import { Button, ErrorState } from "@/components/ui";
import { listAdminWithdrawals } from "@/lib/admin/withdrawals/list-admin-withdrawals";
import { loadAdminWithdrawalDetailAction } from "@/lib/admin/withdrawals/get-withdrawal-detail";
import { processWithdrawalRequest } from "@/lib/admin/process-withdrawal-request";
import {
  buildWithdrawalFilterQuery,
  getDefaultWithdrawalFilters
} from "@/lib/admin/withdrawals/parse-withdrawal-filters";
import type {
  AdminWithdrawalDetail,
  AdminWithdrawalListRow,
  WithdrawalAdminAction,
  WithdrawalDashboardFilters,
  WithdrawalKpiSummary
} from "@/types/admin-withdrawal";

type Props = {
  initialFilters: WithdrawalDashboardFilters;
  initialRows: AdminWithdrawalListRow[];
  initialTotal: number;
  summary: WithdrawalKpiSummary;
  initialDetail?: AdminWithdrawalDetail | null;
  loadError?: string | null;
};

export function AdminWithdrawalsPage({
  initialFilters,
  initialRows,
  initialTotal,
  summary,
  initialDetail = null,
  loadError
}: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [searchInput, setSearchInput] = useState(initialFilters.search);
  const [selectedId, setSelectedId] = useState<string | null>(initialFilters.selectedId);
  const [detail, setDetail] = useState<AdminWithdrawalDetail | null>(initialDetail);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(loadError ?? null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [modal, setModal] = useState<WithdrawalModalState>(null);
  const [pending, startTransition] = useTransition();
  const [detailPending, startDetailTransition] = useTransition();
  const [actionPending, startActionTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const applyFilters = useCallback(
    (patch: Partial<WithdrawalDashboardFilters>, options?: { push?: boolean }) => {
      const next = { ...filters, ...patch };
      setFilters(next);
      if (options?.push !== false) {
        router.push(`/admin/withdrawals${buildWithdrawalFilterQuery(next)}`);
      }
      startTransition(async () => {
        setListError(null);
        const result = await listAdminWithdrawals(next);
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
    const next = getDefaultWithdrawalFilters(filters.pageSize);
    setSearchInput("");
    setFilters(next);
    setSelectedId(null);
    setDetail(null);
    router.push("/admin/withdrawals");
    startTransition(async () => {
      const result = await listAdminWithdrawals(next);
      if (!result.error) {
        setRows(result.rows);
        setTotal(result.total);
      }
    });
  }, [filters.pageSize, router]);

  const syncSelectedIdToUrl = useCallback(
    (id: string | null) => {
      const next = { ...filters, selectedId: id };
      router.push(`/admin/withdrawals${buildWithdrawalFilterQuery(next)}`, { scroll: false });
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
        const result = await loadAdminWithdrawalDetailAction(id);
        if (result.error) {
          setDetailError(result.error);
          setDetail(null);
          return;
        }
        setDetail(result.detail);
      });
    },
    [syncSelectedIdToUrl]
  );

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    syncSelectedIdToUrl(null);
  }, [syncSelectedIdToUrl]);

  function openActionModal(action: WithdrawalAdminAction) {
    if (!detail) return;
    if (action === "risk_review" || action === "return_to_approved") {
      runAction(action, {});
      return;
    }
    setModal({
      action,
      requestId: detail.id,
      withdrawalCode: detail.withdrawalCode
    });
  }

  function runAction(
    action: WithdrawalAdminAction,
    payload: {
      rejectReason?: string;
      paymentReference?: string;
      paidAt?: string;
      adminNote?: string;
    }
  ) {
    if (!detail) return;
    setActionError(null);
    setActionMsg(null);
    startActionTransition(async () => {
      const result = await processWithdrawalRequest({
        requestId: detail.id,
        action,
        ...payload
      });
      if (!result.ok) {
        setActionError(result.error ?? "Không thể cập nhật.");
        return;
      }
      setModal(null);
      setActionMsg("Đã cập nhật yêu cầu rút tiền.");
      router.refresh();
      const listResult = await listAdminWithdrawals(filters);
      if (!listResult.error) {
        setRows(listResult.rows);
        setTotal(listResult.total);
      }
      const detailResult = await loadAdminWithdrawalDetailAction(detail.id);
      if (!detailResult.error) {
        setDetail(detailResult.detail);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link className="text-sm font-semibold text-cyan-300" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-white">Yêu cầu rút tiền</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Duyệt, xử lý và ghi nhận thanh toán rút tiền cho tác giả.
        </p>
      </div>

      <WithdrawalKpiCards
        onFilterStatus={(status) => {
          setSearchInput("");
          applyFilters({
            status: status as WithdrawalDashboardFilters["status"],
            search: "",
            page: 1
          });
        }}
        summary={summary}
      />

      <WithdrawalFilters
        filters={filters}
        onApply={() => applyFilters({ search: searchInput, page: 1 })}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        onReset={resetFilters}
        onSearchChange={setSearchInput}
        pending={pending}
        searchInput={searchInput}
      />

      {listError ? <ErrorState message={listError} title="Không tải được danh sách" variant="danger" /> : null}
      {actionError ? <p className="text-sm text-rose-300">{actionError}</p> : null}
      {actionMsg ? <p className="text-sm text-emerald-300">{actionMsg}</p> : null}

      {rows.length === 0 && !pending ? (
        <WithdrawalEmptyState />
      ) : (
        <>
          <WithdrawalTable onSelect={openDetail} rows={rows} selectedId={selectedId} />
          <WithdrawalCardList onSelect={openDetail} rows={rows} selectedId={selectedId} />
        </>
      )}

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-400">
          <span>
            Trang {filters.page}/{totalPages} · {total} yêu cầu
          </span>
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

      <WithdrawalDetailDrawer
        detail={detail}
        error={detailError}
        loading={detailPending}
        onAction={openActionModal}
        onClose={closeDetail}
        open={Boolean(selectedId)}
        pending={actionPending}
      />

      <WithdrawalActionModals
        modal={modal}
        onClose={() => setModal(null)}
        onConfirm={(payload) => {
          if (modal) runAction(modal.action, payload);
        }}
        pending={actionPending}
      />
    </div>
  );
}
