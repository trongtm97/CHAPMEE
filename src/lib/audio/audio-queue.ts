import "server-only";

import { createClient } from "@/lib/data/server";
import { getAudioPolicySettings, type AudioPolicySettings } from "@/lib/settings/audio-policy-settings";
import { getPublishedStoryAudioItems, type AudioItemRow } from "@/src/lib/audio/audio-items";
import { canUseContinuousPlayback } from "@/src/lib/audio/audio-policy";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";

export type StoryAudioQueueItem = {
  audioItemId: string;
  storyId: string;
  storyHref: string;
  title: string;
  storyTitle: string;
  partNumber: number | null;
  externalAudioUrl: string;
  durationSeconds: number | null;
  coverImageUrl: string | null;
  authorDisplayName: string | null;
  authorUsername: string | null;
};

export type StoryAudioQueueOptions = {
  includeMetadata?: boolean;
};

type StoryMeta = {
  id: string;
  title: string;
  creator_id: string;
  slug: string | null;
  public_code: string | null;
  cover_url?: string | null;
  cover_image_url?: string | null;
};

async function getStoryMeta(storyId: string): Promise<StoryMeta> {
  const db = await createClient();
  const { data, error } = await db
    .from("stories")
    .select("id, title, creator_id, slug, public_code, cover_url")
    .eq("id", storyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Không tìm thấy truyện.");
  return data as StoryMeta;
}

async function getAuthorMeta(profileId: string): Promise<{ display_name: string | null; username: string | null }> {
  const db = await createClient();
  const { data, error } = await db
    .from("profiles")
    .select("display_name, username")
    .eq("id", profileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { display_name: string | null; username: string | null } | null) ?? {
    display_name: null,
    username: null
  };
}

function toQueueItem(
  item: AudioItemRow,
  story: StoryMeta,
  author: { display_name: string | null; username: string | null }
): StoryAudioQueueItem {
  const storyHref =
    story.slug && story.public_code
      ? getStoryDetailHref({ slug: story.slug, public_code: story.public_code })
      : "/truyen";
  return {
    audioItemId: item.id,
    storyId: item.story_id,
    storyHref,
    title: item.title,
    storyTitle: story.title,
    partNumber: item.part_number,
    externalAudioUrl: item.normalized_external_audio_url ?? item.external_audio_url ?? "",
    durationSeconds: item.duration_seconds,
    coverImageUrl: resolveStoryCoverUrl(story.cover_url ?? null),
    authorDisplayName: author.display_name,
    authorUsername: author.username
  };
}

function sortAudioParts(items: AudioItemRow[]): AudioItemRow[] {
  return [...items].sort((a, b) => {
    const aPart = a.part_number ?? Number.MAX_SAFE_INTEGER;
    const bPart = b.part_number ?? Number.MAX_SAFE_INTEGER;
    if (aPart !== bPart) return aPart - bPart;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

function filterPlayableExternalOnly(items: AudioItemRow[]): AudioItemRow[] {
  return sortAudioParts(items).filter((item) => {
    if (item.audio_source_type !== "external_audio_url") {
      return false;
    }
    return Boolean(item.external_audio_url || item.normalized_external_audio_url);
  });
}

function filterContinuousExternalOnly(
  items: AudioItemRow[],
  settings: AudioPolicySettings
): AudioItemRow[] {
  return filterPlayableExternalOnly(items).filter((item) => {
    if (!item.continuous_playback_allowed) {
      return false;
    }
    return canUseContinuousPlayback(
      { id: item.story_id },
      { audio_source_type: item.audio_source_type },
      settings
    );
  });
}

export async function buildStoryAudioQueue(
  storyId: string,
  _options: StoryAudioQueueOptions = {}
): Promise<StoryAudioQueueItem[]> {
  const story = await getStoryMeta(storyId);
  const [items, author] = await Promise.all([
    getPublishedStoryAudioItems(storyId),
    getAuthorMeta(story.creator_id)
  ]);

  const filtered = filterPlayableExternalOnly(items);
  return filtered.map((item) => toQueueItem(item, story, author));
}

export async function getContinuousStoryAudioQueue(
  storyId: string,
  startAudioItemId?: string,
  settings?: AudioPolicySettings
): Promise<StoryAudioQueueItem[]> {
  const activeSettings = settings ?? (await getAudioPolicySettings());
  const story = await getStoryMeta(storyId);
  const [items, author] = await Promise.all([
    getPublishedStoryAudioItems(storyId),
    getAuthorMeta(story.creator_id)
  ]);

  const queue = filterContinuousExternalOnly(items, activeSettings).map((item) =>
    toQueueItem(item, story, author)
  );

  if (!startAudioItemId) {
    return queue;
  }

  const startIdx = queue.findIndex((item) => item.audioItemId === startAudioItemId);
  if (startIdx <= 0) {
    return queue;
  }
  return [...queue.slice(startIdx), ...queue.slice(0, startIdx)];
}

export async function getNextAudioPartInStory(
  storyId: string,
  currentAudioItemId: string,
  settings?: AudioPolicySettings
): Promise<StoryAudioQueueItem | null> {
  const queue = await getContinuousStoryAudioQueue(storyId, undefined, settings);
  const currentIdx = queue.findIndex((item) => item.audioItemId === currentAudioItemId);
  if (currentIdx < 0 || currentIdx + 1 >= queue.length) {
    return null;
  }
  return queue[currentIdx + 1];
}

export async function getPreviousAudioPartInStory(
  storyId: string,
  currentAudioItemId: string,
  settings?: AudioPolicySettings
): Promise<StoryAudioQueueItem | null> {
  const queue = await getContinuousStoryAudioQueue(storyId, undefined, settings);
  const currentIdx = queue.findIndex((item) => item.audioItemId === currentAudioItemId);
  if (currentIdx <= 0) {
    return null;
  }
  return queue[currentIdx - 1];
}
