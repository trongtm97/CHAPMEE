"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type AdminListPaginationProps = {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function AdminListPagination({
  basePath,
  page,
  pageSize,
  total,
  totalPages
}: AdminListPaginationProps) {
  const searchParams = useSearchParams();

  function hrefForPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    return `${basePath}?${params.toString()}`;
  }

  if (total === 0) {
    return null;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm">
      <p className="text-zinc-500">
        {from}–{to} / {total} · Trang {page}/{totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            className="rounded-full border border-white/10 px-3 py-1.5 font-semibold text-zinc-200 hover:bg-white/[0.04]"
            href={hrefForPage(page - 1)}
          >
            ← Trước
          </Link>
        ) : (
          <span className="rounded-full border border-white/5 px-3 py-1.5 text-zinc-600">
            ← Trước
          </span>
        )}
        {page < totalPages ? (
          <Link
            className="rounded-full border border-white/10 px-3 py-1.5 font-semibold text-zinc-200 hover:bg-white/[0.04]"
            href={hrefForPage(page + 1)}
          >
            Sau →
          </Link>
        ) : (
          <span className="rounded-full border border-white/5 px-3 py-1.5 text-zinc-600">
            Sau →
          </span>
        )}
      </div>
    </div>
  );
}
