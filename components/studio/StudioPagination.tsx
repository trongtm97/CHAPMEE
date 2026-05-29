import Link from "next/link";

type StudioPaginationProps = {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

export function StudioPagination({
  buildHref,
  page,
  totalPages
}: StudioPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (value) =>
      value === 1 ||
      value === totalPages ||
      Math.abs(value - page) <= 1
  );

  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
          href={buildHref(page - 1)}
        >
          Trang trước
        </Link>
      ) : (
        <span className="inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-xl border border-white/5 px-3 py-2 text-sm font-semibold text-zinc-600">
          Trang trước
        </span>
      )}

      <div className="flex flex-wrap items-center gap-1">
        {pages.map((pageNumber, index) => {
          const previous = pages[index - 1];
          const showEllipsis = previous !== undefined && pageNumber - previous > 1;

          return (
            <span className="flex items-center gap-1" key={pageNumber}>
              {showEllipsis ? (
                <span className="px-1 text-sm text-zinc-500">…</span>
              ) : null}
              <Link
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-sm font-semibold transition ${
                  pageNumber === page
                    ? "bg-sky-300 text-zinc-950"
                    : "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                }`}
                href={buildHref(pageNumber)}
              >
                {pageNumber}
              </Link>
            </span>
          );
        })}
      </div>

      {page < totalPages ? (
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
          href={buildHref(page + 1)}
        >
          Trang sau
        </Link>
      ) : (
        <span className="inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-xl border border-white/5 px-3 py-2 text-sm font-semibold text-zinc-600">
          Trang sau
        </span>
      )}
    </nav>
  );
}
