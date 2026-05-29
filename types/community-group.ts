import type { CommunityGroupBadge } from "@/types/community";

export const DEFAULT_COMMUNITY_GROUPS_PAGE_SIZE = 20;
/** In-memory sort/filter cap — keep low to protect dev server RAM. */
export const COMMUNITY_GROUPS_MAX_SCAN = 120;

export type CommunityGroupSort =
  | "hot"
  | "comments"
  | "members"
  | "new_chapter"
  | "author_reply"
  | "newest";

export type CommunityGroupTab = "following" | "hot" | "new_chapter" | "author_reply";

export type CommunityGroupStatusFilter =
  | "all"
  | "hot"
  | "new_chapter"
  | "author_reply"
  | "following"
  | "reading";

export type CommunityGroupTypeKind = "story" | "custom";

export type SuggestedGroupType =
  | "story"
  | "fan_theory"
  | "review"
  | "spoiler"
  | "ask_author";

export type CommunityGroupItem = {
  id: string;
  slug: string;
  storyId: string;
  name: string;
  storyTitle: string;
  authorName: string | null;
  genreName: string | null;
  genreSlug: string | null;
  coverUrl: string | null;
  memberCount: number;
  postCount: number;
  newCommentCount: number;
  lastActivityAt: string | null;
  badge: CommunityGroupBadge | null;
  statusLine: string;
  hotScore: number;
  groupType: CommunityGroupTypeKind;
};

export type CommunityGroupGenre = {
  slug: string;
  name: string;
};

export type CommunityGroupsCatalogResult = {
  items: CommunityGroupItem[];
  genres: CommunityGroupGenre[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  genre: string;
  sort: CommunityGroupSort;
  status: CommunityGroupStatusFilter;
  tab: CommunityGroupTab | null;
  error: string | null;
};

/** Admin / product flags — wire to admin settings when available. */
export type CommunityGroupAdminConfig = {
  enableCommunityGroups: boolean;
  allowUserGroupSuggestions: boolean;
  requireGroupApproval: boolean;
  maxGroupsPerStory: number;
  maxGroupNameLength: number;
  maxGroupDescriptionLength: number;
};

export const DEFAULT_GROUP_ADMIN_CONFIG: CommunityGroupAdminConfig = {
  enableCommunityGroups: true,
  allowUserGroupSuggestions: true,
  requireGroupApproval: true,
  maxGroupsPerStory: 5,
  maxGroupNameLength: 80,
  maxGroupDescriptionLength: 280
};

export type GroupSuggestionInput = {
  storyId: string;
  name: string;
  description: string;
  groupType: SuggestedGroupType;
  hasSpoiler: boolean;
  /** Default groups are system-owned per story_id — users submit subgroups only. */
  isDefaultGroup: boolean;
};
