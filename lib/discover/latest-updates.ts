import "server-only";

import { getContentPostUrl } from "@/lib/urls/paths";
import { getProfileUrl } from "@/lib/profile/profile-url";
import { getStoryChapterHref, getStoryDetailHref } from "@/lib/stories/story-routes";
import { createPublicClient } from "@/lib/data/public-client";
import {
  applyPublicAppContentPostFilters,
  applyContentPostSort,
  hasExtendedContentPostSchema
} from "@/lib/content-posts/schema-capabilities";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";

const PUBLIC_STATUSES = [...publicContentStatuses];
const DEFAULT_LIMIT = 20;

export type DiscoverUpdateType = "story" | "chapter" | "post" | "audio" | "video";

export type DiscoverUpdateItem = {
  id: string;
  type: DiscoverUpdateType;
  title: string;
  parentTitle?: string;
  authorDisplayName?: string;
  authorUsername?: string;
  href: string;
  publishedAt: string;
  badgeLabel: string;
};

/** @deprecated Use DiscoverUpdateItem */
export type DiscoverLatestUpdateItem = DiscoverUpdateItem;

export const DISCOVER_UPDATE_BADGE_LABELS: Record<DiscoverUpdateType, string> = {
  story: "Truyện mới",
  chapter: "Chương mới",
  post: "Bài viết",
  audio: "Audio",
  video: "Video"
};

type CreatorProfilesRelation =
  | {
      pen_name: string | null;
      profiles: { display_name: string | null; username: string | null } | null;
    }
  | {
      pen_name: string | null;
      profiles: { display_name: string | null; username: string | null } | null;
    }[]
  | null;

