import { ListPagination } from "@/components/ui/ListPagination";
import { StoryPageSizeSelector } from "@/components/stories/StoryPageSizeSelector";
import { buildCatalogHref } from "@/lib/stories/catalog-url";
import type { StoryCatalogFilterParams } from "@/lib/discovery/types";
import type { StoryCatalogSort, StoryCatalogStatus } from "@/types/story";

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

export function StoryPagination({ layout, ...props }: StoryPaginationProps) {
  const { page, totalPages } = props;

  if (totalPages <= 1) {
    return null;
  }

  const buildHref = (targetPage: number) => buildPageHref(props, targetPage);

  if (layout === "desktop") {
    return (
      <div className="space-y-4 rounded-2xl border border-white/10 bg-[var(--surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <StoryPageSizeSelector
            filters={props.filters}
            genre={props.genre}
            page={props.page}
            pageSize={props.pageSize}
            query={props.query}
          />
        </div>
        <ListPagination
          buildHref={buildHref}
          compact={false}
          page={page}
          totalPages={totalPages}
        />
      </div>
    );
  }

  return (
    <ListPagination
      buildHref={buildHref}
      className="pb-2 pt-1"
      compact
      page={page}
      totalPages={totalPages}
    />
  );
}
