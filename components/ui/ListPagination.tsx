import Link from "next/link";
import { getPaginationItems, type PaginationItem } from "@/lib/shared/pagination-items";

type ListPaginationProps = {
  buildHref: (page: number) => string;
  className?: string;
  compact?: boolean;
  page: number;
  showJump?: boolean;
  totalPages: number;
};

function navButtonClass(compact: boolean, active = false, disabled = false) {
  const size = compact
    ? "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-semibold"
    : "inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-2.5 text-sm font-semibold";

  if (disabled) {
    return `${size} cursor-not-allowed border border-white/5 text-zinc-600`;
  }

  if (active) {
    return `${size} border border-cyan-300/50 bg-cyan-300/20 text-cyan-100`;
  }

  return `${size} border border-white/10 bg-white/5 text-zinc-200 transition hover:border-cyan-300/35 hover:bg-white/10 hover:text-cyan-100`;
}

function PageLinks({
  activePage,
  buildHref,
  compact,
  items
}: {
  activePage: number;
  buildHref: (page: number) => string;
  compact: boolean;
  items: PaginationItem[];
}) {
  return (
    <>
      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            className={`px-0.5 text-zinc-500 ${compact ? "text-[11px]" : "text-sm"}`}
            key={`ellipsis-${index}`}
          >
            …
          </span>
        ) : (
          <Link
            aria-current={item === activePage ? "page" : undefined}
            className={navButtonClass(compact, item === activePage)}
            href={buildHref(item)}
            key={item}
          >
            {item}
          </Link>
        )
      )}
    </>
  );
}

/** ponytail: derive jump form from buildHref(page) — assumes href shape is stable across pages */
function getJumpFormProps(buildHref: (page: number) => string, page: number) {
  const url = new URL(buildHref(page), "https://chapmee.com");
  const fields: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    if (key !== "page") {
      fields[key] = value;
    }
  });

  return { action: url.pathname, fields };
}

export function ListPagination({
  buildHref,
  className = "",
  compact = false,
  page,
  showJump = true,
  totalPages
}: ListPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const items = getPaginationItems(page, totalPages, { leadingCount: 3, siblingCount: 1 });
  const previousPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;
  const jumpForm = showJump ? getJumpFormProps(buildHref, page) : null;

  return (
    <nav
      aria-label="Phân trang"
      className={`space-y-2.5 ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {page > 1 ? (
          <Link className={navButtonClass(compact)} href={buildHref(1)} title="Trang đầu">
            Đầu
          </Link>
        ) : (
          <span className={navButtonClass(compact, false, true)}>Đầu</span>
        )}

        {previousPage ? (
          <Link className={navButtonClass(compact)} href={buildHref(previousPage)}>
            Trước
          </Link>
        ) : (
          <span className={navButtonClass(compact, false, true)}>Trước</span>
        )}

        <span
          className={`px-1 font-medium text-zinc-400 ${compact ? "text-xs" : "text-sm"}`}
        >
          Trang {page} / {totalPages}
        </span>

        {nextPage ? (
          <Link className={navButtonClass(compact)} href={buildHref(nextPage)}>
            Sau
          </Link>
        ) : (
          <span className={navButtonClass(compact, false, true)}>Sau</span>
        )}

        {page < totalPages ? (
          <Link
            className={navButtonClass(compact)}
            href={buildHref(totalPages)}
            title="Trang cuối"
          >
            Cuối
          </Link>
        ) : (
          <span className={navButtonClass(compact, false, true)}>Cuối</span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1">
        <PageLinks activePage={page} buildHref={buildHref} compact={compact} items={items} />
      </div>

      {jumpForm ? (
        <form
          action={jumpForm.action}
          className="flex flex-wrap items-center justify-center gap-2"
          method="get"
        >
          {Object.entries(jumpForm.fields).map(([name, value]) => (
            <input key={name} name={name} type="hidden" value={value} />
          ))}
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="shrink-0">Đến trang</span>
            <input
              className="h-9 w-16 rounded-lg border border-white/10 bg-zinc-950 px-2 text-center text-sm text-zinc-100 outline-none focus:border-cyan-300/50"
              defaultValue={page}
              inputMode="numeric"
              max={totalPages}
              min={1}
              name="page"
              type="number"
            />
          </label>
          <button className={navButtonClass(compact)} type="submit">
            Đi
          </button>
        </form>
      ) : null}
    </nav>
  );
}
