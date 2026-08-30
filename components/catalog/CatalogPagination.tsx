import { ListPagination } from "@/components/ui/ListPagination";

type CatalogPaginationProps = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  itemLabel?: string;
  prevHref: string;
  nextHref: string;
  buildPageHref: (page: number) => string;
};

export function CatalogPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  itemLabel = "kết quả",
  buildPageHref
}: CatalogPaginationProps) {
  if (totalCount <= 0) {
    return null;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  return (
    <nav aria-label="Phân trang" className="space-y-3 border-t border-white/[0.06] pt-4">
      <p className="text-center text-xs text-zinc-500 sm:text-left">
        Hiển thị {start.toLocaleString("vi-VN")}–{end.toLocaleString("vi-VN")} trong{" "}
        {totalCount.toLocaleString("vi-VN")} {itemLabel}
      </p>
      <ListPagination
        buildHref={buildPageHref}
        page={currentPage}
        totalPages={totalPages}
      />
    </nav>
  );
}
