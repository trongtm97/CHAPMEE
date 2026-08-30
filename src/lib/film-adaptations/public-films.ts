import "server-only";

import { createPublicClient } from "@/lib/data/public-client";
import { getProfileUrl } from "@/lib/profile/profile-url";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { getFilmAdaptationPolicySettings } from "@/lib/settings/film-adaptation-settings";
import { pickStoryFilmAdRepresentativeItem } from "@/src/lib/film-adaptations/film-ads-guard";
import { canShowAdsOnFilmAdaptation } from "@/src/lib/film-adaptations/film-policy";
import type { FilmAdaptationRow } from "@/src/lib/film-adaptations/film-adaptations";

export type PublicFilmAdaptation = Pick<
  FilmAdaptationRow,
  | "id"
  | "story_id"
  | "youtube_url"
  | "youtube_video_id"
  | "youtube_playlist_id"
  | "youtube_embed_type"
  | "title"
  | "description"
  | "creative_note"
  | "relation_type"
  | "language"
  | "sort_order"
  | "status"
  | "rights_status"
  | "ads_policy"
  | "is_free"
  | "published_at"
> & {
  storyTitle: string;
  storySlug: string;
  storyPublicCode: string | null;
  storyHref: string;
  creatorName: string | null;
  creatorUsername: string | null;
  creatorHref: string | null;
};

export type PublicFilmAdaptationByStory = PublicFilmAdaptation & {
  isSameStory: boolean;
};

