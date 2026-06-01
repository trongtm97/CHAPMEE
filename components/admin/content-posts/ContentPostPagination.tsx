"use client";

import { CONTENT_POST_PAGE_SIZE_OPTIONS } from "@/lib/platform-content/parse-post-filters";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  pending?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function ContentPostPagination({
  page,
  pageSize,
  total,
  pending,
  onPageChange,
  onPageSizeChange
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-zinc-400">
        Đang xem {start}–{end} / tổng {total} bài viết
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <span>Hiển thị</span>
          <select
            className="rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white"
            disabled={pending}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            value={pageSize}
          >
            {CONTENT_POST_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm transition hover:bg-white/5 disabled:opacity-50"
          disabled={pending || total === 0 || page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          Trước
        </button>
        <span className="text-sm text-zinc-500">
          {page}/{totalPages}
        </span>
        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm transition hover:bg-white/5 disabled:opacity-50"
          disabled={pending || total === 0 || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
