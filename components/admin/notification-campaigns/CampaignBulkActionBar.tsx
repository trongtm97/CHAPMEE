"use client";

import { useState, useTransition } from "react";
import { ConfirmActionModal } from "@/components/admin/campaigns/ConfirmActionModal";
import {
  bulkUpdateNotificationCampaignStatusAction
} from "@/lib/admin/notification-campaign-actions";
import { exportNotificationCampaignsCsvAction } from "@/lib/admin/notification-campaign-list-action";
import type { NotificationCampaignListFilters } from "@/types/admin-notification-campaigns";
import type { CampaignStatus } from "@/types/platform-content";

type Props = {
  selectedIds: string[];
  filters: NotificationCampaignListFilters;
  onClearSelection: () => void;
  onRefresh: () => void;
  onToast: (message: string) => void;
  canUpdate: boolean;
};

type ConfirmKind = "pause" | "cancel" | "delete" | "archive" | null;

export function CampaignBulkActionBar({
  selectedIds,
  filters,
  onClearSelection,
  onRefresh,
  onToast,
  canUpdate
}: Props) {
  const [pending, startTransition] = useTransition();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);

  if (selectedIds.length === 0) return null;

  function runBulk(status: CampaignStatus, kind: ConfirmKind) {
    startTransition(async () => {
      const result = await bulkUpdateNotificationCampaignStatusAction({
        ids: selectedIds,
        status
      });
      onToast(result.message ?? "");
      if (result.ok) {
        onClearSelection();
        onRefresh();
      }
      setConfirmKind(null);
    });
  }

  function handleExport() {
    startTransition(async () => {
      const result = await exportNotificationCampaignsCsvAction(filters);
      if (result.error) {
        onToast(result.error);
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `notification-campaigns-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      onToast("Đã xuất CSV.");
    });
  }

  const confirmLabels: Record<Exclude<ConfirmKind, null>, { title: string; description: string; status: CampaignStatus }> = {
    pause: {
      title: "Tạm dừng campaign đã chọn",
      description: `Tạm dừng ${selectedIds.length} campaign đã lên lịch hoặc đang gửi?`,
      status: "paused"
    },
    cancel: {
      title: "Hủy campaign đã chọn",
      description: `Hủy ${selectedIds.length} campaign? Hành động này không thể hoàn tác.`,
      status: "cancelled"
    },
    delete: {
      title: "Xóa nháp đã chọn",
      description: `Xóa vĩnh viễn ${selectedIds.length} campaign nháp?`,
      status: "draft"
    },
    archive: {
      title: "Lưu trữ campaign đã chọn",
      description: `Lưu trữ ${selectedIds.length} campaign?`,
      status: "archived"
    }
  };

  return (
    <>
      <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-400/30 bg-zinc-950/95 px-4 py-3 shadow-lg backdrop-blur">
        <p className="text-sm text-zinc-300">
          Đã chọn <span className="font-semibold text-cyan-300">{selectedIds.length}</span> campaign
        </p>
        <div className="flex flex-wrap gap-2">
          {canUpdate ? (
            <>
              <button
                className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-400/10 disabled:opacity-50"
                disabled={pending}
                onClick={() => setConfirmKind("pause")}
                type="button"
              >
                Tạm dừng
              </button>
              <button
                className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-100 transition hover:bg-red-400/10 disabled:opacity-50"
                disabled={pending}
                onClick={() => setConfirmKind("cancel")}
                type="button"
              >
                Hủy
              </button>
              <button
                className="rounded-lg border border-zinc-500/30 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/5 disabled:opacity-50"
                disabled={pending}
                onClick={() => setConfirmKind("archive")}
                type="button"
              >
                Lưu trữ
              </button>
            </>
          ) : null}
          <button
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
            disabled={pending}
            onClick={handleExport}
            type="button"
          >
            Xuất CSV
          </button>
          <button
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-white/5"
            onClick={onClearSelection}
            type="button"
          >
            Bỏ chọn
          </button>
        </div>
      </div>

      {confirmKind ? (
        <ConfirmActionModal
          confirmLabel="Xác nhận"
          description={confirmLabels[confirmKind].description}
          onClose={() => setConfirmKind(null)}
          onConfirm={() => runBulk(confirmLabels[confirmKind].status, confirmKind)}
          open
          pending={pending}
          title={confirmLabels[confirmKind].title}
          variant={confirmKind === "cancel" || confirmKind === "delete" ? "danger" : "primary"}
        />
      ) : null}
    </>
  );
}
