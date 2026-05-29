import { clampPage, clampPageSize } from "@/lib/stories/story-catalog-query";
import {
  DEFAULT_COMMUNITY_GROUPS_PAGE_SIZE,
  type CommunityGroupSort,
  type CommunityGroupStatusFilter,
  type CommunityGroupTab
} from "@/types/community-group";

export type CommunityGroupsUrlParams = {
  q?: string;
  genre?: string;
  sort?: CommunityGroupSort;
  status?: CommunityGroupStatusFilter;
  tab?: CommunityGroupTab;
  page?: number;
  pageSize?: number;
};

export type NormalizedCommunityGroupsParams = {
  q: string;
  genre: string;
  sort: CommunityGroupSort;
  status: CommunityGroupStatusFilter;
  tab: CommunityGroupTab | null;
  page: number;
  pageSize: number;
};

const VALID_SORTS: CommunityGroupSort[] = [
  "hot",
  "comments",
  "members",
  "new_chapter",
  "author_reply",
  "newest"
];

const VALID_STATUS: CommunityGroupStatusFilter[] = [
  "all",
  "hot",
  "new_chapter",
  "author_reply",
  "following",
  "reading"
];

const VALID_TABS: CommunityGroupTab[] = ["following", "hot", "new_chapter", "author_reply"];

export function normalizeCommunityGroupsParams(
  searchParams: Record<string, string | undefined>
): NormalizedCommunityGroupsParams {
  const sortParam = searchParams.sort;
  const sort = VALID_SORTS.includes(sortParam as CommunityGroupSort)
    ? (sortParam as CommunityGroupSort)
    : "hot";

  const statusParam = searchParams.status;
  const status = VALID_STATUS.includes(statusParam as CommunityGroupStatusFilter)
    ? (statusParam as CommunityGroupStatusFilter)
    : "all";

  const tabParam = searchParams.tab;
  const tab = VALID_TABS.includes(tabParam as CommunityGroupTab)
    ? (tabParam as CommunityGroupTab)
    : null;

  return {
    q: (searchParams.q ?? "").trim(),
    genre: (searchParams.genre ?? "").trim(),
    sort,
    status: tab ? mapTabToStatus(tab) : status,
    tab,
    page: clampPage(Number(searchParams.page ?? "1")),
    pageSize: clampPageSize(
      Number(searchParams.pageSize ?? String(DEFAULT_COMMUNITY_GROUPS_PAGE_SIZE))
    )
  };
}

function mapTabToStatus(tab: CommunityGroupTab): CommunityGroupStatusFilter {
  if (tab === "following") {
    return "following";
  }
  return tab;
}

export function buildCommunityGroupsHref(params: CommunityGroupsUrlParams = {}) {
  const search = new URLSearchParams();
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }
  if (params.genre?.trim()) {
    search.set("genre", params.genre.trim());
  }
  if (params.sort && params.sort !== "hot") {
    search.set("sort", params.sort);
  }
  if (params.status && params.status !== "all") {
    search.set("status", params.status);
  }
  if (params.tab) {
    search.set("tab", params.tab);
  }
  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }
  if (params.pageSize && params.pageSize !== DEFAULT_COMMUNITY_GROUPS_PAGE_SIZE) {
    search.set("pageSize", String(params.pageSize));
  }
  const query = search.toString();
  return query ? `/community/groups?${query}` : "/community/groups";
}
