import type { DatabaseClient } from "@/lib/db/types";
import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/postgrest-selects";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { getProfileUrl } from "@/lib/profile/profile-url";
import { getChapterUrl, getStoryUrl } from "@/lib/urls/paths";
import {
  getStoryCardMeta,
  normalizeStoryStructureType
} from "@/lib/stories/story-structure";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import {
  reasonBadgeFromBoard
} from "@/lib/ranking/reason-badges";
import type {
  RankingBoardItem,
  RankingBoardType,
  RankingSnapshotRow
} from "@/types/ranking-board";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function buildStatsLine(breakdown: RankingSnapshotRow["score_breakdown"]) {
  const parts: string[] = [];
  if (breakdown.next_chapter_rate > 0) {
    parts.push(`Đọc tiếp ${formatPercent(breakdown.next_chapter_rate)}`);
  }
  if (breakdown.save_rate > 0) {
    parts.push(`Lưu ${formatPercent(breakdown.save_rate)}`);
  }
  if (breakdown.completion_rate > 0) {
    parts.push(`Hoàn thành ${formatPercent(breakdown.completion_rate)}`);
  }
  return parts.length > 0 ? parts.slice(0, 2).join(" · ") : null;
}

function buildStoryStructureStatsLine(
  story: {
    id: string;
    structure_type?: string | null;
    standalone_reading_time_minutes?: number | null;
  },
  episodeCountByStory: Map<string, number>
) {
  const meta = getStoryCardMeta({
    structureType: normalizeStoryStructureType(story.structure_type),
    standaloneReadingTimeMinutes: story.standalone_reading_time_minutes ?? 0,
    episodeCount: episodeCountByStory.get(story.id) ?? 0
  });
  const parts = [meta.primaryLabel];
  if (meta.secondaryLabel) {
    parts.push(meta.secondaryLabel);
  }
  return parts.join(" · ");
}

