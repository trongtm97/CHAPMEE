import type { CommunityPost } from "@/lib/community/getCommunityFeed";
import { getDefaultAvatarUrl, getStableDefaultAvatarId } from "@/lib/profile/default-avatar";
import type {
  AuthorCommunityGroup,
  CommunityFeedItem,
  CommunityFeedTab,
  CommunityRole,
  EnrichedCommunityPost,
  PollOption,
  StoryCommunityGroup
} from "@/types/community";

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function inferRole(post: CommunityPost): CommunityRole {
  const name = (post.authorName ?? "").toLowerCase();

  if (name.includes("mod") || name.includes("quản trị")) {
    return "mod";
  }

  if (hashString(post.id) % 9 === 0) {
    return "creator";
  }

  return "reader";
}

export function computeHotScore(
  voteCount: number,
  commentCount: number,
  createdAt: string
) {
  const ageHours =
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const recencyBoost = Math.max(0, 48 - ageHours) * 2;

  return voteCount + commentCount * 2 + recencyBoost;
}

const highlightQuotes = [
  "Nhân vật phụ lần này lộ xác hẳn, vote nếu bạn cũng bất ngờ!",
  "Đoạn cuối chương làm mình khóc — ai đọc rồi cho mình biết có phải mình quá nhạy cảm không?",
  "Tác giả hint chapter sau có twist — các bạn đoán thế nào?",
  "Mình ship cặp phụ này thật sự, có ai cùng team không?"
];

const defaultPollOptions: PollOption[] = [
  { id: "a", label: "Cuốn, đọc tiếp", votes: 24 },
  { id: "b", label: "Hay nhưng chậm", votes: 31 },
  { id: "c", label: "Muốn thử thêm", votes: 18 },
  { id: "d", label: "Chưa hợp gu", votes: 22 }
];

function pollOptionsForPost(postId: string): PollOption[] {
  return defaultPollOptions.map((option, index) => ({
    ...option,
    votes: option.votes + (hashString(`${postId}-${index}`) % 10)
  }));
}

function chapterLabelFor(post: CommunityPost) {
  if (!post.relatedStoryTitle) {
    return null;
  }

  const chapter = 1 + (hashString(post.id) % 24);

  return `Chương ${chapter}`;
}

function mapPostKind(post: CommunityPost): CommunityFeedItem["kind"] {
  switch (post.type) {
    case "review":
      return "review";
    case "poll_placeholder":
      return "poll";
    case "challenge":
      return "challenge";
    default:
      return post.storyId ? "story_group_post" : "user_post";
  }
}

function baseItemFromPost(post: CommunityPost): Omit<CommunityFeedItem, "id" | "kind"> {
  const voteCount = 8 + (hashString(post.id) % 140);
  const authorRole = inferRole(post);
  const isSpoiler = hashString(post.id) % 11 === 0;
  const authorReplied = authorRole === "creator" || hashString(post.id) % 6 === 0;
  const groupType = post.storyId ? "story" : "global";

  return {
    authorName: post.authorName ?? "Độc giả ChapMee",
    authorUsername: post.authorUsername ?? null,
    authorAvatarUrl: post.authorAvatarUrl,
    authorUserId: post.authorUserId ?? null,
    authorRole,
    createdAt: post.createdAt,
    title: post.title,
    body: post.contentPreview,
    storyId: post.storyId,
    storyTitle: post.relatedStoryTitle,
    storySlug: post.relatedStorySlug,
    chapterLabel: chapterLabelFor(post),
    authorChipName: post.creatorName,
    authorId: post.creatorId,
    groupType,
    groupId: post.storyId,
    groupLabel: groupType === "story" ? "Nhóm truyện" : "Bảng tin chung",
    voteCount,
    commentCount: post.commentCount,
    isSpoiler,
    hotScore: computeHotScore(voteCount, post.commentCount, post.createdAt),
    featuredCommentPreview:
      authorReplied && authorRole !== "creator"
        ? "Tác giả: Cảm ơn bạn đã đọc — mình sẽ cân nhắc twist ở chương sau."
        : post.commentCount >= 8
          ? highlightQuotes[hashString(post.id) % highlightQuotes.length]
          : null,
    threadPostId: post.id,
    sourcePostType: post.type
  };
}

