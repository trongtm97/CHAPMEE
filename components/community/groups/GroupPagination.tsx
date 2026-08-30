import { ListPagination } from "@/components/ui/ListPagination";
import { buildCommunityGroupsHref } from "@/lib/community/community-groups-query";
import type {
  CommunityGroupSort,
  CommunityGroupStatusFilter,
  CommunityGroupTab
} from "@/types/community-group";

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

export function GroupPagination(props: GroupPaginationProps) {
  const { page, totalPages } = props;

  return (
    <ListPagination
      buildHref={(targetPage) => buildPageHref(props, targetPage)}
      className="pt-1"
      compact
      page={page}
      totalPages={totalPages}
    />
  );
}
