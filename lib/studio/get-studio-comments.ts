import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { getStoryUrl, getChapterUrl } from "@/lib/urls/paths";
import { getStudioStoryGroups } from "@/lib/studio/get-studio-story-groups";
import { paginateList, parseStudioPage } from "@/lib/studio/pagination";
import {
  computeCommentStats,
  computeCommentTabCounts,
  filterCommentsBySearch,
  filterCommentsByTab,
  hasActiveCommentFilters,
  matchesCommentTimeFilter,
  parseCommentPageSize,
  sortStudioComments
} from "@/lib/studio/comments-query";
import type {
  CommentListPageSize,
  StudioCommentFilter,
  StudioCommentInboxItem,
  StudioCommentInboxStatus,
  StudioCommentSort,
  StudioCommentsPageData,
  StudioCommentTimeFilter
} from "@/types/comments";

const PER_SOURCE_LIMIT = 80;

type StoryCommentRow = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  status: string;
  is_pinned: boolean;
  story_id: string;
  episode_id: string | null;
  profiles:
    | {
        display_name: string | null;
        username: string | null;
        avatar_url: string | null;
      }
    | {
        display_name: string | null;
        username: string | null;
        avatar_url: string | null;
      }[]
    | null;
  stories:
    | { title: string; slug: string; public_code: string }
    | { title: string; slug: string; public_code: string }[]
    | null;
  episodes:
    | { slug: string; public_code: string; episode_number: number; title: string | null }
    | { slug: string; public_code: string; episode_number: number; title: string | null }[]
    | null;
};

type CommunityCommentRow = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  status: string;
  is_pinned: boolean;
  community_post_id: string;
  profiles:
    | {
        display_name: string | null;
        username: string | null;
        avatar_url: string | null;
      }
    | {
        display_name: string | null;
        username: string | null;
        avatar_url: string | null;
      }[]
    | null;
  community_posts:
    | {
        id: string;
        title: string;
        story_id: string | null;
        stories: { title: string; slug: string } | { title: string; slug: string }[] | null;
      }
    | {
        id: string;
        title: string;
        story_id: string | null;
        stories: { title: string; slug: string } | { title: string; slug: string }[] | null;
      }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function buildStoryContextHref(
  story: { slug: string; public_code: string },
  episode: { slug: string; public_code: string } | null
) {
  if (episode) {
    return getChapterUrl(story, episode);
  }

  return getStoryUrl(story);
}

function buildStoryContextLabel(
  storyTitle: string,
  episodeNumber: number | null,
  episodeTitle: string | null
) {
  if (episodeNumber != null) {
    const chapterLabel = episodeTitle
      ? `Ch. ${episodeNumber}: ${episodeTitle}`
      : `Chương ${episodeNumber}`;
    return `${storyTitle} · ${chapterLabel}`;
  }

  return storyTitle;
}

function resolveInboxStatus(options: {
  isHidden: boolean;
  hasOpenReport: boolean;
  hasAuthorReply: boolean;
}): StudioCommentInboxStatus {
  if (options.isHidden) {
    return "hidden";
  }

  if (options.hasOpenReport) {
    return "reported";
  }

  if (options.hasAuthorReply) {
    return "replied";
  }

  return "new";
}

export { normalizeStudioCommentFilter } from "@/lib/studio/comments-query";

async function getOwnedCommunityPostIds(
  creatorProfile: CreatorProfile,
  storyIds: string[],
  storyFilter?: string
) {
  const supabase = await createClient();
  const postIdSet = new Map<string, { title: string; storyId: string | null }>();

  let byCreator = supabase
    .from("community_posts")
    .select("id, title, story_id")
    .eq("creator_id", creatorProfile.id)
    .neq("status", "rejected");

  if (storyFilter) {
    byCreator = byCreator.eq("story_id", storyFilter);
  }

  const { data: creatorPosts } = await byCreator.limit(100);

  for (const post of creatorPosts ?? []) {
    postIdSet.set(post.id, { title: post.title, storyId: post.story_id });
  }

  const scopedStoryIds = storyFilter ? [storyFilter] : storyIds;

  if (scopedStoryIds.length > 0) {
    const { data: storyPosts } = await supabase
      .from("community_posts")
      .select("id, title, story_id")
      .in("story_id", scopedStoryIds)
      .eq("status", "approved")
      .limit(100);

    for (const post of storyPosts ?? []) {
      postIdSet.set(post.id, { title: post.title, storyId: post.story_id });
    }
  }

  return postIdSet;
}

