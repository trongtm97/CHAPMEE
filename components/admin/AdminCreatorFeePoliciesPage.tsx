"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { CreatorFeePolicyActionModals } from "@/components/admin/creator-fee-policies/CreatorFeePolicyActionModals";
import { CreatorFeePolicyCreateModal } from "@/components/admin/creator-fee-policies/CreatorFeePolicyCreateModal";
import { CreatorFeePolicyDetailDrawer } from "@/components/admin/creator-fee-policies/CreatorFeePolicyDetailDrawer";
import { CreatorFeePolicyEmptyState } from "@/components/admin/creator-fee-policies/CreatorFeePolicyEmptyState";
import { CreatorFeePolicyFilters } from "@/components/admin/creator-fee-policies/CreatorFeePolicyFilters";
import { CreatorFeePolicyKpiCards } from "@/components/admin/creator-fee-policies/CreatorFeePolicyKpiCards";
import {
  CreatorFeePolicyCardList,
  CreatorFeePolicyTable,
  type CreatorFeePolicyRowAction
} from "@/components/admin/creator-fee-policies/CreatorFeePolicyTable";
import { Button, ErrorState } from "@/components/ui";
import {
  buildCreatorFeePolicyFilterQuery,
  getDefaultCreatorFeePolicyFilters
} from "@/lib/admin/creator-fee-policies/filters";
import { listCreatorFeePoliciesAction } from "@/lib/admin/creator-fee-policies/list-policies";
import { exportCreatorFeePoliciesCsvAction } from "@/lib/admin/creator-fee-policies/list-policies";
import { getCreatorFeePolicyStatsAction } from "@/lib/admin/creator-fee-policies/preview-policy";
import { duplicateCreatorFeePolicyAction } from "@/lib/admin/creator-fee-policies/policy-status-actions";
import type {
  CreatorFeePolicyAdminCapabilities,
  CreatorFeePolicyDashboardFilters,
  CreatorFeePolicyKpiSummary,
  CreatorFeePolicyListRow,
  CreatorFeePolicyModalState
} from "@/types/admin-creator-fee-policy";
import type { CreatorFeeSourceRates } from "@/types/creator-fee-policy";

type Props = {
  initialFilters: CreatorFeePolicyDashboardFilters;
  initialRows: CreatorFeePolicyListRow[];
  initialTotal: number;
  summary: CreatorFeePolicyKpiSummary;
  capabilities: CreatorFeePolicyAdminCapabilities;
  defaultRates: CreatorFeeSourceRates;
  loadError?: string | null;
};