export type DiscoverFilmsPage = {
  items: PublicFilmAdaptation[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

function normalizePage(value?: number): number {
  if (!value || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

function normalizePageSize(value?: number): number {
  if (!value || !Number.isFinite(value)) return 12;
  return Math.min(30, Math.max(6, Math.floor(value)));
}

export async function computeStoryFilmAdsAllowed(
  story: {
    id: string;
    content_origin?: string | null;
    rights_status?: string | null;
  },
  items: Pick<FilmAdaptationRow, "status" | "ads_policy" | "rights_status">[]
): Promise<boolean> {
  const settings = await getFilmAdaptationPolicySettings();
  const representative = pickStoryFilmAdRepresentativeItem(items);
  if (!representative) {
    return false;
  }
  return canShowAdsOnFilmAdaptation(
    {
      id: story.id,
      content_origin: story.content_origin,
      rights_status: story.rights_status
    },
    representative,
    settings
  );
}

export async function getPublishedStoryFilmAdaptationsPublic(storyId: string): Promise<PublicFilmAdaptation[]> {
  const db = createPublicClient();
  const { data, error } = await db
    .from("story_film_adaptations")
    .select(
      "id,story_id,youtube_url,youtube_video_id,youtube_playlist_id,youtube_embed_type,title,description,creative_note,relation_type,language,sort_order,status,rights_status,ads_policy,is_free,published_at"
    )
    .eq("story_id", storyId)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  const films = (data as Array<FilmAdaptationRow>) ?? [];
  if (films.length === 0) return [];

  const story = await db
    .from("stories")
    .select("id,title,slug,public_code,creator_id")
    .eq("id", storyId)
    .maybeSingle();
  if (story.error || !story.data) return [];
  const storyData = story.data;

  const creator = await db
    .from("profiles")
    .select("id,username,display_name")
    .eq("id", story.data.creator_id)
    .maybeSingle();

  const creatorName = (creator.data as { display_name?: string | null } | null)?.display_name ?? null;
  const creatorUsername = (creator.data as { username?: string | null } | null)?.username ?? null;
  const storyHref =
    storyData.public_code && storyData.slug
      ? getStoryDetailHref({ slug: storyData.slug, public_code: storyData.public_code })
      : `/truyen/${storyData.slug}`;

  return films.map((film) => ({
    ...film,
    storyTitle: storyData.title,
    storySlug: storyData.slug,
    storyPublicCode: storyData.public_code,
    storyHref,
    creatorName,
    creatorUsername,
    creatorHref: getProfileUrl(creatorUsername)
  }));
}

export async function getPublishedFilmsRelatedToStory(storyId: string): Promise<PublicFilmAdaptationByStory[]> {
  const [storyFilms, discoverFilms] = await Promise.all([
    getPublishedStoryFilmAdaptationsPublic(storyId),
    getDiscoverPublishedFilms({ page: 1, pageSize: 24 })
  ]);

  const merged = new Map<string, PublicFilmAdaptationByStory>();
  for (const item of discoverFilms.items) {
    merged.set(item.id, { ...item, isSameStory: item.story_id === storyId });
  }
  for (const item of storyFilms) {
    merged.set(item.id, { ...item, isSameStory: true });
  }

  return Array.from(merged.values()).sort((a, b) => {
    if (a.isSameStory !== b.isSameStory) {
      return a.isSameStory ? -1 : 1;
    }
    return (b.published_at ?? "").localeCompare(a.published_at ?? "");
  });
}

export type FilmLandingFilters = {
  relationType?: string;
  newest?: boolean;
};

function emptyDiscoverFilmsPage(page: number, pageSize: number): DiscoverFilmsPage {
  return {
    items: [],
    page,
    pageSize,
    totalCount: 0,
    totalPages: 1
  };
}

export async function getDiscoverPublishedFilms(params?: {
  page?: number;
  pageSize?: number;
  filters?: FilmLandingFilters;
}): Promise<DiscoverFilmsPage> {
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const filters = params?.filters;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const db = createPublicClient();
    let filmsQuery = db
      .from("story_film_adaptations")
      .select(
        "id,story_id,youtube_url,youtube_video_id,youtube_playlist_id,youtube_embed_type,title,description,creative_note,relation_type,language,sort_order,status,rights_status,ads_policy,is_free,published_at",
        { count: "exact" }
      )
      .eq("status", "published");

    if (filters?.relationType) {
      filmsQuery = filmsQuery.eq("relation_type", filters.relationType);
    }

    filmsQuery = filters?.newest
      ? filmsQuery
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
      : filmsQuery
          .order("sort_order", { ascending: true })
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });

    const [{ data, error, count }, storiesResult] = await Promise.all([
      filmsQuery.range(from, to),
      db.from("stories").select("id,title,slug,public_code,creator_id")
    ]);

    if (error || storiesResult.error) {
      return emptyDiscoverFilmsPage(page, pageSize);
    }

    const films = (data as Array<FilmAdaptationRow>) ?? [];
    const stories = (storiesResult.data as Array<{
      id: string;
      title: string;
      slug: string;
      public_code: string | null;
      creator_id: string;
    }>) ?? [];
    const storyById = new Map(stories.map((story) => [story.id, story]));

    const creatorIds = Array.from(
      new Set(
        films
          .map((film) => storyById.get(film.story_id)?.creator_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    const creatorRows =
      creatorIds.length > 0
        ? await db
            .from("profiles")
            .select("id,username,display_name")
            .in("id", creatorIds)
        : { data: [], error: null };
    if (creatorRows.error) {
      return emptyDiscoverFilmsPage(page, pageSize);
    }
    const creatorById = new Map(
      ((creatorRows.data as Array<{ id: string; username: string | null; display_name: string | null }>) ?? []).map(
        (profile) => [profile.id, profile]
      )
    );

    const mapped = films.map((film): PublicFilmAdaptation | null => {
      const story = storyById.get(film.story_id);
      if (!story) return null;
      const creator = creatorById.get(story.creator_id);
      const storyHref =
        story.public_code && story.slug
          ? getStoryDetailHref({ slug: story.slug, public_code: story.public_code })
          : `/truyen/${story.slug}`;

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
    });
    const items = mapped.filter((value): value is PublicFilmAdaptation => value !== null);

    const totalCount = Number(count ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return { items, page, pageSize, totalCount, totalPages };
  } catch {
    return emptyDiscoverFilmsPage(page, pageSize);
  }
}
