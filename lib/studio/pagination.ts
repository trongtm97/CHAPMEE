import { STUDIO_LIST_PAGE_SIZE_DEFAULT } from "@/types/studio";

export function parseStudioPage(value?: string): number {
  const parsed = Number.parseInt(value ?? "1", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function paginateList<T>(
  items: T[],
  page: number,
  pageSize: number = STUDIO_LIST_PAGE_SIZE_DEFAULT
) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages
  };
}
