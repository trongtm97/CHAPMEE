import "server-only";

import { createClient } from "@/lib/data/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { getContinueListeningForStory } from "@/src/lib/audio/audio-progress";
import { buildStoryAudioQueue, type StoryAudioQueueItem } from "@/src/lib/audio/audio-queue";
import { getAudioPolicySettings } from "@/lib/settings/audio-policy-settings";
import { pickStoryAudioAdRepresentativeItem } from "@/src/lib/audio/audio-ads-guard";
import { canShowAdsOnAudio } from "@/src/lib/audio/audio-policy";
import { getPublishedStoryAudioItems, type AudioItemRow } from "@/src/lib/audio/audio-items";

export type PublicAudioItem = AudioItemRow & {
  story_title: string;
  story_slug: string;
  story_public_code: string | null;
  story_content_origin: string | null;
  author_username: string | null;
  author_display_name: string | null;
  story_href: string;
};

type AudioLandingFilters = {
  origin?: "original" | "translation";
  source?: "external_audio_url" | "youtube_embed";
  continuousOnly?: boolean;
  newest?: boolean;
};

export type AudioLandingResult = {
  items: PublicAudioItem[];
  totalCount: number;
  page: number;
  pageSize: number;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  public_code: string | null;
  content_origin: string | null;
  creator_profiles:
    | {
        profiles:
          | {
              username: string | null;
              display_name: string | null;
            }
          | {
              username: string | null;
              display_name: string | null;
            }[]
          | null;
      }
    | {
        profiles:
          | {
              username: string | null;
              display_name: string | null;
            }
          | {
              username: string | null;
              display_name: string | null;
            }[]
          | null;
      }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function mapStoryInfo(story: StoryRow | null) {
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
          : "/truyen"
  };
}

export async function computeStoryAudioAdsAllowed(
  story: {
    id: string;
    content_origin?: string | null;
    rights_status?: string | null;
  },
  items: AudioItemRow[]
): Promise<boolean> {
  const settings = await getAudioPolicySettings();
  const representative = pickStoryAudioAdRepresentativeItem(items);
  if (!representative) {
    return false;
  }
  return canShowAdsOnAudio(
    {
      id: story.id,
      content_origin: story.content_origin,
      rights_status: story.rights_status
    },
    representative,
    settings
  );
}

export async function getPublicStoryAudioData(storyId: string) {
  const [items, queue, currentProfile] = await Promise.all([
    getPublishedStoryAudioItems(storyId),
    buildStoryAudioQueue(storyId),
    getCurrentProfile()
  ]);

  let continueAudioItemId: string | null = null;
  let completedAudioItemIds: string[] = [];
  if (currentProfile.profile?.id) {
    const { getStoryAudioProgressForStory } = await import("@/src/lib/audio/audio-progress");
    const [progress, rows] = await Promise.all([
      getContinueListeningForStory(currentProfile.profile.id, storyId).catch(() => null),
      getStoryAudioProgressForStory(currentProfile.profile.id, storyId).catch(() => [])
    ]);
    continueAudioItemId = progress?.audio_item_id ?? null;
    completedAudioItemIds = rows
      .filter((row) => Boolean(row.completed_at))
      .map((row) => row.audio_item_id);
  }

  return {
    items,
    queue,
    continueAudioItemId,
    completedAudioItemIds
  };
}

export async function getAudioLandingPageData(
  page: number,
  pageSize: number,
  filters: AudioLandingFilters
): Promise<AudioLandingResult> {
  const db = await createClient();
  const safePage = Math.max(1, page);
  const safeSize = Math.min(24, Math.max(6, pageSize));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  let query = db
    .from("audio_items")
    .select(
      "*, stories!inner(id, title, slug, public_code, content_origin, status, visibility, creator_profiles(profiles(username, display_name)))",
      { count: "exact" }
    )
    .eq("status", "published")
    .eq("stories.status", "published")
    .eq("stories.visibility", "public");

  if (filters.source) {
    query = query.eq("audio_source_type", filters.source);
  }
  if (filters.origin) {
    query = query.eq("stories.content_origin", filters.origin);
  }
  if (filters.continuousOnly) {
    query = query.eq("audio_source_type", "external_audio_url").eq("continuous_playback_allowed", true);
  }

  query = filters.newest
    ? query.order("updated_at", { ascending: false })
    : query
        .order("part_number", { ascending: true, nullsFirst: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

  const { data, count, error } = await query.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as Array<AudioItemRow & { stories: StoryRow | StoryRow[] | null }>).map((row) => {
    const story = firstRelation(row.stories);
    return {
      ...row,
      ...mapStoryInfo(story)
    };
  });

  return {
    items: rows,
    totalCount: Number(count ?? 0),
    page: safePage,
    pageSize: safeSize
  };
}

export async function getQueueForAudioItem(
  storyId: string,
  audioItemId: string
): Promise<StoryAudioQueueItem[] | null> {
  const queue = await buildStoryAudioQueue(storyId);
  if (!queue.some((item) => item.audioItemId === audioItemId)) {
    return null;
  }
  return queue;
}