export function AdminCreatorFeePoliciesPage({
  initialFilters,
  initialRows,
  initialTotal,
  summary: initialSummary,
  capabilities,
  defaultRates,
  loadError
}: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [summary, setSummary] = useState(initialSummary);
  const [searchInput, setSearchInput] = useState(initialFilters.search);
  const [listError, setListError] = useState<string | null>(loadError ?? null);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<CreatorFeePolicyModalState>(null);
  const [createOpen, setCreateOpen] = useState(initialFilters.createMode);
  const [drawerPolicyId, setDrawerPolicyId] = useState<string | null>(
    initialFilters.selectedPolicyId
  );
  const [drawerEdit, setDrawerEdit] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"summary" | "editor" | "history">("summary");
  const [showAuditPanel, setShowAuditPanel] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (initialFilters.createMode && capabilities.canCreate) {
      setCreateOpen(true);
    }
  }, [initialFilters.createMode, capabilities.canCreate]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const refreshAll = useCallback(
    (next: CreatorFeePolicyDashboardFilters) => {
      startTransition(async () => {
        setListError(null);
        const [listResult, statsResult] = await Promise.all([
          listCreatorFeePoliciesAction(next),
          getCreatorFeePolicyStatsAction()
        ]);
        if (listResult.error) {
          setListError(listResult.error);
          return;
        }
        setRows(listResult.rows);
        setTotal(listResult.total);
        if (statsResult.data) setSummary(statsResult.data);
      });
    },
    []
  );

  const applyFilters = useCallback(
    (patch?: Partial<CreatorFeePolicyDashboardFilters>, options?: { push?: boolean }) => {
      const next = {
        ...filters,
        ...patch,
        search: patch?.search ?? filters.search
      };
      if (patch?.search === undefined && searchInput !== filters.search) {
        next.search = searchInput;
      }
      setFilters(next);
      if (options?.push !== false) {
        router.push(`/admin/creator-fee-policies${buildCreatorFeePolicyFilterQuery(next)}`);
      }
      refreshAll(next);
    },
    [filters, refreshAll, router, searchInput]
  );

  const resetFilters = useCallback(() => {
    const next = getDefaultCreatorFeePolicyFilters(filters.pageSize);
    setSearchInput("");
    setFilters(next);
    router.push("/admin/creator-fee-policies");
    refreshAll(next);
  }, [filters.pageSize, refreshAll, router]);

  function handleRowAction(action: CreatorFeePolicyRowAction, row: CreatorFeePolicyListRow) {
    if (action === "view") {
      setDrawerPolicyId(row.id);
      setDrawerEdit(false);
      setDrawerTab("summary");
      applyFilters({ selectedPolicyId: row.id }, { push: true });
      return;
    }
    if (action === "edit") {
      setDrawerPolicyId(row.id);
      setDrawerEdit(true);
      setDrawerTab("editor");
      applyFilters({ selectedPolicyId: row.id }, { push: true });
      return;
    }
    if (action === "history") {
      setDrawerPolicyId(row.id);
      setDrawerTab("history");
      applyFilters({ selectedPolicyId: row.id }, { push: true });
      return;
    }
    if (action === "pause") {
      setModal({ type: "pause", policyId: row.id, policyName: row.policyName });
      return;
    }
    if (action === "revoke") {
      setModal({ type: "revoke", policyId: row.id, policyName: row.policyName });
      return;
    }
    if (action === "duplicate") {
      startTransition(async () => {
        const result = await duplicateCreatorFeePolicyAction(row.id);
        if (!result.ok) {
          setToast(result.error ?? "Không thể nhân bản.");
          return;
        }
        setToast("Đã nhân bản chính sách (trạng thái nháp).");
        refreshAll(filters);
      });
    }
  }

  function exportCsv() {
    startTransition(async () => {
      const result = await exportCreatorFeePoliciesCsvAction(filters);
      if (result.error || !result.csv) {
        setToast(result.error ?? "Không thể xuất CSV.");
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `creator-fee-policies-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setToast("Đã xuất CSV.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <nav className="text-sm text-zinc-500">
          <Link className="hover:text-zinc-300" href="/admin">
            Admin
          </Link>
          <span className="mx-2">/</span>
          <Link className="hover:text-zinc-300" href="/admin/finance">
            Tài chính
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">Chính sách phí tác giả</span>
        </nav>
        <Link
          className="shrink-0 text-xs font-medium text-cyan-300/90 transition hover:text-cyan-200"
          href="/admin/monetization-settings"
        >
          Về cấu hình kiếm tiền →
        </Link>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-white">Chính sách phí tác giả</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Thiết lập tỷ lệ chia doanh thu riêng cho từng tác giả. Giao dịch mới lưu snapshot; giao
            dịch cũ không thay đổi khi đổi policy.
          </p>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-2 self-start lg:self-center">
          {capabilities.canCreate ? (
            <Button className="whitespace-nowrap" onClick={() => setCreateOpen(true)} type="button">
              + Tạo policy
            </Button>
          ) : null}
          {capabilities.canExport ? (
            <Button
              className="whitespace-nowrap"
              disabled={pending}
              onClick={exportCsv}
              type="button"
              variant="secondary"
            >
              Xuất CSV
            </Button>
          ) : null}
          {capabilities.canViewAudit ? (
            <Button
              className="whitespace-nowrap"
              onClick={() => setShowAuditPanel((v) => !v)}
              type="button"
              variant="secondary"
            >
              {showAuditPanel ? "Ẩn audit" : "Audit log"}
            </Button>
          ) : null}
        </div>
      </div>

      <CreatorFeePolicyKpiCards
        onFilterStatus={(status) => applyFilters({ status: status as CreatorFeePolicyDashboardFilters["status"], page: 1 })}
        summary={summary}
      />

      <CreatorFeePolicyFilters
        filters={filters}
        onApply={applyFilters}
        onReset={resetFilters}
        onSearchInputChange={setSearchInput}
        pending={pending}
        searchInput={searchInput}
      />

      {toast ? (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {toast}
        </div>
      ) : null}

      {listError ? (
        <ErrorState
          action={
            <Button disabled={pending} onClick={() => refreshAll(filters)} type="button" variant="secondary">
              Tải lại
            </Button>
          }
          message={listError}
          title="Không thể tải chính sách phí. Vui lòng thử lại."
        />
      ) : rows.length === 0 ? (
        <CreatorFeePolicyEmptyState
          capabilities={capabilities}
          onCreate={() => setCreateOpen(true)}
        />
      ) : (
        <>
          <CreatorFeePolicyTable
            capabilities={capabilities}
            onAction={handleRowAction}
            rows={rows}
            selectedId={drawerPolicyId}
          />
          <CreatorFeePolicyCardList
            capabilities={capabilities}
            onAction={handleRowAction}
            rows={rows}
            selectedId={drawerPolicyId}
          />
        </>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            disabled={filters.page <= 1 || pending}
            onClick={() => applyFilters({ page: filters.page - 1 })}
            type="button"
            variant="secondary"
          >
            Trước
          </Button>
          <span className="text-sm text-zinc-400">
            Trang {filters.page}/{totalPages} · {total} policy
          </span>
          <Button
            disabled={filters.page >= totalPages || pending}
            onClick={() => applyFilters({ page: filters.page + 1 })}
            type="button"
            variant="secondary"
          >
            Sau
          </Button>
        </div>
      ) : null}

      {showAuditPanel && capabilities.canViewAudit ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
          Audit log chi tiết hiển thị trong tab Lịch sử của từng policy. Mọi thao tác create/update/
          pause/resume/revoke/export đều được ghi vào admin_audit_logs.
        </div>
      ) : null}

      <CreatorFeePolicyDetailDrawer
        capabilities={capabilities}
        editMode={drawerEdit}
        initialTab={drawerTab}
        onClose={() => {
          setDrawerPolicyId(null);
          applyFilters({ selectedPolicyId: null }, { push: true });
        }}
        onRefresh={() => refreshAll(filters)}
        open={Boolean(drawerPolicyId)}
        policyId={drawerPolicyId}
      />

      <CreatorFeePolicyCreateModal
        defaultRates={defaultRates}
        onClose={() => {
          setCreateOpen(false);
          applyFilters({ createMode: false, selectedCreatorId: null }, { push: true });
        }}
        onSuccess={() => {
          setToast("Đã tạo chính sách phí.");
          refreshAll(filters);
        }}
        open={createOpen}
        preselectedCreatorId={filters.selectedCreatorId}
      />

      <CreatorFeePolicyActionModals
        modal={modal}
        onClose={() => setModal(null)}
        onError={(msg) => setToast(msg)}
        onSuccess={(msg) => {
          setToast(msg);
          refreshAll(filters);
        }}
      />
    </div>
  );
}
