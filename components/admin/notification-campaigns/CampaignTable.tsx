"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  CampaignStatusBadge,
  CampaignTypeBadge,
  formatCampaignDate
} from "@/components/admin/notification-campaigns/CampaignBadges";
import { CampaignEmptyState } from "@/components/admin/notification-campaigns/CampaignEmptyState";
import { ConfirmActionModal } from "@/components/admin/campaigns/ConfirmActionModal";
import {
  deleteNotificationCampaignAction,
  duplicateNotificationCampaignAction,
  testSendNotificationCampaignAction,
  updateNotificationCampaignStatusAction
} from "@/lib/admin/notification-campaign-actions";
import { formatCampaignChannels, formatCampaignTargetSummary } from "@/lib/platform-content/parse-notification-campaign-filters";
import type { AdminNotificationCampaignCapabilities } from "@/types/admin-notification-campaigns";
import type { NotificationCampaign } from "@/types/platform-content";

type Props = {
  items: NotificationCampaign[];
  capabilities: AdminNotificationCampaignCapabilities;
  hasFilters: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onClearFilters: () => void;
  onRefresh?: () => void;
  onToast?: (message: string) => void;
};

type ConfirmState =
  | { kind: "delete"; id: string }
  | { kind: "pause"; id: string }
  | { kind: "cancel"; id: string }
  | null;

