import { ListPagination } from "@/components/ui/ListPagination";
import { buildPublicPostListQuery } from "@/lib/content-posts/public-catalog";
import type { PublicPostCategoryFilter, PublicPostSort } from "@/lib/content-posts/public-catalog";

type ContentPostPaginationProps = {
  page: number;
  totalPages: number;
  query: string;
  category: PublicPostCategoryFilter;
  sort: PublicPostSort;
};

export function ContentPostPagination({
  page,
  totalPages,
  query,
  category,
  sort
}: ContentPostPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const base = { q: query, category, sort };

  return (
    <div className="border-t border-white/8 pt-6">
      <ListPagination
        buildHref={(targetPage) =>
          `/bai-viet${buildPublicPostListQuery({ ...base, page: targetPage })}`
        }
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
