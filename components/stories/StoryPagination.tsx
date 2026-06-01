import Link from "next/link";
import { StoryPageSizeSelector } from "@/components/stories/StoryPageSizeSelector";
import { buildCatalogHref } from "@/lib/stories/catalog-url";
import { getPaginationItems } from "@/lib/stories/story-catalog-query";
import type { StoryCatalogFilterParams } from "@/lib/discovery/types";
import type { StoryCatalogSort, StoryCatalogStatus } from "@/types/story";
import type { ReactNode } from "react";

type StoryPaginationProps = {
  page: number;
  totalPages: number;
  query: string;
  genre: string;
  status: StoryCatalogStatus;
  sort: StoryCatalogSort;
  pageSize: number;
  layout: "mobile" | "desktop";
  filters: StoryCatalogFilterParams;
};

function buildPageHref(
  props: Omit<StoryPaginationProps, "layout">,
  targetPage: number,
  targetPageSize = props.pageSize
) {
  return buildCatalogHref({
    ...props.filters,
    q: props.query,
    genre: props.genre || props.filters.genre,
    status: props.status,
    sort: props.sort,
    page: targetPage,
    pageSize: targetPageSize
  });
}

function PaginationButton({
  children,
  disabled,
  href,
  size = "default"
}: {
  children: ReactNode;
  disabled?: boolean;
  href?: string;
  size?: "default" | "compact";
}) {
  const className =
    size === "compact"
      ? "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-xs font-semibold transition"
      : "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition";

  if (disabled || !href) {
    return (
      <span
        aria-disabled="true"
        className={`${className} cursor-not-allowed border-white/5 bg-white/[0.02] text-zinc-600`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link className={`${className} border-white/10 text-zinc-200 hover:border-cyan-300/35 hover:text-cyan-100`} href={href}>
      {children}
    </Link>
  );
}

function PageNumberLink({
  active,
  href,
  page,
  size = "default"
}: {
  active: boolean;
  href: string;
  page: number;
  size?: "default" | "compact";
}) {
  const className =
    size === "compact"
      ? "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-xs font-semibold transition"
      : "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition";

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`${className} ${
        active
          ? "border-cyan-300/50 bg-cyan-300/20 text-cyan-100"
          : "border-white/10 text-zinc-300 hover:border-cyan-300/35 hover:text-cyan-100"
      }`}
      href={href}
    >
      {page}
    </Link>
  );
}

function PaginationControls({
  items,
  page,
  pageProps,
  size = "default"
}: {
  items: ReturnType<typeof getPaginationItems>;
  page: number;
  pageProps: Omit<StoryPaginationProps, "layout">;
  size?: "default" | "compact";
}) {
  const previousPage = page > 1 ? page - 1 : null;
  const nextPage = page < pageProps.totalPages ? page + 1 : null;

  return (
    <>
      <PaginationButton
        disabled={page <= 1}
        href={page > 1 ? buildPageHref(pageProps, 1) : undefined}
        size={size}
      >
        Đầu
      </PaginationButton>
      <PaginationButton
        disabled={!previousPage}
        href={previousPage ? buildPageHref(pageProps, previousPage) : undefined}
        size={size}
      >
        Trước
      </PaginationButton>

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span className="px-1 text-sm text-zinc-500" key={`ellipsis-${index}`}>
            …
          </span>
        ) : (
          <PageNumberLink
            active={item === page}
            href={buildPageHref(pageProps, item)}
            key={item}
            page={item}
            size={size}
          />
        )
      )}

      <PaginationButton
        disabled={!nextPage}
        href={nextPage ? buildPageHref(pageProps, nextPage) : undefined}
        size={size}
      >
        Sau
      </PaginationButton>
      <PaginationButton
        disabled={page >= pageProps.totalPages}
        href={page < pageProps.totalPages ? buildPageHref(pageProps, pageProps.totalPages) : undefined}
        size={size}
      >
        Cuối
      </PaginationButton>
    </>
  );
}

export function StoryPagination({ layout, ...props }: StoryPaginationProps) {
  const { page, totalPages } = props;

  if (totalPages <= 1) {
    return null;
  }

  const items = getPaginationItems(page, totalPages, 1);
  const pageProps = props;

  if (layout === "desktop") {
    return (
      <nav
        aria-label="Phân trang danh mục truyện"
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[var(--surface)] p-4"
      >
        <StoryPageSizeSelector
          filters={props.filters}
          genre={props.genre}
          page={props.page}
          pageSize={props.pageSize}
          query={props.query}
        />
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <PaginationControls items={items} page={page} pageProps={pageProps} />
        </div>
      </nav>
    );
  }

  const previousPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  return (
    <nav aria-label="Phân trang danh mục truyện" className="space-y-2.5 pt-1">
      <div className="flex items-center justify-center gap-2">
        <PaginationButton
          disabled={!previousPage}
          href={previousPage ? buildPageHref(pageProps, previousPage) : undefined}
          size="compact"
        >
          Trước
        </PaginationButton>
        <span className="px-1 text-xs font-medium text-zinc-400">
          Trang {page} / {totalPages}
        </span>
        <PaginationButton
          disabled={!nextPage}
          href={nextPage ? buildPageHref(pageProps, nextPage) : undefined}
          size="compact"
        >
          Sau
        </PaginationButton>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1">
        {items.map((item, index) =>
          item === "ellipsis" ? (
            <span className="px-0.5 text-[11px] text-zinc-500" key={`mobile-ellipsis-${index}`}>
              …
            </span>
          ) : (
            <PageNumberLink
              active={item === page}
              href={buildPageHref(pageProps, item)}
              key={`mobile-${item}`}
              page={item}
              size="compact"
            />
          )
        )}
      </div>
    </nav>
  );
}
