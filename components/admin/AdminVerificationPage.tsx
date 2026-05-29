"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { VerificationActionModals } from "@/components/admin/VerificationActionModals";
import { VerificationDetailDrawer } from "@/components/admin/VerificationDetailDrawer";
import { VerificationFilters } from "@/components/admin/VerificationFilters";
import { VerificationSummaryCards } from "@/components/admin/VerificationSummaryCards";
import {
  VerificationEmptyState,
  VerificationErrorState,
  VerificationTable
} from "@/components/admin/VerificationTable";
import { Button } from "@/components/ui";
import { getVerifications } from "@/lib/admin/get-verifications";
import {
  buildVerificationFilterQuery,
  getDefaultVerificationFilters
} from "@/lib/admin/parse-verification-filters";
import type {
  VerificationAdminCapabilities,
  VerificationActionType,
  VerificationDashboardFilters,
  VerificationOperationsSummary
} from "@/types/admin-verification";
import type { AdminVerificationListItem } from "@/types/verification";

type Props = {
  initialFilters: VerificationDashboardFilters;
  initialItems: AdminVerificationListItem[];
  initialTotal: number;
  summary: VerificationOperationsSummary;
  capabilities: VerificationAdminCapabilities;
  loadError?: boolean;
};

export function AdminVerificationPage({
  initialFilters,
  initialItems,
  initialTotal,
  summary,
  capabilities,
  loadError: initialLoadError = false
}: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loadError, setLoadError] = useState(initialLoadError);
  const [searchInput, setSearchInput] = useState(initialFilters.query);
  const [selectedItem, setSelectedItem] = useState<AdminVerificationListItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialFilters.selectedId));
  const [modalAction, setModalAction] = useState<VerificationActionType | null>(null);
  const [pending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const rangeStart = total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1;
  const rangeEnd = Math.min(filters.page * filters.pageSize, total);

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.verificationType !== "all" ||
    filters.source !== "all" ||
    filters.timeRange !== "all" ||
    filters.sort !== "newest" ||
    filters.query.trim().length > 0 ||
    Boolean(filters.summaryCard);

  const reload = useCallback(
    (next: VerificationDashboardFilters) => {
      startTransition(async () => {
        const result = await getVerifications(next);
        if (result.error) {
          setLoadError(true);
          return;
        }
        setLoadError(false);
        setItems(result.items);
        setTotal(result.total);
      });
    },
    []
  );

  const applyFilters = useCallback(
    (patch: Partial<VerificationDashboardFilters>) => {
      const next = { ...filters, ...patch };
      setFilters(next);
      router.push(`/admin/verifications${buildVerificationFilterQuery(next)}`);
      reload(next);
    },
    [filters, reload, router]
  );

  const resetFilters = useCallback(() => {
    const next = getDefaultVerificationFilters(filters.pageSize);
    setSearchInput("");
    setFilters(next);
    router.push("/admin/verifications");
    reload(next);
  }, [filters.pageSize, reload, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput !== filters.query) {
        applyFilters({ query: searchInput, page: 1, summaryCard: null });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, filters.query, applyFilters]);

  useEffect(() => {
    if (!initialFilters.selectedId) return;
    const found = items.find((item) => item.id === initialFilters.selectedId);
    if (found) {
      setSelectedItem(found);
      setDrawerOpen(true);
    }
  }, [initialFilters.selectedId, items]);

  function openView(item: AdminVerificationListItem) {
    setSelectedItem(item);
    setDrawerOpen(true);
    applyFilters({ selectedId: item.id });
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedItem(null);
    applyFilters({ selectedId: null });
  }

  function openAction(item: AdminVerificationListItem, action: VerificationActionType) {
    setSelectedItem(item);
    setModalAction(action);
  }

  function refreshAll() {
    reload(filters);
  }

  const filteredEmpty = hasActiveFilters && items.length === 0 && !loadError;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <VerificationSummaryCards
            activeCard={filters.summaryCard}
            onNavigate={applyFilters}
            summary={summary}
          />
        </div>
        {capabilities.canGrantManual ? (
          <Button className="shrink-0" onClick={() => setModalAction("grant_manual")} type="button">
            + Cấp xác thực thủ công
          </Button>
        ) : null}
      </div>

      <VerificationFilters
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        onChange={applyFilters}
        onReset={resetFilters}
        onSearchChange={setSearchInput}
        searchInput={searchInput}
      />

      {loadError ? (
        <VerificationErrorState onRetry={() => reload(filters)} />
      ) : items.length === 0 ? (
        <VerificationEmptyState filtered={filteredEmpty} />
      ) : (
        <>
          <VerificationTable
            capabilities={capabilities}
            items={items}
            onAction={openAction}
            onView={openView}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
            <p>
              {rangeStart}–{rangeEnd} trong {total} yêu cầu
            </p>
            <div className="flex items-center gap-2">
              <select
                className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-white"
                onChange={(e) =>
                  applyFilters({
                    pageSize: Number(e.target.value) as 25 | 50 | 100,
                    page: 1
                  })
                }
                value={String(filters.pageSize)}
              >
                <option value="25">25 / trang</option>
                <option value="50">50 / trang</option>
                <option value="100">100 / trang</option>
              </select>
              <Button
                disabled={filters.page <= 1 || pending}
                onClick={() => applyFilters({ page: filters.page - 1 })}
                type="button"
                variant="ghost"
              >
                Trước
              </Button>
              <span>
                {filters.page}/{totalPages}
              </span>
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
        </>
      )}

      <VerificationDetailDrawer
        capabilities={capabilities}
        onAction={(action) => {
          if (selectedItem) openAction(selectedItem, action);
        }}
        onClose={closeDrawer}
        onRefresh={refreshAll}
        open={drawerOpen}
        verificationId={selectedItem?.id ?? initialFilters.selectedId}
      />

      <VerificationActionModals
        action={modalAction}
        item={selectedItem}
        onClose={() => setModalAction(null)}
        onSuccess={refreshAll}
      />
    </div>
  );
}