async function enrichCommentMeta(
  commentIds: string[],
  creatorUserId: string
) {
  const repliedSet = new Set<string>();
  const reportedSet = new Set<string>();
  const replyCountById = new Map<string, number>();
  const likeCountById = new Map<string, number>();

  if (commentIds.length === 0) {
    return { repliedSet, reportedSet, replyCountById, likeCountById };
  }

  const supabase = await createClient();
  const [{ data: replies }, { data: reports }, { data: childComments }, { data: reactions }] =
    await Promise.all([
      supabase
        .from("comments")
        .select("parent_id")
        .in("parent_id", commentIds)
        .eq("user_id", creatorUserId)
        .neq("status", "deleted"),
      supabase
        .from("reports")
        .select("target_id")
        .eq("target_type", "comment")
        .in("target_id", commentIds)
        .in("status", ["pending", "reviewing", "open"]),
      supabase
        .from("comments")
        .select("parent_id")
        .in("parent_id", commentIds)
        .neq("status", "deleted"),
      supabase
        .from("reactions")
        .select("target_id")
        .eq("target_type", "comment")
        .in("target_id", commentIds)
    ]);

  for (const reply of replies ?? []) {
    if (reply.parent_id) {
      repliedSet.add(reply.parent_id);
    }
  }

  for (const report of reports ?? []) {
    if (report.target_id) {
      reportedSet.add(report.target_id);
    }
  }

  for (const child of childComments ?? []) {
    if (child.parent_id) {
      replyCountById.set(
        child.parent_id,
        (replyCountById.get(child.parent_id) ?? 0) + 1
      );
    }
  }

  for (const reaction of reactions ?? []) {
    if (reaction.target_id) {
      likeCountById.set(
        reaction.target_id,
        (likeCountById.get(reaction.target_id) ?? 0) + 1
      );
    }
  }

  return { repliedSet, reportedSet, replyCountById, likeCountById };
}

