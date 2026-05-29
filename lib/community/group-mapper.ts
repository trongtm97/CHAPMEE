import type { CommunityGroupBadge, StoryCommunityGroup } from "@/types/community";
import type { CommunityGroupItem } from "@/types/community-group";

type StoryRowForGroup = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  published_at: string | null;
  creator_profiles:
    | { pen_name: string | null }
    | { pen_name: string | null }[]
    | null;
  genres:
    | { name: string | null; slug: string | null }
    | { name: string | null; slug: string | null }[]
    | null;
};

export function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function badgeForStory(storyId: string, index: number): CommunityGroupBadge | null {
  const mod = hashString(storyId) % 5;

  if (mod === 0) {
    return "author_reply";
  }

  if (mod === 1) {
    return "new_chapter";
  }

  if (index === 0) {
    return "hot";
  }

  return mod === 2 ? "hot" : null;
}

function statusLineForGroup(
  storyId: string,
  postCount: number,
  badge: CommunityGroupBadge | null,
  genreName: string | null
) {
  if (badge === "author_reply") {
    return "Tác giả vừa trả lời";
  }

  if (badge === "new_chapter") {
    return "Có chương mới";
  }

  const comments = 12 + (hashString(storyId) % 180);
  const genreSuffix = genreName ? ` · ${genreName}` : "";

  if (postCount > 0) {
    return `${postCount} bài trong nhóm${genreSuffix}`;
  }

  return `${comments} bình luận mới${genreSuffix}`;
}

export function mapStoryRowToCommunityGroup(
  row: StoryRowForGroup,
  index: number,
  counts: { postCount: number; commentCount: number }
): CommunityGroupItem {
  const creator = firstRelation(row.creator_profiles);
  const genre = firstRelation(row.genres);
  const badge = badgeForStory(row.id, index);
  const memberCount = 80 + (hashString(row.id) % 420);
  const postCount = counts.postCount;
  const newCommentCount = counts.commentCount || 12 + (hashString(row.id) % 80);
  const hotScore =
    memberCount + postCount * 8 + newCommentCount * 2 + (badge === "hot" ? 40 : 0);

  return {
    id: `story-group-${row.id}`,
    slug: row.slug,
    storyId: row.id,
    name: row.title,
    storyTitle: row.title,
    authorName: creator?.pen_name ?? null,
    genreName: genre?.name ?? null,
    genreSlug: genre?.slug ?? null,
    coverUrl: row.cover_url,
    memberCount,
    postCount,
    newCommentCount,
    lastActivityAt: row.published_at,
    badge,
    statusLine: statusLineForGroup(row.id, postCount, badge, genre?.name ?? null),
    hotScore,
    groupType: "story"
  };
}

export function sortCommunityGroups(
  groups: CommunityGroupItem[],
  sort: import("@/types/community-group").CommunityGroupSort
) {
  const copy = [...groups];

  switch (sort) {
    case "comments":
      return copy.sort((a, b) => b.newCommentCount - a.newCommentCount || b.hotScore - a.hotScore);
    case "members":
      return copy.sort((a, b) => b.memberCount - a.memberCount || b.hotScore - a.hotScore);
    case "new_chapter":
      return copy.sort((a, b) => {
        const aScore = a.badge === "new_chapter" ? 1 : 0;
        const bScore = b.badge === "new_chapter" ? 1 : 0;
        return bScore - aScore || b.hotScore - a.hotScore;
      });
    case "author_reply":
      return copy.sort((a, b) => {
        const aScore = a.badge === "author_reply" ? 1 : 0;
        const bScore = b.badge === "author_reply" ? 1 : 0;
        return bScore - aScore || b.hotScore - a.hotScore;
      });
    case "newest":
      return copy.sort((a, b) => {
        const aTime = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
        const bTime = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
        return bTime - aTime || b.hotScore - a.hotScore;
      });
    case "hot":
    default:
      return copy.sort((a, b) => b.hotScore - a.hotScore);
  }
}

export function filterCommunityGroupsByStatus(
  groups: CommunityGroupItem[],
  status: import("@/types/community-group").CommunityGroupStatusFilter
) {
  switch (status) {
    case "hot":
      return groups.filter((group) => group.badge === "hot");
    case "new_chapter":
      return groups.filter((group) => group.badge === "new_chapter");
    case "author_reply":
      return groups.filter((group) => group.badge === "author_reply");
    default:
      return groups;
  }
}

export function toStoryCommunityGroup(group: CommunityGroupItem): StoryCommunityGroup {
  return {
    id: group.id,
    storyId: group.storyId,
    name: group.name,
    slug: group.slug,
    coverUrl: group.coverUrl,
    authorName: group.authorName,
    memberCount: group.memberCount,
    todayPostCount: group.postCount,
    badge: group.badge,
    statusLine: group.statusLine,
    hotScore: group.hotScore
  };
}
