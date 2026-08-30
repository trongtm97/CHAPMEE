import "server-only";

import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/data/public-client";
import { createClient } from "@/lib/data/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { loadCurrentStoryImagesByStoryIds } from "@/lib/images/get-current-story-image";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import { escapeIlikePattern } from "@/lib/stories/story-catalog-query";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { getProfileUrl } from "@/lib/profile/profile-url";
import { getPublicStoryIdsForMainGenreSlug } from "@/lib/taxonomy/public-genres";
import { descriptionHasChapmeeSourceLink } from "@/lib/media/chapmee-source";
import type { MediaHubParams } from "@/lib/media/media-query-params";
import { hasMediaTaxonomyFilters } from "@/lib/media/media-catalog-filter-bridge";
import {
  intersectMediaStoryIdFilters,
  resolveMediaTaxonomyStoryIds
} from "@/lib/media/resolve-media-taxonomy-story-ids";
import type { PublicAudioItem } from "@/src/lib/audio/public-audio";
import { getContinueAudioItemIdsForProfile } from "@/src/lib/audio/continue-listening";
import type { AudioItemRow } from "@/src/lib/audio/audio-items";
import type { PublicFilmAdaptation } from "@/src/lib/film-adaptations/public-films";
import type { FilmAdaptationRow } from "@/src/lib/film-adaptations/film-adaptations";

export type MediaHubStats = {
  audioCount: number;
  videoCount: number;
  storiesWithMediaCount: number;
};

export type MediaHubAudioItem = PublicAudioItem & {
  cover_url: string | null;
  story_is_completed: boolean | null;
  story_updated_at: string | null;
};