export function CampaignTable({
  items,
  capabilities,
  hasFilters,
  selectedIds,
  onSelectionChange,
  onClearFilters,
  onRefresh,
  onToast
}: Props) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggleOne(id: string) {
    if (selectedSet.has(id)) {
      onSelectionChange(selectedIds.filter((value) => value !== id));
      return;
    }
    onSelectionChange([...selectedIds, id]);
  }

  function toggleAllPage() {
    if (allSelected) {
      const pageIds = new Set(items.map((item) => item.id));
      onSelectionChange(selectedIds.filter((id) => !pageIds.has(id)));
      return;
    }
    onSelectionChange([...new Set([...selectedIds, ...items.map((item) => item.id)])]);
  }

  function runAction(fn: () => Promise<{ ok: boolean; message: string | null }>) {
    startTransition(async () => {
      const result = await fn();
      onToast?.(result.message ?? "");
      if (result.ok) onRefresh?.();
      setConfirm(null);
      setOpenMenuId(null);
    });
  }

  if (items.length === 0) {
    return (
      <CampaignEmptyState
        canCreate={capabilities.canCreate}
        hasFilters={hasFilters}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-white/10 lg:block">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-zinc-950/80 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">
                <input
                  aria-label="Chọn tất cả trang"
                  checked={allSelected}
                  className="h-4 w-4 rounded border-white/20 bg-zinc-950"
                  onChange={toggleAllPage}
                  type="checkbox"
                />
              </th>
              <th className="px-3 py-3">Campaign</th>
              <th className="px-3 py-3">Loại</th>
              <th className="px-3 py-3">Kênh</th>
              <th className="px-3 py-3">Đối tượng</th>
              <th className="px-3 py-3">Người nhận</th>
              <th className="px-3 py-3">Trạng thái</th>
              <th className="px-3 py-3">Thời gian</th>
              <th className="px-3 py-3">Hiệu quả</th>
              <th className="px-3 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-zinc-950/40 text-zinc-200">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-3">
                  <input
                    aria-label={`Chọn ${item.name ?? item.title}`}
                    checked={selectedSet.has(item.id)}
                    className="h-4 w-4 rounded border-white/20 bg-zinc-950"
                    onChange={() => toggleOne(item.id)}
                    type="checkbox"
                  />
                </td>
                <td className="max-w-[220px] px-3 py-3">
                  <p className="truncate font-medium text-white">{item.name ?? item.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{item.message}</p>
                </td>
                <td className="px-3 py-3">
                  <CampaignTypeBadge type={item.notification_type} />
                </td>
                <td className="px-3 py-3 text-xs text-zinc-400">
                  {formatCampaignChannels(item)}
                </td>
                <td className="px-3 py-3 text-xs text-violet-200">
                  {formatCampaignTargetSummary(item)}
                </td>
                <td className="px-3 py-3 text-zinc-300">{item.estimated_recipient_count}</td>
                <td className="px-3 py-3">
                  <CampaignStatusBadge status={item.status} />
                </td>
                <td className="px-3 py-3 text-xs text-zinc-400">
                  <div>Tạo: {formatCampaignDate(item.created_at)}</div>
                  {item.scheduled_at ? <div>Lịch: {formatCampaignDate(item.scheduled_at)}</div> : null}
                  {item.sent_at ? <div>Gửi: {formatCampaignDate(item.sent_at)}</div> : null}
                </td>
                <td className="px-3 py-3 text-xs text-zinc-400">
                  {item.delivery_stats ? (
                    <>
                      <div>Mở: {item.delivery_stats.open_rate}%</div>
                      {item.href ? <div>Click: {item.delivery_stats.click_rate}%</div> : null}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="relative px-3 py-3">
                  <button
                    className="rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-300 hover:bg-white/5"
                    onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                    type="button"
                  >
                    ⋯
                  </button>
                  {openMenuId === item.id ? (
                    <div className="absolute right-3 z-20 mt-1 w-44 rounded-xl border border-white/10 bg-zinc-950 py-1 shadow-xl">
                      {capabilities.canView ? (
                        <Link
                          className="block px-3 py-2 text-xs text-zinc-200 hover:bg-white/5"
                          href={`/admin/notifications/${item.id}`}
                        >
                          Xem chi tiết
                        </Link>
                      ) : null}
                      {capabilities.canUpdate && item.status !== "sent" && item.status !== "sending" ? (
                        <Link
                          className="block px-3 py-2 text-xs text-zinc-200 hover:bg-white/5"
                          href={`/admin/notifications/${item.id}`}
                        >
                          Sửa
                        </Link>
                      ) : null}
                      {capabilities.canCreate ? (
                        <button
                          className="block w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/5"
                          disabled={pending}
                          onClick={() =>
                            runAction(() => duplicateNotificationCampaignAction(item.id))
                          }
                          type="button"
                        >
                          Nhân bản
                        </button>
                      ) : null}
                      {capabilities.canSend ? (
                        <button
                          className="block w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/5"
                          disabled={pending}
                          onClick={() =>
                            runAction(() =>
                              testSendNotificationCampaignAction({ campaignId: item.id })
                            )
                          }
                          type="button"
                        >
                          Gửi test
                        </button>
                      ) : null}
                      {capabilities.canPause &&
                      (item.status === "scheduled" || item.status === "sending") ? (
                        <button
                          className="block w-full px-3 py-2 text-left text-xs text-amber-100 hover:bg-white/5"
                          disabled={pending}
                          onClick={() => setConfirm({ kind: "pause", id: item.id })}
                          type="button"
                        >
                          Tạm dừng
                        </button>
                      ) : null}
                      {capabilities.canCancel &&
                      !["sent", "cancelled", "archived"].includes(item.status) ? (
                        <button
                          className="block w-full px-3 py-2 text-left text-xs text-red-100 hover:bg-white/5"
                          disabled={pending}
                          onClick={() => setConfirm({ kind: "cancel", id: item.id })}
                          type="button"
                        >
                          Hủy
                        </button>
                      ) : null}
                      {capabilities.canDelete && item.status === "draft" ? (
                        <button
                          className="block w-full px-3 py-2 text-left text-xs text-red-100 hover:bg-white/5"
                          disabled={pending}
                          onClick={() => setConfirm({ kind: "delete", id: item.id })}
                          type="button"
                        >
                          Xóa nháp
                        </button>
                      ) : null}
                      {capabilities.canAuditView ? (
                        <Link
                          className="block px-3 py-2 text-xs text-zinc-200 hover:bg-white/5"
                          href={`/admin/notifications/${item.id}#audit`}
                        >
                          Xem log
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {items.map((item) => (
          <article
            className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4"
            key={item.id}
          >
            <div className="flex items-start gap-3">
              <input
                checked={selectedSet.has(item.id)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-zinc-950"
                onChange={() => toggleOne(item.id)}
                type="checkbox"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CampaignStatusBadge status={item.status} />
                  <CampaignTypeBadge type={item.notification_type} />
                </div>
                <h3 className="font-semibold text-white">{item.name ?? item.title}</h3>
                <p className="line-clamp-2 text-sm text-zinc-400">{item.message}</p>
                <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span>{formatCampaignTargetSummary(item)}</span>
                  <span>{item.estimated_recipient_count} người nhận</span>
                </div>
                {capabilities.canView ? (
                  <Link
                    className="inline-flex text-sm font-semibold text-cyan-300"
                    href={`/admin/notifications/${item.id}`}
                  >
                    Chi tiết →
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {confirm?.kind === "delete" ? (
        <ConfirmActionModal
          confirmLabel="Xóa nháp"
          description="Campaign nháp sẽ bị xóa vĩnh viễn."
          onClose={() => setConfirm(null)}
          onConfirm={() => runAction(() => deleteNotificationCampaignAction(confirm.id))}
          open
          pending={pending}
          title="Xóa campaign nháp?"
          variant="danger"
        />
      ) : null}

      {confirm?.kind === "pause" ? (
        <ConfirmActionModal
          confirmLabel="Tạm dừng"
          description="Campaign sẽ chuyển sang trạng thái tạm dừng."
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            runAction(() =>
              updateNotificationCampaignStatusAction({ id: confirm.id, status: "paused" })
            )
          }
          open
          pending={pending}
          title="Tạm dừng campaign?"
          variant="primary"
        />
      ) : null}

      {confirm?.kind === "cancel" ? (
        <ConfirmActionModal
          confirmLabel="Hủy campaign"
          description="Campaign sẽ bị hủy và không thể gửi."
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            runAction(() =>
              updateNotificationCampaignStatusAction({ id: confirm.id, status: "cancelled" })
            )
          }
          open
          pending={pending}
          title="Hủy campaign?"
          variant="danger"
        />
      ) : null}
    </>
  );
}
