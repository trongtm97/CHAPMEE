import Link from "next/link";
import { buildCommunityGroupsHref } from "@/lib/community/community-groups-query";
import { getPaginationItems } from "@/lib/stories/story-catalog-query";
import type {
  CommunityGroupSort,
  CommunityGroupStatusFilter,
  CommunityGroupTab
} from "@/types/community-group";
import type { ReactNode } from "react";

type GroupPaginationProps = {
  page: number;
  totalPages: number;
  query: string;
  genre: string;
  sort: CommunityGroupSort;
  status: CommunityGroupStatusFilter;
  tab: CommunityGroupTab | null;
  pageSize: number;
};

function buildPageHref(props: GroupPaginationProps, targetPage: number) {
  return buildCommunityGroupsHref({
    q: props.query,
    genre: props.genre,
    sort: props.sort,
    status: props.status !== "all" ? props.status : undefined,
    tab: props.tab ?? undefined,
    page: targetPage,
    pageSize: props.pageSize !== 20 ? props.pageSize : undefined
  });
}

function PaginationButton({
  children,
  disabled,
  href
}: {
  children: ReactNode;
  disabled?: boolean;
  href?: string;
}) {
  if (disabled || !href) {
    return (
      <span
        aria-disabled="true"
        className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-white/5 bg-white/[0.02] px-2.5 text-xs font-semibold text-zinc-600"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-white/10 px-2.5 text-xs font-semibold text-zinc-200 transition hover:border-cyan-300/35 hover:text-cyan-100"
      href={href}
    >
      {children}
    </Link>
  );
}

export function GroupPagination(props: GroupPaginationProps) {
  const { page, totalPages } = props;

  if (totalPages <= 1) {
    return null;
  }

  const items = getPaginationItems(page, totalPages, 1);
  const previousPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  return (
    <nav aria-label="Phân trang nhóm truyện" className="space-y-2.5 pt-1">
      <div className="flex items-center justify-center gap-2">
        <PaginationButton
          disabled={!previousPage}
          href={previousPage ? buildPageHref(props, previousPage) : undefined}
        >
          Trước
        </PaginationButton>
        <span className="px-1 text-xs font-medium text-zinc-400">
          Trang {page} / {totalPages}
        </span>
        <PaginationButton
          disabled={!nextPage}
          href={nextPage ? buildPageHref(props, nextPage) : undefined}
        >
          Sau
        </PaginationButton>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1">
        {items.map((item, index) =>
          item === "ellipsis" ? (
            <span className="px-0.5 text-[11px] text-zinc-500" key={`ellipsis-${index}`}>
              …
            </span>
          ) : (
            <PaginationButton
              href={buildPageHref(props, item)}
              key={item}
            >
              <span
                className={
                  item === page
                    ? "rounded-md bg-cyan-300/20 px-1.5 py-0.5 text-cyan-100"
                    : undefined
                }
              >
                {item}
              </span>
            </PaginationButton>
          )
        )}
      </div>
    </nav>
  );
}