export function buildFeedItemsFromPosts(
  posts: CommunityPost[],
  storyGroups: StoryCommunityGroup[],
  authorGroups: AuthorCommunityGroup[],
  options?: { includeFallbackHighlight?: boolean }
): CommunityFeedItem[] {
  const includeFallback = options?.includeFallbackHighlight ?? false;
  const items: CommunityFeedItem[] = [];

  for (const post of posts) {
    const base = baseItemFromPost(post);
    const kind = mapPostKind(post);

    const mainItem: CommunityFeedItem = {
      ...base,
      id: `feed-${post.id}`,
      kind
    };

    if (kind === "poll") {
      mainItem.pollOptions = pollOptionsForPost(post.id);
    }

    if (kind === "challenge") {
      const daysLeft = 2 + (hashString(post.id) % 5);
      mainItem.challengeMeta = {
        deadlineLabel: `Còn ${daysLeft} ngày`,
        entryCount: 12 + (hashString(post.id) % 40),
        prizeLabel: "Spotlight cộng đồng"
      };
    }

    items.push(mainItem);

    const authorReplied =
      base.authorRole === "creator" || hashString(post.id) % 6 === 0;

    if (
      post.commentCount >= 3 &&
      post.relatedStoryTitle &&
      hashString(post.id) % 5 === 0
    ) {
      items.push({
        ...base,
        id: `highlight-${post.id}`,
        kind: "story_comment_highlight",
        title: null,
        body: highlightQuotes[hashString(post.id) % highlightQuotes.length],
        featuredCommentPreview: null,
        hotScore: base.hotScore + 12
      });
    }

    if (authorReplied && post.relatedStoryTitle && hashString(post.id) % 6 === 0) {
      const authorGroup = authorGroups.find((group) => group.isReplying);
      const authorName =
        post.creatorName ?? authorGroup?.name ?? "Tác giả truyện";

      items.push({
        ...base,
        id: `author-reply-${post.id}`,
        kind: "author_reply",
        authorName,
        authorUsername: post.creatorUsername ?? null,
        authorUserId: post.creatorUserId ?? null,
        authorRole: "creator",
        title: null,
        body:
          "Chi tiết sẽ được giải thích ở chương sau — cảm ơn bạn đã đọc và góp ý!",
        groupType: "author",
        groupId: post.creatorId ?? authorGroup?.authorId ?? null,
        groupLabel: "Nhóm tác giả",
        authorChipName: authorName,
        featuredCommentPreview: null,
        hotScore: base.hotScore + 18
      });
    }
  }

  if (
    includeFallback &&
    !items.some((item) => item.kind === "story_comment_highlight") &&
    storyGroups[0]
  ) {
    const group = storyGroups[0];
    items.unshift({
      id: `highlight-fallback-${group.storyId}`,
      kind: "story_comment_highlight",
      authorName: "Độc giả ChapMee",
      authorUsername: null,
      authorAvatarUrl: getDefaultAvatarUrl(
        getStableDefaultAvatarId(`highlight-fallback-${group.storyId}`)
      ),
      authorUserId: null,
      authorRole: "reader",
      createdAt: new Date().toISOString(),
      title: null,
      body: highlightQuotes[0],
      storyId: group.storyId,
      storyTitle: group.name,
      storySlug: group.slug,
      chapterLabel: "Chương đang hot",
      authorChipName: group.authorName,
      authorId: null,
      groupType: "story",
      groupId: group.storyId,
      groupLabel: "Nhóm truyện",
      voteCount: 42,
      commentCount: 18,
      isSpoiler: false,
      hotScore: group.hotScore + 20,
      featuredCommentPreview: null,
      threadPostId: group.storyId
    });
  }

  return items;
}