export async function hydrateRankingSnapshots(
  db: DatabaseClient,
  rows: RankingSnapshotRow[],
  boardType: RankingBoardType
): Promise<RankingBoardItem[]> {
  if (rows.length === 0) return [];

  const storyIds = new Set<string>();
  const authorIds = new Set<string>();
  const reelIds = new Set<string>();
  const chapterIds = new Set<string>();

  for (const row of rows) {
    if (row.item_type === "story" && row.item_id) storyIds.add(row.item_id);
    if (row.item_type === "author" && row.item_id) authorIds.add(row.item_id);
    if (row.item_type === "reel" && row.item_id) reelIds.add(row.item_id);
    if (row.item_type === "chapter" && row.item_id) chapterIds.add(row.item_id);
    if (row.story_id) storyIds.add(row.story_id);
    if (row.author_user_id) authorIds.add(row.author_user_id);
  }

  const [storiesRes, authorsRes, reelsRes, chaptersRes, episodeCountsRes] =
    await Promise.all([
    storyIds.size
      ? db
          .from("stories")
          .select(
            `id, title, slug, public_code, hook, short_description, cover_url, structure_type, standalone_reading_time_minutes, ${CREATOR_PROFILE_STORY_JOIN}`
          )
          .in("id", [...storyIds])
          .eq("visibility", "public")
          .in("status", ["published", "approved"])
      : Promise.resolve({ data: [] }),
    authorIds.size
      ? db
          .from("creator_profiles")
          .select(
            "id, user_id, pen_name, profiles!creator_profiles_user_id_fkey(display_name, username, avatar_url)"
          )
          .in("user_id", [...authorIds])
          .eq("status", "active")
      : Promise.resolve({ data: [] }),
    reelIds.size
      ? db
          .from("reels_items")
          .select("id, hook, body, background_image_url, story_id, stories(title, slug, public_code, cover_url)")
          .in("id", [...reelIds])
          .eq("status", "published")
      : Promise.resolve({ data: [] }),
    chapterIds.size
      ? db
          .from("episodes")
          .select(
            "id, title, slug, public_code, episode_number, story_id, stories!inner(id, title, slug, public_code, cover_url, creator_profiles(id, user_id, pen_name, profiles(display_name, username)))"
          )
          .in("id", [...chapterIds])
          .in("status", ["published", "approved"])
      : Promise.resolve({ data: [] }),
    storyIds.size
      ? db
          .from("episodes")
          .select("story_id")
          .in("story_id", [...storyIds])
          .in("status", ["published", "approved"])
      : Promise.resolve({ data: [] })
  ]);

  type StoryRow = {
    id: string;
    title: string;
    slug: string;
    public_code: string;
    hook: string | null;
    short_description: string | null;
    cover_url: string | null;
    structure_type?: string | null;
    standalone_reading_time_minutes?: number | null;
    creator_profiles:
      | {
          id: string;
          user_id: string;
          pen_name: string | null;
          profiles?: { display_name: string | null; username: string | null } | null;
        }
      | Array<{
          id: string;
          user_id: string;
          pen_name: string | null;
          profiles?: { display_name: string | null; username: string | null } | null;
        }>
      | null;
  };

  const storyMap = new Map(
    ((storiesRes.data ?? []) as unknown as StoryRow[]).map((row) => [row.id, row])
  );

  const { getStoryTaxonomyLabelsByStoryIds } = await import(
    "@/lib/taxonomy/discover-bridge"
  );
  const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(
    db,
    [...storyIds]
  );

  const episodeCountByStory = new Map<string, number>();
  for (const row of (episodeCountsRes.data ?? []) as Array<{ story_id: string }>) {
    episodeCountByStory.set(
      row.story_id,
      (episodeCountByStory.get(row.story_id) ?? 0) + 1
    );
  }

  const authorMap = new Map<
    string,
    {
      penName: string;
      username: string | null;
      displayName: string;
    }
  >();

  for (const row of (authorsRes.data ?? []) as unknown as Array<{
    user_id: string;
    pen_name: string;
    profiles: { display_name: string | null; username: string | null } | null;
  }>) {
    const profile = firstRelation(row.profiles);
    authorMap.set(row.user_id, {
      penName: row.pen_name,
      username: profile?.username ?? null,
      displayName: resolvePublicDisplayName(profile, { pen_name: row.pen_name })
    });
  }

  const reelMap = new Map(
    ((reelsRes.data ?? []) as unknown as Array<{
      id: string;
      hook: string | null;
      body: string | null;
      background_image_url: string | null;
      story_id: string | null;
      stories:
        | { title: string; slug: string; public_code: string; cover_url: string | null }
        | { title: string; slug: string; public_code: string; cover_url: string | null }[]
        | null;
    }>).map((row) => [row.id, row])
  );

  const chapterMap = new Map(
    ((chaptersRes.data ?? []) as unknown as Array<{
      id: string;
      title: string | null;
      slug: string;
      public_code: string;
      episode_number: number;
      story_id: string;
      stories: StoryRow | StoryRow[];
    }>).map((row) => [row.id, row])
  );

  const items: RankingBoardItem[] = [];

  for (const row of rows) {
    const breakdown = row.score_breakdown ?? {};
    const badge = reasonBadgeFromBoard(boardType, breakdown);

    if (row.item_type === "story") {
      const story = storyMap.get(row.item_id);
      if (!story) continue;
      const creator = firstRelation(story.creator_profiles);
      const profile = firstRelation(creator?.profiles ?? null);
      const author = authorMap.get(row.author_user_id ?? creator?.user_id ?? "");
      const taxonomy = taxonomyByStory.get(story.id);
      items.push({
        rank: row.rank_position,
        itemType: "story",
        id: story.id,
        title: story.title,
        slug: story.slug,
        publicCode: story.public_code,
        href: getStoryUrl({ slug: story.slug, public_code: story.public_code }),
        coverUrl: resolveStoryCoverUrl(story.cover_url),
        subtitle: story.hook,
        description: story.short_description,
        genreName: taxonomy?.mainGenreName ?? null,
        genreSlug: taxonomy?.mainGenreSlug ?? null,
        authorDisplayName:
          author?.displayName ??
          (creator
            ? resolvePublicDisplayName(profile, creator)
            : null),
        authorUsername: author?.username ?? profile?.username ?? null,
        score: Number(row.score),
        scoreBreakdown: breakdown,
        reasonBadge: badge,
        statsLine: (() => {
          if (
            boardType === "boosted_stories" &&
            breakdown.reason?.includes("lượt đề cử")
          ) {
            return breakdown.reason;
          }
          const structureLine = buildStoryStructureStatsLine(story, episodeCountByStory);
          const engagementLine = buildStatsLine(breakdown);
          const merged = [structureLine, engagementLine].filter(Boolean).join(" · ");
          return merged || null;
        })(),
        ownerUserId: row.author_user_id ?? creator?.user_id ?? null
      });
      continue;
    }

    if (row.item_type === "author") {
      const author = authorMap.get(row.item_id);
      if (!author) continue;
      items.push({
        rank: row.rank_position,
        itemType: "author",
        id: row.item_id,
        title: author.displayName,
        slug: null,
        href: getProfileUrl(author.username) ?? "/discover",
        coverUrl: null,
        subtitle: "Tác giả mới",
        description: null,
        genreName: null,
        authorDisplayName: author.displayName,
        authorUsername: author.username,
        score: Number(row.score),
        scoreBreakdown: breakdown,
        reasonBadge: badge ?? "new_author",
        statsLine: buildStatsLine(breakdown),
        ownerUserId: row.item_id
      });
      continue;
    }

    if (row.item_type === "reel") {
      const reel = reelMap.get(row.item_id);
      if (!reel) continue;
      const linkedStory = firstRelation(reel.stories);
      items.push({
        rank: row.rank_position,
        itemType: "reel",
        id: reel.id,
        title: reel.hook ?? linkedStory?.title ?? "Reels",
        slug: linkedStory?.slug ?? null,
        href: linkedStory
          ? getStoryUrl({ slug: linkedStory.slug, public_code: linkedStory.public_code })
          : "/reels",
        coverUrl:
          resolveStoryCoverUrl(reel.background_image_url) ??
          resolveStoryCoverUrl(linkedStory?.cover_url) ??
          null,
        subtitle: reel.body,
        description: null,
        genreName: null,
        authorDisplayName: authorMap.get(row.author_user_id ?? "")?.displayName ?? null,
        authorUsername: authorMap.get(row.author_user_id ?? "")?.username ?? null,
        score: Number(row.score),
        scoreBreakdown: breakdown,
        reasonBadge: badge ?? "reels_pull",
        statsLine: buildStatsLine(breakdown),
        ownerUserId: row.author_user_id ?? null
      });
      continue;
    }

    if (row.item_type === "chapter") {
      const chapter = chapterMap.get(row.item_id);
      if (!chapter) continue;
      const story = firstRelation(chapter.stories);
      if (!story) continue;
      const creator = firstRelation(story.creator_profiles);
      const profile = firstRelation(creator?.profiles ?? null);
      items.push({
        rank: row.rank_position,
        itemType: "chapter",
        id: chapter.id,
        title: chapter.title ?? `Chương ${chapter.episode_number}`,
        slug: story.slug,
        href: getChapterUrl(
          { slug: story.slug, public_code: story.public_code },
          { slug: chapter.slug, public_code: chapter.public_code }
        ),
        coverUrl: resolveStoryCoverUrl(story.cover_url),
        subtitle: story.title,
        description: null,
        genreName: taxonomyByStory.get(story.id)?.mainGenreName ?? null,
        authorDisplayName: creator
          ? resolvePublicDisplayName(profile, creator)
          : null,
        authorUsername: profile?.username ?? null,
        score: Number(row.score),
        scoreBreakdown: breakdown,
        reasonBadge: badge ?? "high_next_chapter",
        statsLine: buildStatsLine(breakdown),
        ownerUserId: row.author_user_id ?? creator?.user_id ?? null
      });
    }
  }

  return items;
}
