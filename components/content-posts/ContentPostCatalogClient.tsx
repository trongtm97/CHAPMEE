"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ContentPostCard } from "@/components/content-posts/ContentPostCard";
import {
  PUBLIC_POST_CATEGORY_OPTIONS,
  PUBLIC_POST_SORT_OPTIONS,
  buildPublicPostListQuery,
  type PublicPostCategoryFilter,
  type PublicPostSort
} from "@/lib/content-posts/public-catalog";
import type { AdminContentPost } from "@/types/platform-content";

type Props = {
  items: AdminContentPost[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  category: PublicPostCategoryFilter;
  sort: PublicPostSort;
  featured?: AdminContentPost[];
  sidebarRecent?: AdminContentPost[];
};

export function ContentPostCatalogClient({
  items,
  total,
  page,
  pageSize,
  query,
  category,
  sort,
  featured = [],
  sidebarRecent = []
}: Props) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(query);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(next: {
    page?: number;
    q?: string;
    category?: PublicPostCategoryFilter;
    sort?: PublicPostSort;
  }) {
    const href = `/bai-viet${buildPublicPostListQuery({
      page: next.page ?? page,
      q: next.q ?? query,
      category: next.category ?? category,
      sort: next.sort ?? sort
    })}`;
    router.push(href);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="space-y-6">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ q: searchInput, page: 1 });
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm bài viết..."
            type="search"
            value={searchInput}
          />
          <button
            className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white"
            type="submit"
          >
            Tìm
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {PUBLIC_POST_CATEGORY_OPTIONS.map((option) => {
            const active = category === option.value;
            return (
              <button
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-700 dark:text-cyan-100"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
                key={option.value}
                onClick={() => navigate({ category: option.value, page: 1 })}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sắp xếp:</span>
          {PUBLIC_POST_SORT_OPTIONS.map((option) => {
            const active = sort === option.value;
            return (
              <button
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                key={option.value}
                onClick={() => navigate({ sort: option.value, page: 1 })}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không tìm thấy bài viết phù hợp.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <ContentPostCard item={item} />
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <nav className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Trang {page}/{totalPages}
            </span>
            <div className="flex gap-3">
              {page > 1 ? (
                <Link
                  className="hover:text-foreground"
                  href={`/bai-viet${buildPublicPostListQuery({ page: page - 1, q: query, category, sort })}`}
                >
                  Trước
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  className="hover:text-foreground"
                  href={`/bai-viet${buildPublicPostListQuery({ page: page + 1, q: query, category, sort })}`}
                >
                  Sau
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </div>

      <aside className="hidden space-y-6 lg:block">
        {featured.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Bài nổi bật
            </h2>
            <ul className="space-y-2">
              {featured.map((item) => (
                <li key={item.id}>
                  <ContentPostCard compact item={item} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {sidebarRecent.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Bài mới
            </h2>
            <ul className="space-y-2">
              {sidebarRecent.map((item) => (
                <li key={item.id}>
                  <ContentPostCard compact item={item} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
