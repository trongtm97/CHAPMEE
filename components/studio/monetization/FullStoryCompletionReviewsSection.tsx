"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button, EmptyState, LoadingState } from "@/components/ui";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { formatMonetizationVnd } from "@/lib/studio/format-monetization-display";
import {
  studioFetchFullStoryEscrowStoriesAction,
  studioRequestStoryCompletionReviewAction
} from "@/lib/studio/story-completion-actions";
import type { StudioFullStoryEscrowStoryRow } from "@/types/story-completion";

type FullStoryCompletionReviewsSectionProps = {
  initialCount: number;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function completionStatusLabel(status: StudioFullStoryEscrowStoryRow["adminCompletionStatus"]) {
  switch (status) {
    case "pending_review":
      return "Đang chờ admin duyệt";
    case "rejected":
      return "Bị từ chối";
    case "approved":
      return "Đã duyệt";
    default:
      return "Chưa gửi";
  }
}

export function FullStoryCompletionReviewsSection({
  initialCount
}: FullStoryCompletionReviewsSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StudioFullStoryEscrowStoryRow[]>([]);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"updated_desc" | "locked_revenue_desc" | "title_asc">(
    "updated_desc"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestStoryId, setRequestStoryId] = useState<string | null>(null);
  const [authorNote, setAuthorNote] = useState("");

  const load = useCallback(() => {
    startTransition(async () => {
      setLoading(true);
      const result = await studioFetchFullStoryEscrowStoriesAction({
        page,
        pageSize,
        search,
        sort
      });
      setRows(result.rows);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
      setError(result.error);
      setLoading(false);
    });
  }, [page, pageSize, search, sort]);

  useEffect(() => {
    load();
  }, [load]);

  if (initialCount === 0 && !loading && totalCount === 0) {
    return null;
  }

  function handleRequest(storyId: string) {
    setRequestStoryId(storyId);
    setAuthorNote("");
    setError(null);
  }

  function submitRequest() {
    if (!requestStoryId) return;
    startTransition(async () => {
      const result = await studioRequestStoryCompletionReviewAction({
        storyId: requestStoryId,
        authorNote
      });
      if (!result.ok) {
        setError(result.error ?? "Không gửi được yêu cầu.");
        return;
      }
      setMessage("Đã gửi yêu cầu xác nhận hoàn thành. Admin sẽ xem xét sớm.");
      setRequestStoryId(null);
      load();
    });
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Truyện bán trọn bộ cần xác nhận</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Gửi yêu cầu khi truyện đã hoàn thành để mở khóa doanh thu trọn bộ đang giữ.
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
          {totalCount} truyện
        </span>
      </div>

      {message ? (
        <p className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Tìm truyện…"
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
            setSort(event.target.value as typeof sort);
            setPage(1);
          }}
          value={sort}
        >
          <option value="updated_desc">Cập nhật gần nhất</option>
          <option value="locked_revenue_desc">Doanh thu giữ cao nhất</option>
          <option value="title_asc">Tên A-Z</option>
        </select>
        <select
          className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(event) => {
            setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
            setPage(1);
          }}
          value={pageSize}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}/trang
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="mt-4">
          <LoadingState label="Đang tải…" />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState description="Không có truyện phù hợp." title="Danh sách trống" />
        </div>
      ) : (
        <>
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-2 py-2">Truyện</th>
                  <th className="px-2 py-2">Trạng thái</th>
                  <th className="px-2 py-2">Xác nhận</th>
                  <th className="px-2 py-2">Đang giữ</th>
                  <th className="px-2 py-2">Chương</th>
                  <th className="px-2 py-2">Cập nhật</th>
                  <th className="px-2 py-2">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr className="border-t border-white/5" key={row.storyId}>
                    <td className="px-2 py-3 font-medium text-white">{row.title}</td>
                    <td className="px-2 py-3 text-zinc-300">
                      {row.isCompleted ? "Hoàn thành" : "Đang ra"}
                    </td>
                    <td className="px-2 py-3 text-zinc-300">
                      {completionStatusLabel(row.adminCompletionStatus)}
                      {row.adminCompletionStatus === "rejected" && row.adminCompletionNote ? (
                        <p className="mt-1 text-xs text-rose-200">{row.adminCompletionNote}</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-3 text-zinc-300">
                      {formatMonetizationVnd(row.lockedFullStoryRevenueVnd)}
                    </td>
                    <td className="px-2 py-3 text-zinc-300">{row.chapterCount}</td>
                    <td className="px-2 py-3 text-zinc-400">
                      {formatDate(row.lastChapterUpdatedAt ?? row.storyUpdatedAt)}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap gap-2">
                        {row.adminCompletionStatus === "not_requested" ||
                        row.adminCompletionStatus === "rejected" ? (
                          <Button
                            disabled={isPending}
                            onClick={() => handleRequest(row.storyId)}
                            type="button"
                            variant="secondary"
                          >
                            {row.adminCompletionStatus === "rejected"
                              ? "Gửi lại"
                              : "Gửi yêu cầu"}
                          </Button>
                        ) : null}
                        <Link
                          className="inline-flex h-9 items-center rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200 hover:bg-white/5"
                          href={getStoryDetailHref({
                            slug: row.slug,
                            public_code: row.publicCode
                          })}
                          target="_blank"
                        >
                          Mở truyện
                        </Link>
                        <Link
                          className="inline-flex h-9 items-center rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200 hover:bg-white/5"
                          href={`/studio/stories/${row.storyId}`}
                        >
                          Sửa truyện
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3 md:hidden">
            {rows.map((row) => (
              <article
                className="rounded-xl border border-white/10 bg-zinc-950/60 p-3"
                key={row.storyId}
              >
                <h3 className="font-semibold text-white">{row.title}</h3>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  <div>
                    <dt>Trạng thái</dt>
                    <dd className="text-zinc-200">
                      {row.isCompleted ? "Hoàn thành" : "Đang ra"}
                    </dd>
                  </div>
                  <div>
                    <dt>Xác nhận</dt>
                    <dd className="text-zinc-200">
                      {completionStatusLabel(row.adminCompletionStatus)}
                    </dd>
                  </div>
                  <div>
                    <dt>Đang giữ</dt>
                    <dd className="text-zinc-200">
                      {formatMonetizationVnd(row.lockedFullStoryRevenueVnd)}
                    </dd>
                  </div>
                  <div>
                    <dt>Chương</dt>
                    <dd className="text-zinc-200">{row.chapterCount}</dd>
                  </div>
                </dl>
                {row.adminCompletionStatus === "rejected" && row.adminCompletionNote ? (
                  <p className="mt-2 text-xs text-rose-200">{row.adminCompletionNote}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.adminCompletionStatus === "not_requested" ||
                  row.adminCompletionStatus === "rejected" ? (
                    <Button
                      disabled={isPending}
                      onClick={() => handleRequest(row.storyId)}
                      type="button"
                      variant="secondary"
                    >
                      {row.adminCompletionStatus === "rejected" ? "Gửi lại" : "Gửi yêu cầu"}
                    </Button>
                  ) : null}
                  <Link
                    className="inline-flex h-9 items-center rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200"
                    href={getStoryDetailHref({
                      slug: row.slug,
                      public_code: row.publicCode
                    })}
                    target="_blank"
                  >
                    Mở truyện
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            disabled={page <= 1 || isPending}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
            variant="secondary"
          >
            Trước
          </Button>
          <span className="text-xs text-zinc-400">
            Trang {page}/{totalPages}
          </span>
          <Button
            disabled={page >= totalPages || isPending}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            type="button"
            variant="secondary"
          >
            Sau
          </Button>
        </div>
      ) : null}

      {requestStoryId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-4">
            <h3 className="text-lg font-bold text-white">Gửi yêu cầu xác nhận hoàn thành</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Admin sẽ kiểm tra truyện trước khi mở khóa doanh thu bán trọn bộ.
            </p>
            <label className="mt-4 block text-sm text-zinc-300">
              Ghi chú cho admin (tuỳ chọn)
              <textarea
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
                onChange={(event) => setAuthorNote(event.target.value)}
                rows={3}
                value={authorNote}
              />
            </label>
            <div className="mt-4 flex gap-2">
              <Button
                className="flex-1"
                onClick={() => setRequestStoryId(null)}
                type="button"
                variant="secondary"
              >
                Huỷ
              </Button>
              <Button className="flex-1" disabled={isPending} onClick={submitRequest} type="button">
                Gửi yêu cầu
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
