import { createClient } from "@/lib/supabase/server";
import type { NormalizedCommunityGroupsParams } from "@/lib/community/community-groups-query";
import {
  filterCommunityGroupsByStatus,
  firstRelation,
  mapStoryRowToCommunityGroup,
  sortCommunityGroups
} from "@/lib/community/group-mapper";
import { getCatalogOffset, getTotalPages } from "@/lib/stories/story-catalog-query";
import type { StoryCommunityGroup } from "@/types/community";
import {
  COMMUNITY_GROUPS_MAX_SCAN,
  type CommunityGroupGenre,
  type CommunityGroupItem,
  type CommunityGroupsCatalogResult
} from "@/types/community-group";

const STORY_GROUP_SELECT =
  "id, title, slug, cover_url, published_at, creator_profiles(pen_name), genres(name, slug)";

/** Cap rows pulled from community_posts when estimating counts (avoids loading entire table). */
const POST_COUNT_SAMPLE_LIMIT = 400;

type StoryRow = {
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
    | { name: string | null; slug: string | null }[] | null;
};

async function getStoryIdsForPersonalFilters(
  userId: string | null,
  status: NormalizedCommunityGroupsParams["status"]
) {
  if (!userId || (status !== "following" && status !== "reading")) {
    return null;
  }

  const supabase = await createClient();

  if (status === "following") {
    const { data } = await supabase
      .from("follows")
      .select("story_id")
      .eq("follower_id", userId)
      .not("story_id", "is", null)
      .limit(50);

    return [...new Set((data ?? []).map((row) => row.story_id).filter(Boolean))] as string[];
  }

  const { data } = await supabase
    .from("bookshelf_items")
    .select("story_id")
    .eq("user_id", userId)
    .in("status", ["reading", "saved"])
    .order("updated_at", { ascending: false })
    .limit(50);

  return [...new Set((data ?? []).map((row) => row.story_id))];
}

async function enrichPostCounts(storyIds: string[]) {
  const postCountByStory = new Map<string, number>();

  if (storyIds.length === 0) {
    return postCountByStory;
  }

  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("community_posts")
    .select("story_id")
    .in("story_id", storyIds)
    .eq("status", "approved")
    .limit(POST_COUNT_SAMPLE_LIMIT);

  for (const post of posts ?? []) {
    if (!post.story_id) {
      continue;
    }
    postCountByStory.set(post.story_id, (postCountByStory.get(post.story_id) ?? 0) + 1);
  }

  return postCountByStory;
}

function filterRowsBySearch(rows: StoryRow[], q: string) {
  const lower = q.trim().toLowerCase();
  if (!lower) {
    return rows;
  }

  return rows.filter((row) => {
    const creator = firstRelation(row.creator_profiles);
    const genre = firstRelation(row.genres);
    return (
      row.title.toLowerCase().includes(lower) ||
      row.slug.toLowerCase().includes(lower) ||
      creator?.pen_name?.toLowerCase().includes(lower) ||
      genre?.name?.toLowerCase().includes(lower) ||
      (genre?.slug?.toLowerCase().includes(lower) ?? false)
    );
  });
}

async function fetchPublicStoryRows(options: {
  q: string;
  genre: string;
  storyIds: string[] | null;
  sort: NormalizedCommunityGroupsParams["sort"];
  page: number;
  pageSize: number;
}) {
  const supabase = await createClient();
  const canUseDbPagination =
    options.sort === "newest" &&
    !options.q.trim() &&
    options.storyIds === null &&
    !options.genre &&
    options.pageSize > 0;

  if (canUseDbPagination) {
    const offset = getCatalogOffset(options.page, options.pageSize);
    const to = offset + options.pageSize - 1;

    const { data, error, count } = await supabase
      .from("stories")
      .select(STORY_GROUP_SELECT, { count: "exact" })
      .eq("visibility", "public")
      .in("status", ["approved", "published"])
      .order("published_at", { ascending: false })
      .range(offset, to);

    if (error) {
      throw new Error(error.message);
    }

    return {
      rows: (data ?? []) as unknown as StoryRow[],
      totalCount: count ?? 0,
      usedDbPagination: true
    };
  }

  let query = supabase
    .from("stories")
    .select(STORY_GROUP_SELECT)
    .eq("visibility", "public")
    .in("status", ["approved", "published"])
    .order("published_at", { ascending: false })
    .limit(COMMUNITY_GROUPS_MAX_SCAN);

  if (options.storyIds) {
    if (options.storyIds.length === 0) {
      return { rows: [], totalCount: 0, usedDbPagination: false };
    }
    query = query.in("id", options.storyIds);
  }

  if (options.genre) {
    query = query.eq("genres.slug", options.genre);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = filterRowsBySearch((data ?? []) as unknown as StoryRow[], options.q);

  return {
    rows,
    totalCount: rows.length,
    usedDbPagination: false
  };
}

export async function getCommunityGroupGenres(): Promise<CommunityGroupGenre[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("genres").select("slug, name").order("name");

    if (error) {
      throw error;
    }

    return (data ?? [])
      .filter((row): row is { slug: string; name: string } => Boolean(row.slug && row.name))
      .map((row) => ({ slug: row.slug, name: row.name }));
  } catch {
    return [];
  }
}