export async function getStudioComments(
  creatorProfile: CreatorProfile,
  creatorUserId: string,
  options: {
    filter?: StudioCommentFilter;
    storyId?: string;
    q?: string;
    time?: StudioCommentTimeFilter;
    sort?: StudioCommentSort;
    page?: string;
    pageSize?: CommentListPageSize;
  } = {}
): Promise<StudioCommentsPageData> {
  const filter = options.filter ?? "all";
  const time = options.time ?? "all";
  const sort = options.sort ?? "newest";
  const page = parseStudioPage(options.page);
  const pageSize = options.pageSize ?? parseCommentPageSize();
  const search = options.q?.trim() ?? "";
  const supabase = await createClient();

  const { data: storyRows, error: storiesError } = await supabase
    .from("stories")
    .select("id, title")
    .eq("creator_id", creatorProfile.id)
    .order("title", { ascending: true });

  if (storiesError) {
    return emptyPageData(storiesError.message);
  }

  const stories = (storyRows ?? []).map((row) => ({
    id: row.id,
    title: row.title
  }));

  const storyIds = stories.map((row) => row.id);

  if (options.storyId && !storyIds.includes(options.storyId)) {
    const storyGroups = await getStudioStoryGroups(creatorProfile);
    return {
      comments: [],
      stories,
      storyGroups: storyGroups.slice(0, 5),
      stats: { newRecent: 0, unreplied: 0, reported: 0, pinned: 0 },
      tabCounts: {
        all: 0,
        unreplied: 0,
        replied: 0,
        pinned: 0,
        reported: 0,
        hidden: 0
      },
      filteredIds: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      hasActiveFilters: hasActiveCommentFilters({
        filter,
        q: search,
        sort,
        storyId: options.storyId,
        time
      }),
      error: null
    };
  }

  const scopedStoryIds = options.storyId ? [options.storyId] : storyIds;
  const items: StudioCommentInboxItem[] = [];

  if (scopedStoryIds.length > 0) {
    const buildStoryQuery = (excludeCommunityPostComments: boolean) => {
      let storyQuery = supabase
        .from("comments")
        .select(
          `
          id,
          user_id,
          content,
          created_at,
          status,
          is_pinned,
          story_id,
          episode_id,
          profiles(display_name, username, avatar_url),
          stories!inner(title, slug, public_code),
          episodes(slug, public_code, episode_number, title)
        `
        )
        .in("story_id", scopedStoryIds)
        .is("parent_id", null)
        .neq("status", "deleted")
        .order("created_at", { ascending: false })
        .limit(PER_SOURCE_LIMIT);

      if (excludeCommunityPostComments) {
        storyQuery = storyQuery.is("community_post_id", null);
      }

      if (filter === "hidden") {
        storyQuery = storyQuery.eq("status", "hidden");
      } else {
        storyQuery = storyQuery.in("status", ["visible", "hidden", "pending"]);
      }

      if (filter === "pinned") {
        storyQuery = storyQuery.eq("is_pinned", true).eq("status", "visible");
      }

      return storyQuery;
    };

    let { data: storyCommentRows, error: storyCommentsError } = await buildStoryQuery(true);

    if (
      storyCommentsError?.message.includes("community_post_id") ||
      storyCommentsError?.message.includes("does not exist")
    ) {
      ({ data: storyCommentRows, error: storyCommentsError } = await buildStoryQuery(false));
    }

    if (storyCommentsError) {
      return emptyPageData(storyCommentsError.message, stories);
    }

    const rows = (storyCommentRows ?? []) as unknown as StoryCommentRow[];
    const { repliedSet, reportedSet, replyCountById, likeCountById } =
      await enrichCommentMeta(
        rows.map((row) => row.id),
        creatorUserId
      );

    for (const row of rows) {
      const profile = firstRelation(row.profiles);
      const story = firstRelation(row.stories);
      const episode = firstRelation(row.episodes);
      const episodeNumber = episode?.episode_number ?? null;
      const storyTitle = story?.title ?? "Truyện";
      const storySlug = story?.slug ?? "";
      const isHidden = row.status === "hidden";
      const hasOpenReport = reportedSet.has(row.id);
      const hasAuthorReply = repliedSet.has(row.id);

      items.push({
        id: row.id,
        content: row.content,
        createdAt: row.created_at,
        status: resolveInboxStatus({ isHidden, hasOpenReport, hasAuthorReply }),
        source: "story",
        isPinned: Boolean(row.is_pinned),
        isHidden,
        hasOpenReport,
        hasAuthorReply,
        authorUserId: row.user_id,
        authorDisplayName: profile?.display_name ?? profile?.username ?? "Độc giả",
        authorAvatarUrl: profile?.avatar_url ?? null,
        storyId: row.story_id,
        storyTitle,
        storySlug,
        episodeId: row.episode_id,
        episodeNumber,
        episodeTitle: episode?.title ?? null,
        communityPostId: null,
        communityPostTitle: null,
        contextLabel: buildStoryContextLabel(
          storyTitle,
          episodeNumber,
          episode?.title ?? null
        ),
        contextHref:
          story?.slug && story.public_code
            ? buildStoryContextHref(
                { slug: story.slug, public_code: story.public_code },
                episode?.slug && episode.public_code
                  ? { slug: episode.slug, public_code: episode.public_code }
                  : null
              )
            : "#",
        likeCount: likeCountById.get(row.id) ?? 0,
        replyCount: replyCountById.get(row.id) ?? 0
      });
    }
  }

  const ownedPosts = await getOwnedCommunityPostIds(
    creatorProfile,
    storyIds,
    options.storyId
  );
  const communityPostIds = [...ownedPosts.keys()];

  if (communityPostIds.length > 0) {
    let communityQuery = supabase
      .from("comments")
      .select(
        `
        id,
        user_id,
        content,
        created_at,
        status,
        is_pinned,
        community_post_id,
        profiles(display_name, username, avatar_url),
        community_posts!inner(id, title, story_id, stories(title, slug))
      `
      )
      .in("community_post_id", communityPostIds)
      .is("parent_id", null)
      .neq("status", "deleted")
      .order("created_at", { ascending: false })
      .limit(PER_SOURCE_LIMIT);

    if (filter === "hidden") {
      communityQuery = communityQuery.eq("status", "hidden");
    } else {
      communityQuery = communityQuery.in("status", ["visible", "hidden", "pending"]);
    }

    if (filter === "pinned") {
      communityQuery = communityQuery.eq("is_pinned", true).eq("status", "visible");
    }

    const { data: communityRows, error: communityError } = await communityQuery;

    if (communityError) {
      const missingColumn = communityError.message.includes("community_post_id");
      if (!missingColumn) {
        return emptyPageData(communityError.message, stories);
      }
    } else {
      const rows = (communityRows ?? []) as unknown as CommunityCommentRow[];
      const existingIds = new Set(items.map((item) => item.id));
      const newRows = rows.filter((row) => !existingIds.has(row.id));
      const { repliedSet, reportedSet, replyCountById, likeCountById } =
        await enrichCommentMeta(
          newRows.map((row) => row.id),
          creatorUserId
        );

      for (const row of newRows) {
        const profile = firstRelation(row.profiles);
        const post = firstRelation(row.community_posts);
        const story = firstRelation(post?.stories ?? null);
        const postTitle = post?.title ?? "Bài cộng đồng";
        const storyTitle = story?.title ?? null;
        const isHidden = row.status === "hidden";
        const hasOpenReport = reportedSet.has(row.id);
        const hasAuthorReply = repliedSet.has(row.id);

        const contextLabel = storyTitle
          ? `Bài cộng đồng · ${postTitle} · ${storyTitle}`
          : `Bài cộng đồng · ${postTitle}`;

        items.push({
          id: row.id,
          content: row.content,
          createdAt: row.created_at,
          status: resolveInboxStatus({ isHidden, hasOpenReport, hasAuthorReply }),
          source: "community_post",
          isPinned: Boolean(row.is_pinned),
          isHidden,
          hasOpenReport,
          hasAuthorReply,
          authorUserId: row.user_id,
          authorDisplayName:
            profile?.display_name ?? profile?.username ?? "Độc giả",
          authorAvatarUrl: profile?.avatar_url ?? null,
          storyId: post?.story_id ?? null,
          storyTitle,
          storySlug: story?.slug ?? null,
          episodeId: null,
          episodeNumber: null,
          episodeTitle: null,
          communityPostId: row.community_post_id,
          communityPostTitle: postTitle,
          contextLabel,
          contextHref: `/community/${row.community_post_id}#comments`,
          likeCount: likeCountById.get(row.id) ?? 0,
          replyCount: replyCountById.get(row.id) ?? 0
        });
      }
    }
  }

  const tabCounts = computeCommentTabCounts(items);
  const stats = computeCommentStats(items);

  let filtered = filterCommentsByTab(items, filter);
  filtered = filterCommentsBySearch(filtered, search);
  filtered = filtered.filter((item) => matchesCommentTimeFilter(item.createdAt, time));
  filtered = sortStudioComments(filtered, sort);

  const { items: pageItems, total, totalPages, page: safePage } = paginateList(
    filtered,
    page,
    pageSize
  );

  const storyGroups = await getStudioStoryGroups(creatorProfile);

  return {
    comments: pageItems,
    stories,
    storyGroups: storyGroups.slice(0, 5),
    stats,
    tabCounts,
    filteredIds: filtered.map((item) => item.id),
    total,
    page: safePage,
    pageSize,
    totalPages,
    hasActiveFilters: hasActiveCommentFilters({
      filter,
      q: search,
      sort,
      storyId: options.storyId,
      time
    }),
    error: null
  };
}

function emptyPageData(
  error: string,
  stories: StudioCommentsPageData["stories"] = []
): StudioCommentsPageData {
  return {
    comments: [],
    stories,
    storyGroups: [],
    stats: { newRecent: 0, unreplied: 0, reported: 0, pinned: 0 },
    tabCounts: {
      all: 0,
      unreplied: 0,
      replied: 0,
      pinned: 0,
      reported: 0,
      hidden: 0
    },
    filteredIds: [],
    total: 0,
    page: 1,
    pageSize: parseCommentPageSize(),
    totalPages: 1,
    hasActiveFilters: false,
    error
  };
}

export {
  normalizeStudioCommentSort,
  normalizeStudioCommentTimeFilter,
  parseCommentPageSize,
  buildCommentsQuery
} from "@/lib/studio/comments-query";
