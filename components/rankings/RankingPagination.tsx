"use client";

type RankingPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function RankingPagination({
  page,
  totalPages,
  onPageChange
}: RankingPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageList(page, totalPages);

  return (
    <nav
      aria-label="Phân trang bảng xếp hạng"
      className="flex flex-wrap items-center justify-center gap-2 pt-2"
    >
      <PaginationButton
        disabled={page <= 1}
        label="Trước"
        onClick={() => onPageChange(page - 1)}
      />
      {pages.map((entry, index) =>
        entry === "..." ? (
          <span className="px-2 text-sm text-zinc-500" key={`gap-${index}`}>
            …
          </span>
        ) : (
          <PaginationButton
            active={entry === page}
            key={entry}
            label={String(entry)}
            onClick={() => onPageChange(entry)}
          />
        )
      )}
      <PaginationButton
        disabled={page >= totalPages}
        label="Sau"
        onClick={() => onPageChange(page + 1)}
      />
    </nav>
  );
}

function PaginationButton({
  label,
  onClick,
  disabled,
  active
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      className={`tap-highlight min-h-10 rounded-full border px-4 py-2 text-sm font-bold transition ${
        active
          ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
          : disabled
            ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-zinc-600"
            : "border-white/10 bg-[var(--surface)] text-zinc-300 hover:border-white/20"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function buildPageList(current: number, total: number) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: Array<number | "..."> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push("...");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < total - 1) pages.push("...");
  pages.push(total);

  return pages;
}