export type CommunityGroupsCatalogBundle = CommunityGroupsCatalogResult & {
  recommended: CommunityGroupItem[];
};

export async function getCommunityGroupsBundle(
  params: NormalizedCommunityGroupsParams,
  userId: string | null = null
): Promise<CommunityGroupsCatalogBundle> {
  const canRecommend =
    !params.q &&
    !params.genre &&
    params.status === "all" &&
    !params.tab &&
    params.page === 1;

  const [catalog, recommended] = await Promise.all([
    getCommunityGroupsCatalog(params, userId),
    canRecommend ? getRecommendedGroupsQuick(userId, 6) : Promise.resolve([])
  ]);

  return { ...catalog, recommended };
}

async function getRecommendedGroupsQuick(
  userId: string | null,
  limit: number
): Promise<CommunityGroupItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stories")
      .select(STORY_GROUP_SELECT)
      .eq("visibility", "public")
      .in("status", ["approved", "published"])
      .order("published_at", { ascending: false })
      .limit(36);

    if (error) {
      return [];
    }

    const rows = (data ?? []) as unknown as StoryRow[];
    const postCountByStory = await enrichPostCounts(rows.map((row) => row.id));
    let groups = rows.map((row, index) =>
      mapStoryRowToCommunityGroup(row, index, {
        postCount: postCountByStory.get(row.id) ?? 0,
        commentCount: 0
      })
    );
    groups = sortCommunityGroups(groups, "hot");

    const exclude = new Set<string>();
    if (userId) {
      const { data: shelf } = await supabase
        .from("bookshelf_items")
        .select("story_id")
        .eq("user_id", userId)
        .limit(12);
      for (const row of shelf ?? []) {
        if (row.story_id) {
          exclude.add(row.story_id);
        }
      }
    }

    return groups.filter((group) => !exclude.has(group.storyId)).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getCommunityGroupsCatalog(
  params: NormalizedCommunityGroupsParams,
  userId: string | null = null
): Promise<CommunityGroupsCatalogResult> {
  const empty: CommunityGroupsCatalogResult = {
    items: [],
    genres: [],
    totalCount: 0,
    page: 1,
    pageSize: params.pageSize,
    totalPages: 1,
    query: params.q,
    genre: params.genre,
    sort: params.sort,
    status: params.status,
    tab: params.tab,
    error: null
  };

  try {
    const personalStoryIds = await getStoryIdsForPersonalFilters(userId, params.status);
    const [fetchResult, genres] = await Promise.all([
      fetchPublicStoryRows({
        q: params.q,
        genre: params.genre,
        storyIds: personalStoryIds,
        sort: params.sort,
        page: params.page,
        pageSize: params.pageSize
      }),
      getCommunityGroupGenres()
    ]);

    let totalCount = fetchResult.totalCount;
    let page = params.page;
    let items: CommunityGroupItem[] = [];

    if (fetchResult.usedDbPagination) {
      const postCountByStory = await enrichPostCounts(fetchResult.rows.map((row) => row.id));
      items = fetchResult.rows.map((row, index) =>
        mapStoryRowToCommunityGroup(row, index, {
          postCount: postCountByStory.get(row.id) ?? 0,
          commentCount: 0
        })
      );
      const totalPages = getTotalPages(totalCount, params.pageSize);
      page = Math.min(params.page, totalPages);

      return {
        items,
        genres,
        totalCount,
        page,
        pageSize: params.pageSize,
        totalPages,
        query: params.q,
        genre: params.genre,
        sort: params.sort,
        status: params.status,
        tab: params.tab,
        error: null
      };
    }

    let groups = fetchResult.rows.map((row, index) =>
      mapStoryRowToCommunityGroup(row, index, {
        postCount: 0,
        commentCount: 0
      })
    );

    if (
      params.status === "hot" ||
      params.status === "new_chapter" ||
      params.status === "author_reply"
    ) {
      groups = filterCommunityGroupsByStatus(groups, params.status);
    }

    groups = sortCommunityGroups(groups, params.sort);
    totalCount = groups.length;

    const totalPages = getTotalPages(totalCount, params.pageSize);
    page = Math.min(params.page, totalPages);
    const offset = (page - 1) * params.pageSize;
    const pageRows = groups.slice(offset, offset + params.pageSize);

    const postCountByStory = await enrichPostCounts(pageRows.map((group) => group.storyId));
    items = pageRows.map((group) => ({
      ...group,
      postCount: postCountByStory.get(group.storyId) ?? group.postCount
    }));

    return {
      items,
      genres,
      totalCount,
      page,
      pageSize: params.pageSize,
      totalPages,
      query: params.q,
      genre: params.genre,
      sort: params.sort,
      status: params.status,
      tab: params.tab,
      error: null
    };
  } catch (error) {
    return {
      ...empty,
      error: error instanceof Error ? error.message : "Không thể tải danh sách nhóm."
    };
  }
}

