"use client";

import { ANNOUNCEMENT_PAGE_SIZE_OPTIONS } from "@/lib/platform-content/parse-announcement-filters";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  pending?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function AnnouncementPagination({
  page,
  totalPages,
  total,
  pageSize,
  pending,
  onPageChange,
  onPageSizeChange
}: Props) {
  const disabled = total === 0;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-zinc-400">
        Trang {page}/{totalPages} · {total} thông báo
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
            {ANNOUNCEMENT_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm transition hover:bg-white/5 disabled:opacity-50"
          disabled={pending || disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          Trước
        </button>
        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm transition hover:bg-white/5 disabled:opacity-50"
          disabled={pending || disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
