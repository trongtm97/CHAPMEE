import { ListPagination } from "@/components/ui/ListPagination";

type StudioPaginationProps = {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

export function StudioPagination({
  buildHref,
  page,
  totalPages
}: StudioPaginationProps) {
  return (
    <ListPagination
      buildHref={buildHref}
      className="px-1 pt-2"
      compact={false}
      page={page}
      totalPages={totalPages}
    />
  );
}
