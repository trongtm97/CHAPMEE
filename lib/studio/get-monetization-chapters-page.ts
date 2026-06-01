import { createClient } from "@/lib/supabase/server";
import type { StudioChapterMonetizationRow } from "@/types/story-monetization";
import type { ChapterPricingSource } from "@/types/story-monetization";

export type MonetizationChapterFilter =
  | "all"
  | "free"
  | "paid"
  | "auto"
  | "override"
  | "draft"
  | "published";

export type MonetizationChapterSort =
  | "episode_asc"
  | "episode_desc"
  | "updated"
  | "price_high"
  | "price_low";

export type MonetizationChaptersQuery = {
  storyId: string;
  page: number;
  pageSize: number;
  search: string;
  filter: MonetizationChapterFilter;
  sort: MonetizationChapterSort;
};

export type MonetizationChaptersPageResult = {
  rows: StudioChapterMonetizationRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error: string | null;
};

function matchesChapterFilter(
  row: StudioChapterMonetizationRow,
  filter: MonetizationChapterFilter
) {
  switch (filter) {
    case "free":
      return !row.isPaid;
    case "paid":
      return row.isPaid;
    case "auto":
      return (
        row.pricingSource === "auto_free_first_chapters" ||
        row.pricingSource === "auto_paid_after_threshold"
      );
    case "override":
      return row.monetizationOverride;
    case "draft":
      return row.status === "draft" || row.status === "pending";
    case "published":
      return row.status === "published" || row.status === "approved";
    default:
      return true;
  }
}

function sortChapters(rows: StudioChapterMonetizationRow[], sort: MonetizationChapterSort) {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case "episode_desc":
        return b.episodeNumber - a.episodeNumber;
      case "updated":
        return b.updatedAt.localeCompare(a.updatedAt);
      case "price_high":
        return (b.priceCoin ?? 0) - (a.priceCoin ?? 0);
      case "price_low":
        return (a.priceCoin ?? 0) - (b.priceCoin ?? 0);
      case "episode_asc":
      default:
        return a.episodeNumber - b.episodeNumber;
    }
  });
  return copy;
}

export async function getMonetizationChaptersPage(
  query: MonetizationChaptersQuery
): Promise<MonetizationChaptersPageResult> {
  const page = Math.max(1, query.page);
  const pageSize = Math.min(100, Math.max(10, query.pageSize));
  const search = query.search.trim().toLowerCase();

  const supabase = await createClient();

  const { data: episodes, error } = await supabase
    .from("episodes")
    .select("id, episode_number, title, status, updated_at")
    .eq("story_id", query.storyId)
    .neq("status", "archived")
    .order("episode_number", { ascending: true });

  if (error) {
    return {
      rows: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 1,
      error: error.message
    };
  }

  const episodeIds = (episodes ?? []).map((row) => row.id as string);

  const { data: settings } =
    episodeIds.length > 0
      ? await supabase
          .from("chapter_monetization_settings")
          .select("chapter_id, is_paid, coin_price, pricing_source, monetization_override, updated_at")
          .eq("story_id", query.storyId)
          .in("chapter_id", episodeIds)
      : { data: [] };

  const settingsMap = new Map(
    (settings ?? []).map((row) => [row.chapter_id as string, row])
  );

  let rows: StudioChapterMonetizationRow[] = (episodes ?? []).map((episode) => {
    const setting = settingsMap.get(episode.id as string);
    const title = episode.title
      ? String(episode.title)
      : `Chương ${episode.episode_number}`;

    return {
      chapterId: episode.id as string,
      episodeNumber: Number(episode.episode_number),
      title,
      status: String(episode.status ?? "draft"),
      isPaid: Boolean(setting?.is_paid),
      priceCoin: setting?.coin_price == null ? null : Number(setting.coin_price),
      pricingSource: (setting?.pricing_source as ChapterPricingSource) ?? "paid_manual",
      monetizationOverride: Boolean(setting?.monetization_override),
      updatedAt: String(setting?.updated_at ?? episode.updated_at ?? new Date().toISOString())
    };
  });

  if (search) {
    rows = rows.filter(
      (row) =>
        row.title.toLowerCase().includes(search) ||
        String(row.episodeNumber).includes(search)
    );
  }

  rows = rows.filter((row) => matchesChapterFilter(row, query.filter));
  rows = sortChapters(rows, query.sort);

  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    rows: rows.slice(start, start + pageSize),
    totalCount,
    page: safePage,
    pageSize,
    totalPages,
    error: null
  };
}

export async function getStoryMonetizationDetail(storyId: string, creatorUserId: string) {
  const supabase = await createClient();

  const [{ data: story }, settingsResult] = await Promise.all([
    supabase
      .from("stories")
      .select("id, title, slug, status")
      .eq("id", storyId)
      .maybeSingle(),
    import("@/lib/supabase/story-monetization").then((mod) =>
      mod.getStoryMonetizationSettings(storyId)
    )
  ]);

  if (!story) {
    return { data: null, error: "Không tìm thấy truyện." };
  }

  const settings =
    settingsResult.data ??
    (await import("@/lib/supabase/story-monetization")).defaultStoryMonetizationSettings({
      storyId,
      creatorUserId
    });

  const [{ count: chapterCount }, { data: paidRows }, { count: fullAccessCount }, { data: txRows }] =
    await Promise.all([
      supabase
        .from("episodes")
        .select("id", { count: "exact", head: true })
        .eq("story_id", storyId)
        .neq("status", "archived"),
      supabase
        .from("chapter_monetization_settings")
        .select("chapter_id")
        .eq("story_id", storyId)
        .eq("is_paid", true),
      supabase
        .from("story_full_access_unlocks")
        .select("id", { count: "exact", head: true })
        .eq("story_id", storyId)
        .eq("status", "active"),
      supabase
        .from("transactions")
        .select("type, net_amount_vnd, creator_gross_vnd")
        .eq("story_id", storyId)
        .eq("creator_user_id", creatorUserId)
        .eq("status", "completed")
    ]);

  let revenueVnd = 0;
  let chapterUnlockCount = 0;

  for (const tx of txRows ?? []) {
    const net = Number(tx.net_amount_vnd ?? tx.creator_gross_vnd ?? 0);
    revenueVnd += net;
    if (tx.type === "chapter_unlock" || tx.type === "story_unlock") {
      chapterUnlockCount += 1;
    }
  }

  return {
    data: {
      ...settings,
      storyTitle: String(story.title),
      storySlug: String(story.slug),
      storyStatus: String(story.status),
      totalChapterCount: chapterCount ?? 0,
      paidChapterCount: paidRows?.length ?? 0,
      revenueVnd,
      fullAccessPurchaseCount: fullAccessCount ?? 0,
      chapterUnlockCount
    },
    error: null
  };
}