export function sortFeedItemsByTab(
  items: CommunityFeedItem[],
  tab: CommunityFeedTab
) {
  switch (tab) {
    case "new":
      return [...items].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "following":
      return items.filter((item) => item.groupType !== "global");
    case "hot":
    case "for_you":
    default:
      return [...items].sort((a, b) => b.hotScore - a.hotScore);
  }
}

export function buildUnifiedFeed(
  posts: CommunityPost[],
  storyGroups: StoryCommunityGroup[],
  authorGroups: AuthorCommunityGroup[],
  options?: { includeFallbackHighlight?: boolean }
): CommunityFeedItem[] {
  return sortFeedItemsByTab(
    buildFeedItemsFromPosts(posts, storyGroups, authorGroups, {
      includeFallbackHighlight: options?.includeFallbackHighlight ?? false
    }),
    "for_you"
  );
}

export function filterUnifiedFeed(
  items: CommunityFeedItem[],
  tab: CommunityFeedTab,
  query: string
) {
  const normalized = query.trim().toLowerCase();
  let filtered = items.filter((item) => !item.isHidden);

  if (normalized) {
    filtered = filtered.filter((item) => {
      const haystack = [
        item.title ?? "",
        item.body,
        item.authorName,
        item.storyTitle ?? "",
        item.authorChipName ?? "",
        item.groupLabel ?? ""
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }

  switch (tab) {
    case "hot":
      filtered = [...filtered].sort((a, b) => b.hotScore - a.hotScore);
      break;
    case "new":
      filtered = [...filtered].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
    case "following":
      // TODO: filter by followed story/author groups.
      filtered = filtered.filter((item) => item.groupType !== "global");
      break;
    case "for_you":
    default:
      filtered = [...filtered].sort((a, b) => b.hotScore - a.hotScore);
      break;
  }

  return filtered;
}

/** Desktop legacy enrich */
export function enrichCommunityPosts(
  posts: CommunityPost[]
): EnrichedCommunityPost[] {
  return posts.map((post) => {
    const base = baseItemFromPost(post);

    return {
      id: post.id,
      type: post.type,
      title: post.title,
      contentPreview: post.contentPreview,
      authorName: base.authorName,
      authorUsername: post.authorUsername ?? null,
      authorAvatarUrl: post.authorAvatarUrl,
      authorUserId: post.authorUserId ?? null,
      creatorUsername: post.creatorUsername ?? null,
      authorRole: base.authorRole,
      relatedStoryTitle: post.relatedStoryTitle,
      relatedStorySlug: post.relatedStorySlug,
      relatedStoryPublicCode: post.relatedStoryPublicCode ?? null,
      storyId: post.storyId,
      createdAt: post.createdAt,
      commentCount: post.commentCount,
      voteCount: base.voteCount,
      isSpoiler: base.isSpoiler,
      hotScore: base.hotScore,
      featuredCommentPreview: base.featuredCommentPreview,
      authorReplied: base.authorRole === "creator" || hashString(post.id) % 6 === 0,
      pollOptions:
        post.type === "poll_placeholder" ? pollOptionsForPost(post.id) : undefined
    };
  });
}

export function sortEnrichedPosts(
  posts: EnrichedCommunityPost[],
  tab: CommunityFeedTab
) {
  const visible = posts.filter((post) => !post.isHidden);

  if (tab === "new") {
    return [...visible].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  return [...visible].sort((a, b) => b.hotScore - a.hotScore);
}

export function filterPostsByQuery(
  posts: EnrichedCommunityPost[],
  query: string
) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return posts;
  }

  return posts.filter((post) => {
    const haystack = [
      post.title,
      post.contentPreview,
      post.authorName,
      post.relatedStoryTitle ?? ""
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}
