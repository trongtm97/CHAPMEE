"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { CampaignBulkActionBar } from "@/components/admin/notification-campaigns/CampaignBulkActionBar";
import { CampaignFilters } from "@/components/admin/notification-campaigns/CampaignFilters";
import { CampaignPagination } from "@/components/admin/notification-campaigns/CampaignPagination";
import { CampaignSummaryCards } from "@/components/admin/notification-campaigns/CampaignSummaryCards";
import { CampaignTable } from "@/components/admin/notification-campaigns/CampaignTable";
import { ErrorState } from "@/components/ui";
import {
  getNotificationCampaignStatsForAdminAction,
  listNotificationCampaignsForAdminAction
} from "@/lib/admin/notification-campaign-list-action";
import {
  buildNotificationCampaignListQuery,
  countActiveNotificationCampaignFilters,
  getDefaultNotificationCampaignListFilters
} from "@/lib/platform-content/parse-notification-campaign-filters";
import type { AdminNotificationCampaignCapabilities } from "@/types/admin-notification-campaigns";
import type { NotificationCampaignListFilters } from "@/types/admin-notification-campaigns";
import type { NotificationCampaignStats } from "@/types/admin-notification-campaigns";
import type { NotificationCampaign } from "@/types/platform-content";

type Props = {
  initialFilters: NotificationCampaignListFilters;
  initialItems: NotificationCampaign[];
  initialTotal: number;
  initialStats: NotificationCampaignStats;
  capabilities: AdminNotificationCampaignCapabilities;
  loadError?: string | null;
  embedded?: boolean;
};

export function AdminNotificationCampaignsPage({
  initialFilters,
  initialItems,
  initialTotal,
  initialStats,
  capabilities,
  loadError,
  embedded = false
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
  const hasFilters = countActiveNotificationCampaignFilters(filters) > 0;

  const refreshList = useCallback(
    (next: NotificationCampaignListFilters, push = true) => {
      startTransition(async () => {
        setListError(null);
        const [listResult, statsResult] = await Promise.all([
          listNotificationCampaignsForAdminAction(next),
          getNotificationCampaignStatsForAdminAction()
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
          router.push(`/admin/notifications${buildNotificationCampaignListQuery(next)}`);
        }
      });
    },
    [router]
  );

  if (listError && items.length === 0) {
    return (
      <ErrorState message={listError} title="Không thể tải chiến dịch thông báo" variant="danger" />
    );
  }

  return (
    <div className="space-y-6">
      {!embedded ? (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Notification Campaign</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Gửi thông báo in-app có chọn đối tượng, lịch gửi và kiểm soát trạng thái.
            </p>
          </div>
          {capabilities.canCreate ? (
            <Link
              className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400"
              href="/admin/notifications/new"
            >
              Tạo campaign
            </Link>
          ) : null}
        </header>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
              href="/admin/notifications?status=scheduled"
            >
              Xem lịch gửi
            </Link>
            <Link
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
              href="/admin/notifications"
            >
              Nhật ký gửi
            </Link>
          </div>
          {capabilities.canCreate ? (
            <Link
              className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400"
              href="/admin/notifications/new"
            >
              Tạo campaign
            </Link>
          ) : null}
        </div>
      )}

      <CampaignSummaryCards
        onFilterStatus={(status) => refreshList({ ...filters, status: status as NotificationCampaignListFilters["status"], page: 1 })}
        stats={stats}
      />

      <CampaignFilters
        filters={filters}
        onApply={() => refreshList({ ...filters, search: searchInput.trim(), page: 1 })}
        onChange={(patch) => refreshList({ ...filters, ...patch })}
        onReset={() => {
          setSearchInput("");
          setSelectedIds([]);
          refreshList(getDefaultNotificationCampaignListFilters());
        }}
        onSearchInputChange={setSearchInput}
        pending={pending}
        searchInput={searchInput}
      />

      {toast ? (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
          {toast}
        </div>
      ) : null}

      <CampaignBulkActionBar
        canUpdate={capabilities.canUpdate}
        filters={filters}
        onClearSelection={() => setSelectedIds([])}
        onRefresh={() => refreshList(filters, false)}
        onToast={setToast}
        selectedIds={selectedIds}
      />

      <CampaignTable
        capabilities={capabilities}
        hasFilters={hasFilters}
        items={items}
        onClearFilters={() => {
          setSearchInput("");
          refreshList(getDefaultNotificationCampaignListFilters());
        }}
        onRefresh={() => refreshList(filters, false)}
        onSelectionChange={setSelectedIds}
        onToast={setToast}
        selectedIds={selectedIds}
      />

      {items.length > 0 ? (
        <CampaignPagination
          filters={filters}
          onChange={(patch) => refreshList({ ...filters, ...patch })}
          pending={pending}
          total={total}
          totalPages={totalPages}
        />
      ) : null}
    </div>
  );
}
