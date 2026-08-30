export const ADMIN_DEFAULT_PAGE_SIZE = 20;
export const ADMIN_MAX_PAGE_SIZE = 50;

export type AdminListParams = {
  page: number;
  pageSize: number;
  offset: number;
  q: string;
};

export function parseAdminListParams(
  input?: { page?: string | number; pageSize?: string | number; q?: string },
  defaults?: { pageSize?: number }
): AdminListParams {
  const page = Math.max(1, Number(input?.page ?? 1) || 1);
  const rawSize = Number(input?.pageSize ?? defaults?.pageSize ?? ADMIN_DEFAULT_PAGE_SIZE);
  const pageSize = [10, 20, 50].includes(rawSize)
    ? rawSize
    : defaults?.pageSize ?? ADMIN_DEFAULT_PAGE_SIZE;
  const capped = Math.min(pageSize, ADMIN_MAX_PAGE_SIZE);
  const q = String(input?.q ?? "").trim().slice(0, 120);

  return {
    page,
    pageSize: capped,
    offset: (page - 1) * capped,
    q
  };
}

export function adminListMeta(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  return {
    total,
    page: safePage,
    pageSize,
    totalPages,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages
  };
}