type EpisodeRow = {
  id: string;
  title: string | null;
  episode_number: number;
  slug: string;
  public_code: string;
  published_at: string | null;
  stories:
    | {
        title: string;
        slug: string;
        public_code: string | null;
        creator_profiles: CreatorProfilesRelation;
      }
    | {
        title: string;
        slug: string;
        public_code: string | null;
        creator_profiles: CreatorProfilesRelation;
      }[]
    | null;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  public_code: string | null;
  published_at: string | null;
  creator_profiles: CreatorProfilesRelation;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function authorFromCreatorProfiles(creatorProfiles: CreatorProfilesRelation) {
  const creator = firstRelation(creatorProfiles);
  if (!creator) {
    return { authorDisplayName: undefined, authorUsername: undefined };
  }
  const profile = firstRelation(creator.profiles);
  const authorUsername = profile?.username?.trim().toLowerCase() || undefined;
  const authorDisplayName =
    creator.pen_name?.trim() ||
    profile?.display_name?.trim() ||
    authorUsername ||
    undefined;
  return { authorDisplayName, authorUsername };
}

function publishedAt(iso: string | null | undefined) {
  return iso && !Number.isNaN(new Date(iso).getTime()) ? iso : new Date(0).toISOString();
}

function mergeSorted(items: DiscoverUpdateItem[]) {
  return [...items].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

type ContentPostRow = {
  id: string;
  title: string;
  slug: string;
  public_code: string | null;
  published_at: string | null;
  updated_at: string;
  category: string | null;
};

async function loadPublicContentPosts(limit: number) {
  const db = createPublicClient();
  const extended = await hasExtendedContentPostSchema(db);
  let query = db
    .from("admin_content_posts")
    .select("id, title, slug, public_code, published_at, updated_at, category, status, post_type, deleted_at, scheduled_at, indexable")
    .eq("status", "published")
    .neq("post_type", "policy");
  query = applyPublicAppContentPostFilters(query, extended);
  query = applyContentPostSort(query, "published", extended);
  const { data, error } = await query.limit(limit);
  if (error) {
    return [] as ContentPostRow[];
  }
  return (data ?? []) as ContentPostRow[];
}

export type GetDiscoverLatestUpdatesOptions = {
  limit?: number;
};

/**
 * Merged feed of newest public chapters, stories, posts, audio, and films.
 */
export async function getDiscoverLatestUpdates(
  options: GetDiscoverLatestUpdatesOptions = {}
): Promise<DiscoverUpdateItem[]> {
  const limit = Math.min(30, Math.max(1, options.limit ?? DEFAULT_LIMIT));
  const perSource = Math.max(4, Math.ceil(limit / 3));

  try {
    const db = createPublicClient();

    const [episodesResult, storiesResult, postsResult, audioResult, filmsResult] =
      await Promise.all([
        db
          .from("episodes")
          .select(
            "id, title, episode_number, slug, public_code, published_at, stories!inner(title, slug, public_code, visibility, status, creator_profiles(pen_name, profiles(display_name, username)))"
          )
          .in("status", PUBLIC_STATUSES)
          .is("deleted_at", null)
          .eq("stories.visibility", "public")
          .in("stories.status", PUBLIC_STATUSES)
          .not("published_at", "is", null)
          .order("published_at", { ascending: false })
          .limit(perSource),
        db
          .from("stories")
          .select(
            "id, title, slug, public_code, published_at, creator_profiles(pen_name, profiles(display_name, username))"
          )
          .eq("visibility", "public")
          .in("status", PUBLIC_STATUSES)
          .is("deleted_at", null)
          .not("published_at", "is", null)
          .order("published_at", { ascending: false })
          .limit(perSource),
        loadPublicContentPosts(perSource),
        db
          .from("audio_items")
          .select(
            "id, story_id, title, published_at, updated_at, stories!inner(title, slug, public_code, status, visibility, creator_profiles(pen_name, profiles(display_name, username)))"
          )
          .eq("status", "published")
          .eq("stories.status", "published")
          .eq("stories.visibility", "public")
          .not("story_id", "is", null)
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("updated_at", { ascending: false })
          .limit(perSource),
        import("@/src/lib/film-adaptations/public-films").then((module) =>
          module.getDiscoverPublishedFilms({
            page: 1,
            pageSize: perSource,
            filters: { newest: true }
          })
        )
      ]);

    const items: DiscoverUpdateItem[] = [];

    for (const row of (episodesResult.data ?? []) as EpisodeRow[]) {
      const story = firstRelation(row.stories);
      if (!story?.slug || !story.public_code || !row.slug || !row.public_code) {
        continue;
      }
      const chapterTitle = row.title?.trim() || `Chương ${row.episode_number}`;
      const { authorDisplayName, authorUsername } = authorFromCreatorProfiles(
        story.creator_profiles
      );
      items.push({
        id: `chapter-${row.id}`,
        type: "chapter",
        badgeLabel: DISCOVER_UPDATE_BADGE_LABELS.chapter,
        title: `${story.title} vừa có chương mới: ${chapterTitle}`,
        parentTitle: story.title,
        authorDisplayName,
        authorUsername,
        href: getStoryChapterHref(
          { slug: story.slug, public_code: story.public_code },
          { slug: row.slug, public_code: row.public_code }
        ),
        publishedAt: publishedAt(row.published_at)
      });
    }

    for (const row of (storiesResult.data ?? []) as StoryRow[]) {
      if (!row.slug || !row.public_code) {
        continue;
      }
      const { authorDisplayName, authorUsername } = authorFromCreatorProfiles(
        row.creator_profiles
      );
      items.push({
        id: `story-${row.id}`,
        type: "story",
        badgeLabel: DISCOVER_UPDATE_BADGE_LABELS.story,
        title: row.title,
        authorDisplayName,
        authorUsername,
        href: getStoryDetailHref({ slug: row.slug, public_code: row.public_code }),
        publishedAt: publishedAt(row.published_at)
      });
    }

    for (const post of postsResult) {
      if (!post.public_code) {
        continue;
      }
      items.push({
        id: `post-${post.id}`,
        type: "post",
        badgeLabel: DISCOVER_UPDATE_BADGE_LABELS.post,
        title: post.title,
        parentTitle: post.category?.trim() || undefined,
        href: getContentPostUrl({ slug: post.slug, public_code: post.public_code }),
        publishedAt: publishedAt(post.published_at ?? post.updated_at)
      });
    }

    for (const row of (audioResult.data ?? []) as Array<{
      id: string;
      story_id: string;
      title: string;
      published_at: string | null;
      updated_at: string;
      stories: EpisodeRow["stories"];
    }>) {
      if (!row.story_id) {
        continue;
      }
      const story = firstRelation(row.stories);
      if (!story?.slug || !story.public_code) {
        continue;
      }
      const { authorDisplayName, authorUsername } = authorFromCreatorProfiles(
        story.creator_profiles
      );
      items.push({
        id: `audio-${row.id}`,
        type: "audio",
        badgeLabel: DISCOVER_UPDATE_BADGE_LABELS.audio,
        title: row.title,
        parentTitle: story.title,
        authorDisplayName,
        authorUsername,
        href: "/media?tab=audio",
        publishedAt: publishedAt(row.published_at ?? row.updated_at)
      });
    }

    for (const film of filmsResult.items) {
      if (!film.story_id) {
        continue;
      }
      items.push({
        id: `video-${film.id}`,
        type: "video",
        badgeLabel: DISCOVER_UPDATE_BADGE_LABELS.video,
        title: film.title,
        parentTitle: film.storyTitle,
        authorDisplayName: film.creatorName ?? undefined,
        authorUsername: film.creatorUsername?.trim().toLowerCase() || undefined,
        href: "/media?tab=video",
        publishedAt: publishedAt(film.published_at)
      });
    }

    return mergeSorted(items).slice(0, limit);
  } catch {
    return [];
  }
}

export function getDiscoverUpdateAuthorHref(item: DiscoverUpdateItem): string | null {
  return item.authorUsername ? getProfileUrl(item.authorUsername) : null;
}
