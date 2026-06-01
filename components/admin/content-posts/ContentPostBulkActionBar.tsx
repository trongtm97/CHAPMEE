"use client";

import { useState, useTransition } from "react";
import { ConfirmActionModal } from "@/components/admin/campaigns/ConfirmActionModal";
import {
  bulkSoftDeleteContentPostsAction,
  bulkUpdateContentPostsAction,
  exportContentPostsCsvAction,
  type BulkContentPostPatch
} from "@/lib/admin/content-post-actions";
import type { ContentPostType } from "@/types/platform-content";

type Props = {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onDone: (message: string) => void;
  onRefresh: () => void;
};

export function ContentPostBulkActionBar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onDone,
  onRefresh
}: Props) {
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<"delete" | "archive" | null>(null);

  if (selectedCount === 0) return null;

  function runBulk(patch: BulkContentPostPatch, message: string) {
    startTransition(async () => {
      const result = await bulkUpdateContentPostsAction({ ids: selectedIds, patch });
      onDone(result.message ?? message);
      if (result.ok) {
        onClearSelection();
        onRefresh();
      }
    });
  }

  function runDelete() {
    startTransition(async () => {
      const result = await bulkSoftDeleteContentPostsAction(selectedIds);
      onDone(result.message ?? "Đã xóa.");
      if (result.ok) {
        onClearSelection();
        onRefresh();
      }
      setModal(null);
    });
  }

  function runExport() {
    startTransition(async () => {
      const result = await exportContentPostsCsvAction(selectedIds);
      if (result.error) {
        onDone(result.error);
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `content-posts-${Date.now()}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      onDone(`Đã xuất ${selectedCount} bài viết.`);
    });
  }

  return (
    <>
      <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-cyan-400/20 bg-zinc-950/95 px-4 py-3 shadow-xl backdrop-blur">
        <p className="mr-auto text-sm font-medium text-white">Đã chọn {selectedCount} bài viết</p>
        <button
          className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-50"
          disabled={pending}
          onClick={() => runBulk({ status: "published" }, "Đã đăng hàng loạt.")}
          type="button"
        >
          Đăng
        </button>
        <button
          className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-400/10 disabled:opacity-50"
          disabled={pending}
          onClick={() => runBulk({ status: "hidden" }, "Đã ẩn hàng loạt.")}
          type="button"
        >
          Ẩn
        </button>
        <button
          className="rounded-lg border border-zinc-500/40 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
          disabled={pending}
          onClick={() => setModal("archive")}
          type="button"
        >
          Archive
        </button>
        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
          disabled={pending}
          onClick={() => runBulk({ indexable: true, robots: "index,follow" }, "Đã bật index.")}
          type="button"
        >
          Index
        </button>
        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
          disabled={pending}
          onClick={() => runBulk({ indexable: false, robots: "noindex,follow" }, "Đã noindex.")}
          type="button"
        >
          Noindex
        </button>
        <select
          className="rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 text-xs text-white"
          disabled={pending}
          onChange={(event) =>
            runBulk({ post_type: event.target.value as ContentPostType }, "Đã đổi loại bài.")
          }
          defaultValue=""
        >
          <option disabled value="">
            Đổi loại
          </option>
          {["article", "guide", "seo", "editorial", "policy", "news"].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
          disabled={pending}
          onClick={runExport}
          type="button"
        >
          Export
        </button>
        <button
          className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs text-red-200 hover:bg-red-400/10 disabled:opacity-50"
          disabled={pending}
          onClick={() => setModal("delete")}
          type="button"
        >
          Xóa mềm
        </button>
        <button className="text-xs text-zinc-500 hover:text-zinc-300" onClick={onClearSelection} type="button">
          Bỏ chọn
        </button>
      </div>

      <ConfirmActionModal
        confirmLabel={modal === "delete" ? "Xóa mềm" : "Archive"}
        description={
          modal === "delete"
            ? `Xóa mềm ${selectedCount} bài viết? Có thể khôi phục sau này từ DB.`
            : `Lưu trữ ${selectedCount} bài viết?`
        }
        onClose={() => setModal(null)}
        onConfirm={() => {
          if (modal === "delete") runDelete();
          else runBulk({ status: "archived" }, "Đã archive hàng loạt.");
          setModal(null);
        }}
        open={modal !== null}
        pending={pending}
        title={modal === "delete" ? "Xóa mềm hàng loạt" : "Archive hàng loạt"}
        variant={modal === "delete" ? "danger" : "primary"}
      />
    </>
  );
}
