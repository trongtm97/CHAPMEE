import {
  getDevFeaturedPosts,
  listDevFallbackPosts,
  shouldUseDevFallback
} from "@/lib/content-posts/dev-fallback-posts";
import { CONTENT_POST_FEATURED_TAG } from "@/lib/content-posts/featured";
import type { PublicPostCategoryFilter, PublicPostSort } from "@/lib/content-posts/public-catalog";
import {
  PUBLIC_CONTENT_HUB_PAGE_SIZE,
  resolvePublicPostFilters
} from "@/lib/content-posts/public-catalog";
import { listContentPosts } from "@/lib/platform-content/content-posts";
import type { AdminContentPost } from "@/types/platform-content";

export type PublicContentHubListInput = {
  page: number;
  q: string;
  category: PublicPostCategoryFilter;
  sort: PublicPostSort;
};

export type PublicContentHubListResult = {
  items: AdminContentPost[];
  total: number;
  error: string | null;
  usingDevFallback: boolean;
};

export async function fetchPublicContentHubList(
  input: PublicContentHubListInput
): Promise<PublicContentHubListResult> {
  const filters = resolvePublicPostFilters(input.category);
  const result = await listContentPosts({
    publicOnly: true,
    page: input.page,
    pageSize: PUBLIC_CONTENT_HUB_PAGE_SIZE,
    search: input.q || undefined,
    sort: input.sort,
    ...filters
  });

  if (shouldUseDevFallback(result.total, result.error)) {
    const dev = listDevFallbackPosts({
      page: input.page,
      pageSize: PUBLIC_CONTENT_HUB_PAGE_SIZE,
      search: input.q || undefined,
      sort: input.sort,
      category: input.category
    });
    return {
      items: dev.items,
      total: dev.total,
      error: null,
      usingDevFallback: true
    };
  }

  return {
    items: result.items,
    total: result.total,
    error: result.error,
    usingDevFallback: false
  };
}

export async function fetchPublicContentHubFeatured(
  excludeIds: string[] = []
): Promise<AdminContentPost[]> {
  const pinned = await listContentPosts({
    publicOnly: true,
    limit: 6,
    tag: CONTENT_POST_FEATURED_TAG,
    sort: "published"
  });

  if (!pinned.error && pinned.items.length > 0) {
    return pinned.items.filter((p) => !excludeIds.includes(p.id)).slice(0, 4);
  }

  const { items, total, error } = await listContentPosts({
    publicOnly: true,
    limit: 6,
    sort: "views"
  });

  if (shouldUseDevFallback(total, error)) {
    return getDevFeaturedPosts(4).filter((p) => !excludeIds.includes(p.id));
  }

  return items.filter((p) => !excludeIds.includes(p.id)).slice(0, 4);
}

export async function fetchPublicContentHubSidebar(input: {
  sort: PublicPostSort;
  authorPostsLimit?: number;
  readerPostsLimit?: number;
}): Promise<{
  popular: AdminContentPost[];
  recent: AdminContentPost[];
  forAuthors: AdminContentPost[];
  forReaders: AdminContentPost[];
}> {
  const [popularResult, recentResult, authorResult, readerResult] = await Promise.all([
    listContentPosts({ publicOnly: true, limit: 4, sort: "views" }),
    listContentPosts({ publicOnly: true, limit: 5, sort: "published" }),
    listContentPosts({
      publicOnly: true,
      limit: input.authorPostsLimit ?? 3,
      postType: "editorial"
    }),
    listContentPosts({
      publicOnly: true,
      limit: input.readerPostsLimit ?? 3,
      category: "goc-nguoi-doc"
    })
  ]);

  const useDev = shouldUseDevFallback(popularResult.total, popularResult.error);

  if (useDev) {
    const all = listDevFallbackPosts({ page: 1, pageSize: 20, sort: input.sort }).items;
    return {
      popular: getDevFeaturedPosts(4),
      recent: listDevFallbackPosts({ page: 1, pageSize: 5, sort: "published" }).items,
      forAuthors: all.filter((p) => p.post_type === "editorial").slice(0, 3),
      forReaders: all.filter((p) => p.category === "goc-nguoi-doc" || p.post_type === "guide").slice(0, 3)
    };
  }

  return {
    popular: popularResult.items.slice(0, 4),
    recent: recentResult.items.slice(0, 5),
    forAuthors: authorResult.items,
    forReaders: readerResult.items
  };
}

export function pickFeaturedForHero(posts: AdminContentPost[]): {
  primary: AdminContentPost | null;
  secondary: AdminContentPost[];
} {
  if (posts.length === 0) {
    return { primary: null, secondary: [] };
  }
  const [primary, ...rest] = posts;
  return { primary, secondary: rest.slice(0, 3) };
}

export function excludePostsFromList(
  items: AdminContentPost[],
  exclude: AdminContentPost[]
): AdminContentPost[] {
  const ids = new Set(exclude.map((p) => p.id));
  return items.filter((item) => !ids.has(item.id));
}
