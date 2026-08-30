export type PaginationItem = number | "ellipsis";

type PaginationItemsOptions = {
  /** Số trang đầu luôn hiển thị (mặc định 3). */
  leadingCount?: number;
  /** Số trang kề hai bên trang hiện tại. */
  siblingCount?: number;
};

/**
 * Builds page number sequence: đầu (1..N), vùng quanh trang hiện tại, và trang cuối.
 */
export function getPaginationItems(
  currentPage: number,
  totalPages: number,
  options: PaginationItemsOptions = {}
): PaginationItem[] {
  const leadingCount = options.leadingCount ?? 3;
  const siblingCount = options.siblingCount ?? 1;

  if (totalPages <= 1) {
    return [1];
  }

  const pages = new Set<number>();

  for (let page = 1; page <= Math.min(leadingCount, totalPages); page += 1) {
    pages.add(page);
  }

  pages.add(totalPages);

  for (let offset = 0; offset <= siblingCount; offset += 1) {
    pages.add(currentPage);
    if (offset > 0) {
      pages.add(currentPage - offset);
      pages.add(currentPage + offset);
    }
  }

  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items: PaginationItem[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index]!;
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  }

  return items;
}

export function clampPaginationPage(page: number, totalPages: number) {
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }
  return Math.min(Math.floor(page), Math.max(1, totalPages));
}
