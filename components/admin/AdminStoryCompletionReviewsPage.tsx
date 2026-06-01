"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button, EmptyState, LoadingState } from "@/components/ui";
import {
  adminApproveStoryCompletionAction,
  adminRejectStoryCompletionAction
} from "@/lib/admin/story-completion-review-actions";
import { getStoryCompletionReviews } from "@/lib/admin/get-story-completion-reviews";
import { formatMonetizationVnd } from "@/lib/studio/format-monetization-display";
import type {
  AdminStoryCompletionReviewRow,
  StoryCompletionReviewFilterStatus,
  StoryCompletionReviewSort
} from "@/types/story-completion";

type Summary = {
  pending: number;
  approved: number;
  rejected: number;
};

type Props = {
  initialItems: AdminStoryCompletionReviewRow[];
  initialTotal: number;
  summary: Summary;
  initialStatus: StoryCompletionReviewFilterStatus;
  initialSort: StoryCompletionReviewSort;
  initialSearch: string;
  initialPage: number;
  initialPageSize: number;
  loadError?: boolean;
};

const STATUS_TABS: Array<{ value: StoryCompletionReviewFilterStatus; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "pending_review", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Từ chối" }
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function adminStatusLabel(status: AdminStoryCompletionReviewRow["adminCompletionStatus"]) {
  switch (status) {
    case "pending_review":
      return "Chờ duyệt";
    case "approved":
      return "Đã duyệt";
    case "rejected":
      return "Từ chối";
    default:
      return "Chưa gửi";
  }
}

export function AdminStoryCompletionReviewsPage({
  initialItems,
  initialTotal,
  summary,
  initialStatus,
  initialSort,
  initialSearch,
  initialPage,
  initialPageSize,
  loadError: initialLoadError = false
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [status, setStatus] = useState(initialStatus);
  const [sort, setSort] = useState(initialSort);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [loadError, setLoadError] = useState(initialLoadError);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AdminStoryCompletionReviewRow | null>(null);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const reload = useCallback(async () => {
    setLoading(true);
    const result = await getStoryCompletionReviews({
      page,
      pageSize,
      search,
      status,
      sort
    });
    if (result.error) {
      setLoadError(true);
    } else {
      setLoadError(false);
      setItems(result.items);
      setTotal(result.total);
    }
    setLoading(false);
  }, [page, pageSize, search, sort, status]);

  useEffect(() => {
    reload();
  }, [reload]);

  function runAction() {
    if (!selected || !confirmAction) return;
    startTransition(async () => {
      setError(null);
      if (confirmAction === "approve") {
        const result = await adminApproveStoryCompletionAction({
          storyId: selected.storyId,
          adminNote
        });
        if (!result.ok) {
          setError(result.error ?? "Không duyệt được.");
          return;
        }
        const unlocked =
          "unlockedAmountVnd" in result ? result.unlockedAmountVnd ?? 0 : 0;
        setMessage(`Đã duyệt hoàn thành. Mở khóa ${formatMonetizationVnd(unlocked)}.`);
      } else {
        const result = await adminRejectStoryCompletionAction({
          storyId: selected.storyId,
          adminNote
        });
        if (!result.ok) {
          setError(result.error ?? "Không từ chối được.");
          return;
        }
        setMessage("Đã từ chối yêu cầu.");
      }
      setConfirmAction(null);
      setSelected(null);
      setAdminNote("");
      reload();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Chờ duyệt</p>
          <p className="mt-2 text-2xl font-bold text-white">{summary.pending}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Đã duyệt</p>
          <p className="mt-2 text-2xl font-bold text-white">{summary.approved}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Từ chối</p>
          <p className="mt-2 text-2xl font-bold text-white">{summary.rejected}</p>
        </div>
      </div>

      {message ? (
        <p className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            type="button"
            variant={status === tab.value ? "primary" : "secondary"}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Tìm truyện, tác giả, user id…"
          value={searchInput}
        />
        <Button
          onClick={() => {
            setSearch(searchInput.trim());
            setPage(1);
          }}
          type="button"
          variant="secondary"
        >
          Tìm
        </Button>
        <select
          className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(event) => {
            setSort(event.target.value as StoryCompletionReviewSort);
            setPage(1);
          }}
          value={sort}
        >
          <option value="requested_desc">Mới gửi</option>
          <option value="locked_revenue_desc">Doanh thu giữ cao nhất</option>
          <option value="story_updated_desc">Cập nhật truyện mới nhất</option>
        </select>
        <select
          className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }}
          value={pageSize}
        >
          <option value={10}>10/trang</option>
          <option value={25}>25/trang</option>
          <option value={50}>50/trang</option>
        </select>
      </div>

      {loadError ? (
        <p className="text-sm text-rose-300">Không tải được danh sách. Thử lại sau.</p>
      ) : loading ? (
        <LoadingState label="Đang tải…" />
      ) : items.length === 0 ? (
        <EmptyState description="Chưa có yêu cầu phù hợp." title="Danh sách trống" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">Truyện</th>
                <th className="px-3 py-2">Tác giả</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Chương</th>
                <th className="px-3 py-2">Cập nhật cuối</th>
                <th className="px-3 py-2">Đang giữ</th>
                <th className="px-3 py-2">Yêu cầu</th>
                <th className="px-3 py-2">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr className="border-t border-white/5" key={item.storyId}>
                  <td className="px-3 py-3">
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="text-xs text-zinc-500">
                      {item.isCompleted ? "Tác giả đánh dấu hoàn thành" : "Đang ra"} ·{" "}
                      {item.status}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-zinc-300">
                    {item.authorDisplayName}
                    {item.authorHandle ? (
                      <span className="block text-xs text-zinc-500">@{item.authorHandle}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-zinc-300">{adminStatusLabel(item.adminCompletionStatus)}</td>
                  <td className="px-3 py-3 text-zinc-300">{item.chapterCount}</td>
                  <td className="px-3 py-3 text-zinc-400">
                    {formatDate(item.lastChapterUpdatedAt)}
                  </td>
                  <td className="px-3 py-3 text-zinc-300">
                    {formatMonetizationVnd(item.lockedFullStoryRevenueVnd)}
                  </td>
                  <td className="px-3 py-3 text-zinc-400">
                    {formatDate(item.adminCompletionRequestedAt)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => setSelected(item)}
                        type="button"
                        variant="secondary"
                      >
                        Chi tiết
                      </Button>
                      <Link
                        className="inline-flex h-9 items-center rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200 hover:bg-white/5"
                        href={`/stories/${item.slug}`}
                        target="_blank"
                      >
                        Mở truyện
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <Button
            disabled={page <= 1 || pending}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
            variant="secondary"
          >
            Trước
          </Button>
          <span className="text-xs text-zinc-400">
            Trang {page}/{totalPages} · {total} mục
          </span>
          <Button
            disabled={page >= totalPages || pending}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            type="button"
            variant="secondary"
          >
            Sau
          </Button>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
          <div className="flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-zinc-950">
            <header className="border-b border-white/10 px-4 py-4">
              <h2 className="text-lg font-bold text-white">{selected.title}</h2>
              <p className="text-sm text-zinc-400">{selected.authorDisplayName}</p>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm text-zinc-300">
              <p>
                Trạng thái xác nhận:{" "}
                <span className="text-white">{adminStatusLabel(selected.adminCompletionStatus)}</span>
              </p>
              <p>Doanh thu trọn bộ đang giữ: {formatMonetizationVnd(selected.lockedFullStoryRevenueVnd)}</p>
              <p>Giá trọn bộ: {selected.fullAccessPriceCoin ?? "—"} coin</p>
              <p>Số chương: {selected.chapterCount}</p>
              <p>Cập nhật chương cuối: {formatDate(selected.lastChapterUpdatedAt)}</p>
              {selected.authorCompletionRequestNote ? (
                <p className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  Ghi chú tác giả: {selected.authorCompletionRequestNote}
                </p>
              ) : null}
              {selected.adminCompletionNote ? (
                <p className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 text-rose-100">
                  Ghi chú admin: {selected.adminCompletionNote}
                </p>
              ) : null}
            </div>
            <footer className="flex gap-2 border-t border-white/10 px-4 py-3">
              <Button className="flex-1" onClick={() => setSelected(null)} type="button" variant="secondary">
                Đóng
              </Button>
              {selected.adminCompletionStatus !== "approved" ? (
                <>
                  <Button
                    className="flex-1"
                    disabled={pending}
                    onClick={() => {
                      setConfirmAction("approve");
                      setAdminNote("");
                    }}
                    type="button"
                  >
                    Duyệt
                  </Button>
                  {selected.adminCompletionStatus === "pending_review" ? (
                    <Button
                      className="flex-1"
                      disabled={pending}
                      onClick={() => {
                        setConfirmAction("reject");
                        setAdminNote("");
                      }}
                      type="button"
                      variant="secondary"
                    >
                      Từ chối
                    </Button>
                  ) : null}
                </>
              ) : null}
            </footer>
          </div>
        </div>
      ) : null}

      {confirmAction && selected ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-4">
            <h3 className="text-lg font-bold text-white">
              {confirmAction === "approve" ? "Xác nhận duyệt hoàn thành?" : "Xác nhận từ chối?"}
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              {confirmAction === "approve"
                ? "Doanh thu trọn bộ đang giữ sẽ được mở khóa cho tác giả."
                : "Vui lòng nhập lý do để tác giả biết và chỉnh sửa."}
            </p>
            <label className="mt-4 block text-sm text-zinc-300">
              {confirmAction === "reject" ? "Lý do từ chối" : "Ghi chú (tuỳ chọn)"}
              <textarea
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
                onChange={(event) => setAdminNote(event.target.value)}
                required={confirmAction === "reject"}
                rows={3}
                value={adminNote}
              />
            </label>
            <div className="mt-4 flex gap-2">
              <Button
                className="flex-1"
                onClick={() => setConfirmAction(null)}
                type="button"
                variant="secondary"
              >
                Huỷ
              </Button>
              <Button
                className="flex-1"
                disabled={pending || (confirmAction === "reject" && !adminNote.trim())}
                onClick={runAction}
                type="button"
              >
                Xác nhận
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
