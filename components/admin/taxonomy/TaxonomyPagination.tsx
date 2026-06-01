"use client";

type TaxonomyPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pending?: boolean;
  onPageChange: (page: number) => void;
};

export function TaxonomyPagination({
  page,
  totalPages,
  total,
  pending,
  onPageChange
}: TaxonomyPaginationProps) {
  const disabled = total === 0;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-zinc-400">
        Trang {page}/{Math.max(1, totalPages)} · {total} mục
      </p>
      <div className="flex gap-2">
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
