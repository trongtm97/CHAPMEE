import { createClient } from "@/lib/supabase/server";
import {
  buildFeedItemsFromPosts,
  computeHotScore,
  sortFeedItemsByTab
} from "@/lib/community/build-unified-feed";
import {
  decodeCommunityFeedCursor,
  encodeCommunityFeedCursor,
  type CommunityFeedSource
} from "@/lib/community/community-feed-cursor";
import {
  attachCommentCounts,
  mapCommunityPostRows,
  previewCommunityContent
} from "@/lib/community/map-community-posts";
import type {
  AuthorCommunityGroup,
  CommunityFeedItem,
  CommunityFeedPageResponse,
  CommunityFeedTab,
  StoryCommunityGroup
} from "@/types/community";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;
/** Chỉ lấy vài post mỗi lần để còn trang sau (tránh hút hết 4–40 bài một lần). */
const POSTS_PER_PAGE = 3;
const COMMENTS_PER_PAGE = 10;

export type GetCommunityFeedParams = {
  tab?: CommunityFeedTab;
  cursor?: string | null;
  limit?: number;
  q?: string;
  storyGroups?: StoryCommunityGroup[];
  authorGroups?: AuthorCommunityGroup[];
};

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  story_id: string | null;
  episode_id: string | null;
  profiles:
    | { display_name: string | null; username: string | null }
    | { display_name: string | null; username: string | null }[]
    | null;
  stories:
    | { title: string | null; slug: string | null }
    | { title: string | null; slug: string | null }[]
    | null;
  episodes:
    | { episode_number: number | null }
    | { episode_number: number | null }[]
    | null;
};

function clampLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT);
}

