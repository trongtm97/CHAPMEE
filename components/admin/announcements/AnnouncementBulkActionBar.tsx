"use client";

import { useState, useTransition } from "react";
import { ConfirmActionModal } from "@/components/admin/campaigns/ConfirmActionModal";
import {
  bulkDeleteAnnouncementsAction,
  bulkUpdateAnnouncementsAction,
  type BulkAnnouncementPatch
} from "@/lib/admin/announcement-actions";
import type {
  AnnouncementAudienceType,
  AnnouncementType,
  AnnouncementVisibility
} from "@/types/platform-content";

type Props = {
  selectedCount: number;
  pending?: boolean;
  onClearSelection: () => void;
  onDone: (message: string) => void;
  onRefresh: () => void;
  selectedIds: string[];
};

type BulkModal =
  | { kind: "delete" }
  | { kind: "archive" }
  | { kind: "type"; value: AnnouncementType }
  | { kind: "audience"; value: AnnouncementAudienceType }
  | { kind: "visibility"; value: AnnouncementVisibility }
  | null;

export function AnnouncementBulkActionBar({
  selectedCount,
  onClearSelection,
  onDone,
  onRefresh,
  selectedIds
}: Props) {
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<BulkModal>(null);
  const [changeType, setChangeType] = useState<AnnouncementType>("general");
  const [changeAudience, setChangeAudience] = useState<AnnouncementAudienceType>("all");
  const [changeVisibility, setChangeVisibility] = useState<AnnouncementVisibility>("public");

  if (selectedCount === 0) return null;

  function runBulk(patch: BulkAnnouncementPatch, message: string) {
    startTransition(async () => {
      const result = await bulkUpdateAnnouncementsAction({ ids: selectedIds, patch });
      onDone(result.message ?? message);
      if (result.ok) {
        onClearSelection();
        onRefresh();
      }
      setModal(null);
    });
  }

  function runDelete() {
    startTransition(async () => {
      const result = await bulkDeleteAnnouncementsAction(selectedIds);
      onDone(result.message ?? "Đã xóa.");
      if (result.ok) {
        onClearSelection();
        onRefresh();
      }
      setModal(null);
    });
  }

  return (
    <>
      <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-cyan-400/20 bg-zinc-950/95 px-4 py-3 shadow-xl backdrop-blur">
        <p className="mr-auto text-sm font-medium text-white">
          Đã chọn {selectedCount} thông báo
        </p>

        <button
          className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-50"
          disabled={pending}
          onClick={() => runBulk({ status: "published" }, "Đã đăng hàng loạt.")}
          type="button"
        >
          Đăng
        </button>
        <button
          className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-400/10 disabled:opacity-50"
          disabled={pending}
          onClick={() => runBulk({ status: "hidden" }, "Đã ẩn hàng loạt.")}
          type="button"
        >
          Ẩn
        </button>
        <button
          className="rounded-lg border border-zinc-500/40 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
          disabled={pending}
          onClick={() => setModal({ kind: "archive" })}
          type="button"
        >
          Archive
        </button>

        <select
          className="rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 text-xs text-white"
          onChange={(event) => {
            setChangeType(event.target.value as AnnouncementType);
            setModal({ kind: "type", value: event.target.value as AnnouncementType });
          }}
          value={changeType}
        >
          {[
            "general",
            "maintenance",
            "policy",
            "monetization",
            "creator",
            "reader",
            "feature",
            "warning"
          ].map((value) => (
            <option key={value} value={value}>
              Loại: {value}
            </option>
          ))}
        </select>

        <select
          className="rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 text-xs text-white"
          onChange={(event) => {
            setChangeAudience(event.target.value as AnnouncementAudienceType);
            setModal({ kind: "audience", value: event.target.value as AnnouncementAudienceType });
          }}
          value={changeAudience}
        >
          {["all", "creators", "readers", "monetized_creators", "published_creators"].map(
            (value) => (
              <option key={value} value={value}>
                Audience: {value}
              </option>
            )
          )}
        </select>

        <select
          className="rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 text-xs text-white"
          onChange={(event) => {
            setChangeVisibility(event.target.value as AnnouncementVisibility);
            setModal({ kind: "visibility", value: event.target.value as AnnouncementVisibility });
          }}
          value={changeVisibility}
        >
          <option value="public">Visibility: public</option>
          <option value="targeted">Visibility: in-app</option>
          <option value="admin_only">Visibility: nội bộ</option>
        </select>

        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
          disabled={pending}
          onClick={() => runBulk({ indexable: false }, "Đã chuyển noindex hàng loạt.")}
          type="button"
        >
          Noindex
        </button>

        <button
          className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-400/10 disabled:opacity-50"
          disabled={pending}
          onClick={() => setModal({ kind: "delete" })}
          type="button"
        >
          Xóa
        </button>

        <button
          className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition hover:text-zinc-300"
          onClick={onClearSelection}
          type="button"
        >
          Bỏ chọn
        </button>
      </div>

      <ConfirmActionModal
        confirmLabel={
          modal?.kind === "delete"
            ? "Xóa"
            : modal?.kind === "archive"
              ? "Archive"
              : "Áp dụng"
        }
        description={
          modal?.kind === "delete"
            ? `Xóa vĩnh viễn ${selectedCount} thông báo? Không thể hoàn tác.`
            : modal?.kind === "archive"
              ? `Lưu trữ ${selectedCount} thông báo?`
              : `Cập nhật ${selectedCount} thông báo đã chọn?`
        }
        onClose={() => setModal(null)}
        onConfirm={() => {
          if (modal?.kind === "delete") {
            runDelete();
            return;
          }
          if (modal?.kind === "archive") {
            runBulk({ status: "archived" }, "Đã archive hàng loạt.");
            return;
          }
          if (modal?.kind === "type") {
            runBulk({ announcement_type: modal.value }, "Đã đổi loại hàng loạt.");
            return;
          }
          if (modal?.kind === "audience") {
            runBulk({ audience_type: modal.value }, "Đã đổi audience hàng loạt.");
            return;
          }
          if (modal?.kind === "visibility") {
            runBulk({ visibility: modal.value }, "Đã đổi visibility hàng loạt.");
          }
        }}
        open={modal !== null}
        pending={pending}
        title={
          modal?.kind === "delete"
            ? "Xóa hàng loạt"
            : modal?.kind === "archive"
              ? "Archive hàng loạt"
              : "Xác nhận cập nhật"
        }
        variant={modal?.kind === "delete" ? "danger" : "primary"}
      />
    </>
  );
}