export async function getMyCommunityGroups(userId: string | null): Promise<{
  groups: CommunityGroupItem[];
  isLoggedIn: boolean;
}> {
  if (!userId) {
    return { groups: [], isLoggedIn: false };
  }

  try {
    const supabase = await createClient();
    const [{ data: follows }, { data: bookshelf }] = await Promise.all([
      supabase
        .from("follows")
        .select("story_id")
        .eq("follower_id", userId)
        .not("story_id", "is", null)
        .limit(12),
      supabase
        .from("bookshelf_items")
        .select("story_id")
        .eq("user_id", userId)
        .in("status", ["reading", "saved"])
        .order("updated_at", { ascending: false })
        .limit(8)
    ]);

    const storyIds = [
      ...new Set(
        [...(follows ?? []), ...(bookshelf ?? [])]
          .map((row) => row.story_id)
          .filter((id): id is string => Boolean(id))
      )
    ].slice(0, 10);

    if (storyIds.length === 0) {
      return { groups: [], isLoggedIn: true };
    }

    const { data, error } = await supabase
      .from("stories")
      .select(STORY_GROUP_SELECT)
      .in("id", storyIds)
      .eq("visibility", "public")
      .in("status", ["approved", "published"]);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as unknown as StoryRow[];
    const postCountByStory = await enrichPostCounts(storyIds);
    const order = new Map(storyIds.map((id, index) => [id, index]));
    const groups = rows
      .map((row, index) =>
        mapStoryRowToCommunityGroup(row, index, {
          postCount: postCountByStory.get(row.id) ?? 0,
          commentCount: 0
        })
      )
      .sort((a, b) => (order.get(a.storyId) ?? 99) - (order.get(b.storyId) ?? 99));

    return { groups, isLoggedIn: true };
  } catch {
    return { groups: [], isLoggedIn: true };
  }
}

/** @deprecated Use getCommunityGroupsBundle — avoids second full catalog scan. */
export async function getRecommendedCommunityGroups(options: {
  userId: string | null;
  excludeStoryIds?: string[];
  limit?: number;
}): Promise<CommunityGroupItem[]> {
  const limit = options.limit ?? 6;
  const catalog = await getCommunityGroupsCatalog({
    q: "",
    genre: "",
    sort: "hot",
    status: "all",
    tab: null,
    page: 1,
    pageSize: limit
  });
  const exclude = new Set(options.excludeStoryIds ?? []);
  return catalog.items.filter((group) => !exclude.has(group.storyId)).slice(0, limit);
}

export { toStoryCommunityGroup } from "@/lib/community/group-mapper";

export async function getCommunityGroupById(groupId: string): Promise<{
  group: CommunityGroupItem | null;
  error: string | null;
}> {
  const storyId = groupId.startsWith("story-group-")
    ? groupId.slice("story-group-".length)
    : groupId;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stories")
      .select(STORY_GROUP_SELECT)
      .eq("id", storyId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      const { data: bySlug } = await supabase
        .from("stories")
        .select(STORY_GROUP_SELECT)
        .eq("slug", groupId)
        .maybeSingle();

      if (!bySlug) {
        return { group: null, error: null };
      }

      const postCountByStory = await enrichPostCounts([bySlug.id as string]);
      return {
        group: mapStoryRowToCommunityGroup(bySlug as unknown as StoryRow, 0, {
          postCount: postCountByStory.get(bySlug.id as string) ?? 0,
          commentCount: 0
        }),
        error: null
      };
    }

    const postCountByStory = await enrichPostCounts([data.id as string]);
    return {
      group: mapStoryRowToCommunityGroup(data as unknown as StoryRow, 0, {
        postCount: postCountByStory.get(data.id as string) ?? 0,
        commentCount: 0
      }),
      error: null
    };
  } catch (error) {
    return {
      group: null,
      error: error instanceof Error ? error.message : "Không thể tải nhóm."
    };
  }
}