export type MediaHubAudioPage = {
  items: MediaHubAudioItem[];
  featuredItems: MediaHubAudioItem[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type MediaHubVideoPage = {
  items: PublicFilmAdaptation[];
  featuredItems: PublicFilmAdaptation[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type StoryJoinRow = {
  id: string;
  title: string;
  slug: string;
  public_code: string | null;
  content_origin: string | null;
  cover_url: string | null;
  is_completed: boolean | null;
  updated_at: string | null;
  status: string;
  visibility: string;
  creator_profiles:
    | {
        profiles:
          | { username: string | null; display_name: string | null }
          | { username: string | null; display_name: string | null }[]
          | null;
      }
    | {
        profiles:
          | { username: string | null; display_name: string | null }
          | { username: string | null; display_name: string | null }[]
          | null;
      }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function mapStoryInfo(story: StoryJoinRow | null) {
  const creatorProfile = firstRelation(story?.creator_profiles);
  const profile = firstRelation(creatorProfile?.profiles);
  const storySlug = story?.slug ?? "";
  const storyPublicCode = story?.public_code ?? "";
  return {
    story_title: story?.title ?? "",
    story_slug: storySlug,
    story_public_code: story?.public_code ?? null,
    story_content_origin: story?.content_origin ?? null,
    author_username: profile?.username ?? null,
    author_display_name: profile?.display_name ?? null,
    story_href:
      storySlug && storyPublicCode
        ? getStoryDetailHref({ slug: storySlug, public_code: storyPublicCode })
        : storySlug
          ? `/truyen/${storySlug}`
          : "/truyen",
    cover_url: resolveStoryCoverUrl(story?.cover_url ?? null),
    story_is_completed: story?.is_completed ?? null,
    story_updated_at: story?.updated_at ?? null
  };
}

async function resolveGenreStoryIds(genreSlug: string | undefined): Promise<string[] | null> {
  if (!genreSlug?.trim()) {
    return null;
  }
  const db = await createClient();
  const ids = await getPublicStoryIdsForMainGenreSlug(db, genreSlug.trim(), 3000);
  return ids && ids.length > 0 ? ids : [];
}

async function getMediaHubStatsUncached(): Promise<MediaHubStats> {
  const db = createPublicClient();

  const [audioRes, videoRes, audioStoriesRes, videoStoriesRes] = await Promise.all([
    db
      .from("audio_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    db
      .from("story_film_adaptations")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    db
      .from("audio_items")
      .select("story_id")
      .eq("status", "published")
      .limit(5000),
    db
      .from("story_film_adaptations")
      .select("story_id")
      .eq("status", "published")
      .limit(5000)
  ]);

  const storyIds = new Set<string>();
  for (const row of audioStoriesRes.data ?? []) {
    if (row.story_id) storyIds.add(String(row.story_id));
  }
  for (const row of videoStoriesRes.data ?? []) {
    if (row.story_id) storyIds.add(String(row.story_id));
  }

  return {
    audioCount: Number(audioRes.count ?? 0),
    videoCount: Number(videoRes.count ?? 0),
    storiesWithMediaCount: storyIds.size
  };
}

export function getMediaHubStats(): Promise<MediaHubStats> {
  return unstable_cache(getMediaHubStatsUncached, ["media-hub-stats"], {
    revalidate: 300,
    tags: ["media-hub"]
  })();
}

function applyAudioSort(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  sort: MediaHubParams["sort"]
) {
  switch (sort) {
    case "story_new":
      return query.order("updated_at", {
        ascending: false,
        nullsFirst: false,
        foreignTable: "stories"
      });
    case "popular":
      return query
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false });
    case "saved":
    case "hot":
      return query.order("updated_at", { ascending: false });
    case "new":
    default:
      return query.order("updated_at", { ascending: false });
  }
}

export async function getMediaHubAudioPage(params: MediaHubParams): Promise<MediaHubAudioPage> {
  const db = await createClient();
  const safePage = params.page;
  const safeSize = params.pageSize;
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  const [genreStoryIds, taxonomyStoryIds] = await Promise.all([
    resolveGenreStoryIds(params.genre),
    resolveMediaTaxonomyStoryIds(params)
  ]);
  const storyIds = intersectMediaStoryIdFilters(genreStoryIds, taxonomyStoryIds);
  if (storyIds && storyIds.length === 0) {
    return { items: [], featuredItems: [], totalCount: 0, page: safePage, pageSize: safeSize };
  }

  let query = db
    .from("audio_items")
    .select(
      "*, stories!inner(id, title, slug, public_code, content_origin, cover_url, is_completed, updated_at, status, visibility, creator_profiles(profiles(username, display_name)))",
      { count: "exact" }
    )
    .eq("status", "published")
    .eq("stories.status", "published")
    .eq("stories.visibility", "public");

  if (storyIds) {
    query = query.in("story_id", storyIds);
  }
  if (params.origin) {
    query = query.eq("stories.content_origin", params.origin);
  }
  if (params.status === "completed") {
    query = query.eq("stories.is_completed", true);
  } else if (params.status === "ongoing") {
    query = query.eq("stories.is_completed", false);
  }

  if (params.audioSource === "external_audio_url" || params.audioSource === "youtube_embed") {
    query = query.eq("audio_source_type", params.audioSource);
  } else if (params.audioSource === "continuous") {
    query = query.eq("audio_source_type", "external_audio_url").eq("continuous_playback_allowed", true);
  } else if (params.audioSource === "source_ok") {
    query = query.eq("last_check_status", "ok");
  }

  if (params.q) {
    const escaped = escapeIlikePattern(params.q);
    query = query.or(`title.ilike.%${escaped}%,stories.title.ilike.%${escaped}%`);
  }

  query = applyAudioSort(query, params.sort);

  const { data, count, error } = await query.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as Array<AudioItemRow & { stories: StoryJoinRow | StoryJoinRow[] | null }>).map(
    (row) => {
      const story = firstRelation(row.stories);
      const mapped = mapStoryInfo(story);
      return {
        ...row,
        ...mapped
      } satisfies MediaHubAudioItem;
    }
  );

  let featuredItems: MediaHubAudioItem[] = [];
  if (safePage === 1) {
    featuredItems = await getMediaHubFeaturedAudio(params, rows);
  }

  return {
    items: rows,
    featuredItems,
    totalCount: Number(count ?? 0),
    page: safePage,
    pageSize: safeSize
  };
}

async function getMediaHubFeaturedAudio(
  params: MediaHubParams,
  pageItems: MediaHubAudioItem[]
): Promise<MediaHubAudioItem[]> {
  if (
    params.q ||
    params.origin ||
    params.status ||
    hasMediaTaxonomyFilters(params) ||
    params.audioSource !== "all"
  ) {
    return [];
  }

  const auth = await getCurrentUser();
  const continueIds = auth.user
    ? await getContinueAudioItemIdsForProfile(auth.user.id)
    : new Set<string>();

  const fromContinue = pageItems.filter((item) => continueIds.has(item.id)).slice(0, 4);
  if (fromContinue.length >= 4) {
    return fromContinue;
  }

  const db = await createClient();
  const { data } = await db
    .from("audio_items")
    .select(
      "*, stories!inner(id, title, slug, public_code, content_origin, cover_url, is_completed, updated_at, status, visibility, creator_profiles(profiles(username, display_name)))"
    )
    .eq("status", "published")
    .eq("stories.status", "published")
    .eq("stories.visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(6);

  const mapped = ((data ?? []) as Array<AudioItemRow & { stories: StoryJoinRow | StoryJoinRow[] | null }>)
    .map((row) => {
      const story = firstRelation(row.stories);
      return { ...row, ...mapStoryInfo(story) } satisfies MediaHubAudioItem;
    })
    .filter((item) => !fromContinue.some((c) => c.id === item.id));

  const merged = [...fromContinue, ...mapped].slice(0, 4);
  return merged;
}

export async function getMediaHubVideoPage(params: MediaHubParams): Promise<MediaHubVideoPage> {
  const page = params.page;
  const pageSize = params.pageSize;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [genreStoryIds, taxonomyStoryIds] = await Promise.all([
    resolveGenreStoryIds(params.genre),
    resolveMediaTaxonomyStoryIds(params)
  ]);
  const storyIds = intersectMediaStoryIdFilters(genreStoryIds, taxonomyStoryIds);
  if (storyIds && storyIds.length === 0) {
    return {
      items: [],
      featuredItems: [],
      page,
      pageSize,
      totalCount: 0,
      totalPages: 1
    };
  }

  const db = await createClient();
  let filmsQuery = db
    .from("story_film_adaptations")
    .select(
      "id,story_id,youtube_url,youtube_video_id,youtube_playlist_id,youtube_embed_type,title,description,creative_note,relation_type,language,sort_order,status,rights_status,ads_policy,is_free,published_at,created_at,updated_at",
      { count: "exact" }
    )
    .eq("status", "published");

  if (params.relation?.trim()) {
    filmsQuery = filmsQuery.eq("relation_type", params.relation.trim());
  }
  if (storyIds) {
    filmsQuery = filmsQuery.in("story_id", storyIds);
  }

  const newest =
    params.sort === "new" || params.videoFilter === "new";
  filmsQuery = newest
    ? filmsQuery
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
    : params.sort === "story_new"
      ? filmsQuery.order("updated_at", { ascending: false })
      : params.sort === "popular" || params.sort === "hot" || params.sort === "saved"
        ? filmsQuery
            .order("published_at", { ascending: false, nullsFirst: false })
            .order("updated_at", { ascending: false })
        : filmsQuery
            .order("sort_order", { ascending: true })
            .order("published_at", { ascending: false, nullsFirst: false });

  const [{ data, error, count }, storiesResult] = await Promise.all([
    filmsQuery.range(from, to),
    db
      .from("stories")
      .select("id,title,slug,public_code,creator_id,content_origin,cover_url,is_completed,updated_at,status,visibility")
      .eq("visibility", "public")
      .eq("status", "published")
  ]);

  if (error) throw new Error(error.message);
  if (storiesResult.error) throw new Error(storiesResult.error.message);

  type StoryRow = {
    id: string;
    title: string;
    slug: string;
    public_code: string | null;
    creator_id: string;
    content_origin: string | null;
    cover_url: string | null;
    is_completed: boolean | null;
    updated_at: string | null;
  };

  const stories = (storiesResult.data as StoryRow[]) ?? [];
  const storyById = new Map(stories.map((story) => [story.id, story]));

  if (params.origin) {
    // filter applied below via story map
  }

  const creatorIds = Array.from(
    new Set(
      (data ?? [])
        .map((film) => storyById.get(String((film as FilmAdaptationRow).story_id))?.creator_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  const creatorRows =
    creatorIds.length > 0
      ? await db.from("profiles").select("id,username,display_name").in("id", creatorIds)
      : { data: [], error: null };
  if (creatorRows.error) throw new Error(creatorRows.error.message);
  const creatorById = new Map(
    ((creatorRows.data as Array<{ id: string; username: string | null; display_name: string | null }>) ?? []).map(
      (profile) => [profile.id, profile]
    )
  );

  let films = (data as FilmAdaptationRow[]) ?? [];

  const mapped = films
    .map((film): PublicFilmAdaptation | null => {
      const story = storyById.get(film.story_id);
      if (!story) return null;
      if (params.origin && story.content_origin !== params.origin) return null;
      if (params.status === "completed" && !story.is_completed) return null;
      if (params.status === "ongoing" && story.is_completed) return null;
      if (storyIds && !storyIds.includes(film.story_id)) return null;
      if (params.videoFilter === "chapmee_source" && !descriptionHasChapmeeSourceLink(film.description)) {
        return null;
      }
      if (params.q) {
        const q = params.q.toLowerCase();
        const creator = creatorById.get(story.creator_id);
        const haystack = [
          film.title,
          story.title,
          creator?.display_name,
          creator?.username
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return null;
      }

      const storyHref =
        story.public_code && story.slug
          ? getStoryDetailHref({ slug: story.slug, public_code: story.public_code })
          : `/truyen/${story.slug}`;
      const creator = creatorById.get(story.creator_id);

      return {
        ...film,
        storyTitle: story.title,
        storySlug: story.slug,
        storyPublicCode: story.public_code,
        storyHref,
        creatorName: creator?.display_name ?? null,
        creatorUsername: creator?.username ?? null,
        creatorHref: getProfileUrl(creator?.username)
      };
    })
    .filter((value): value is PublicFilmAdaptation => value !== null);

  const totalCount =
    params.videoFilter === "chapmee_source" ||
    params.q ||
    params.origin ||
    params.status ||
    params.mood ||
    params.setting ||
    params.format ||
    storyIds
      ? mapped.length
      : Number(count ?? mapped.length);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  let featuredItems: PublicFilmAdaptation[] = [];
  if (
    page === 1 &&
    !params.q &&
    !params.origin &&
    !params.status &&
    !hasMediaTaxonomyFilters(params) &&
    params.videoFilter === "all" &&
    !params.relation
  ) {
    const { data: featuredRaw } = await db
      .from("story_film_adaptations")
      .select(
        "id,story_id,youtube_url,youtube_video_id,youtube_playlist_id,youtube_embed_type,title,description,creative_note,relation_type,language,sort_order,status,rights_status,ads_policy,is_free,published_at,created_at,updated_at"
      )
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(4);
    featuredItems = ((featuredRaw as FilmAdaptationRow[]) ?? [])
      .map((film): PublicFilmAdaptation | null => {
        const story = storyById.get(film.story_id);
        if (!story) return null;
        const storyHref =
          story.public_code && story.slug
            ? getStoryDetailHref({ slug: story.slug, public_code: story.public_code })
            : `/truyen/${story.slug}`;
        const creator = creatorById.get(story.creator_id);
        return {
          ...film,
          storyTitle: story.title,
          storySlug: story.slug,
          storyPublicCode: story.public_code,
          storyHref,
          creatorName: creator?.display_name ?? null,
          creatorUsername: creator?.username ?? null,
          creatorHref: getProfileUrl(creator?.username)
        };
      })
      .filter((value): value is PublicFilmAdaptation => value !== null);
  }

  return {
    items: mapped,
    featuredItems,
    page,
    pageSize,
    totalCount,
    totalPages
  };
}

export async function enrichAudioCovers(items: MediaHubAudioItem[]): Promise<MediaHubAudioItem[]> {
  const storyIds = [...new Set(items.map((item) => item.story_id))];
  if (storyIds.length === 0) return items;
  const db = await createClient();
  const images = await loadCurrentStoryImagesByStoryIds(db, storyIds);
  return items.map((item) => {
    const image = images.get(item.story_id);
    const portrait = image?.portraitUrl ?? image?.thumbUrl ?? image?.squareUrl;
    if (!portrait) return item;
    return { ...item, cover_url: portrait };
  });
}