function escapeIlike(value: string) {
  return value.replace(/[%_,]/g, "");
}

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function dedupeFeedItems(items: CommunityFeedItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function matchesSearch(item: CommunityFeedItem, q: string) {
  const normalized = q.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  const haystack = [
    item.title ?? "",
    item.body,
    item.authorName,
    item.storyTitle ?? "",
    item.authorChipName ?? ""
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

async function fetchPostBatch(
  tab: CommunityFeedTab,
  cursor: { createdAt: string; id: string } | null,
  search: string | undefined
) {
  const supabase = await createClient();
  let query = supabase
    .from("community_posts")
    .select(
      "id, type, title, content, created_at, story_id, profiles!community_posts_user_id_fkey(display_name, username), stories(title, slug, creator_id, creator_profiles(id, pen_name))"
    )
    .eq("status", "approved")
    .in("type", ["discussion", "review", "poll_placeholder", "challenge"]);

  if (search) {
    const pattern = `%${escapeIlike(search)}%`;
    query = query.or(`title.ilike.${pattern},content.ilike.${pattern}`);
  }

  if (tab === "following") {
    query = query.not("story_id", "is", null);
  }

  const { data, error } = await (cursor
    ? query
        .lt("created_at", cursor.createdAt)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(POSTS_PER_PAGE + 1)
    : query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(POSTS_PER_PAGE + 1));

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const hasMore = rows.length > POSTS_PER_PAGE;
  const postRows = rows.slice(0, POSTS_PER_PAGE);
  const posts = await attachCommentCounts(mapCommunityPostRows(postRows as never));
  const last = postRows[postRows.length - 1];

  return {
    hasMore,
    last: last ? { createdAt: last.created_at, id: last.id } : null,
    posts
  };
}

function commentToFeedItem(row: CommentRow): CommunityFeedItem {
  const author = firstRelation(row.profiles);
  const story = firstRelation(row.stories);
  const episode = firstRelation(row.episodes);
  const authorName =
    author?.display_name ?? author?.username ?? "Độc giả ChapMee";
  const voteCount = 6 + (row.id.charCodeAt(0) % 80);
  const commentCount = 2 + (row.id.charCodeAt(2) % 12);

  return {
    id: `comment-feed-${row.id}`,
    kind: "story_comment_highlight",
    authorName,
    authorUsername: author?.username?.trim().toLowerCase() ?? null,
    authorRole: "reader",
    createdAt: row.created_at,
    title: null,
    body: previewCommunityContent(row.content),
    storyId: row.story_id,
    storyTitle: story?.title ?? null,
    storySlug: story?.slug ?? null,
    chapterLabel: episode?.episode_number
      ? `Chương ${episode.episode_number}`
      : null,
    authorChipName: null,
    authorId: null,
    groupType: "story",
    groupId: row.story_id,
    groupLabel: "Bình luận truyện",
    voteCount,
    commentCount,
    isSpoiler: false,
    hotScore: computeHotScore(voteCount, commentCount, row.created_at),
    featuredCommentPreview: null,
    threadPostId: row.id
  };
}

async function fetchCommentBatch(
  cursor: { createdAt: string; id: string } | null,
  search: string | undefined
) {
  const supabase = await createClient();
  let query = supabase
    .from("comments")
    .select(
      "id, content, created_at, story_id, episode_id, profiles(display_name, username), stories(title, slug), episodes(episode_number)"
    )
    .eq("status", "visible")
    .not("story_id", "is", null);

  if (search) {
    const pattern = `%${escapeIlike(search)}%`;
    query = query.ilike("content", pattern);
  }

  const { data, error } = await (cursor
    ? query
        .lt("created_at", cursor.createdAt)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(COMMENTS_PER_PAGE + 1)
    : query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(COMMENTS_PER_PAGE + 1));

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as CommentRow[];
  const hasMore = rows.length > COMMENTS_PER_PAGE;
  const slice = rows.slice(0, COMMENTS_PER_PAGE);
  const last = slice[slice.length - 1];

  return {
    hasMore,
    items: slice.map(commentToFeedItem),
    last: last ? { createdAt: last.created_at, id: last.id } : null
  };
}

function encodeCursor(
  tab: CommunityFeedTab,
  source: CommunityFeedSource,
  last: { createdAt: string; id: string } | null,
  hotScore?: number
) {
  if (!last) {
    return null;
  }

  return encodeCommunityFeedCursor({
    tab,
    source,
    createdAt: last.createdAt,
    id: last.id,
    hotScore
  });
}

export async function getCommunityFeedPage(
  params: GetCommunityFeedParams
): Promise<CommunityFeedPageResponse> {
  const tab = params.tab ?? "for_you";
  const limit = clampLimit(params.limit);
  const storyGroups = params.storyGroups ?? [];
  const authorGroups = params.authorGroups ?? [];
  const search = params.q?.trim();
  const decoded = decodeCommunityFeedCursor(params.cursor);
  const source: CommunityFeedSource = decoded?.source ?? "posts";

  try {
    let items: CommunityFeedItem[] = [];
    let hasMore = false;
    let nextCursor: string | null = null;

    if (source === "posts") {
      const postBatch = await fetchPostBatch(
        tab,
        decoded ? { createdAt: decoded.createdAt, id: decoded.id } : null,
        search
      );

      items = buildFeedItemsFromPosts(postBatch.posts, storyGroups, authorGroups, {
        includeFallbackHighlight: !decoded && !search
      });

      items = sortFeedItemsByTab(items, tab);

      if (postBatch.hasMore && postBatch.last) {
        hasMore = true;
        nextCursor = encodeCursor(tab, "posts", postBatch.last, items.at(-1)?.hotScore);
      } else if (!search) {
        const commentBatch = await fetchCommentBatch(null, undefined);
        items = dedupeFeedItems([...items, ...commentBatch.items]);

        if (commentBatch.hasMore && commentBatch.last) {
          hasMore = true;
          nextCursor = encodeCursor(
            tab,
            "comments",
            commentBatch.last,
            items.at(-1)?.hotScore
          );
        }
      }
    } else {
      const commentBatch = await fetchCommentBatch(
        decoded ? { createdAt: decoded.createdAt, id: decoded.id } : null,
        search
      );
      items = commentBatch.items;

      if (commentBatch.hasMore && commentBatch.last) {
        hasMore = true;
        nextCursor = encodeCursor(
          tab,
          "comments",
          commentBatch.last,
          items.at(-1)?.hotScore
        );
      }
    }

    items = dedupeFeedItems(items.filter((item) => matchesSearch(item, search ?? "")));
    const pageItems = items.slice(0, limit);

    if (pageItems.length === 0 && !hasMore) {
      return { items: [], nextCursor: null, hasMore: false, error: null };
    }

    if (hasMore && !nextCursor && pageItems.length > 0) {
      const last = pageItems[pageItems.length - 1];
      nextCursor = encodeCommunityFeedCursor({
        tab,
        source: source === "posts" ? "comments" : source,
        createdAt: last.createdAt,
        id: last.threadPostId,
        hotScore: last.hotScore
      });
    }

    return {
      items: pageItems,
      nextCursor,
      hasMore,
      error: null
    };
  } catch (error) {
    return {
      items: [],
      nextCursor: null,
      hasMore: false,
      error:
        error instanceof Error ? error.message : "Không thể tải bảng tin."
    };
  }
}

export async function getCommunitySession(): Promise<{
  isLoggedIn: boolean;
  userId: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error && !error.message.toLowerCase().includes("auth session missing")) {
      throw error;
    }

    return { isLoggedIn: Boolean(user), userId: user?.id ?? null };
  } catch {
    return { isLoggedIn: false, userId: null };
  }
}
