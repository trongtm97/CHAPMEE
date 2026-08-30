import "server-only";

import { createPublicClient } from "@/lib/data/public-client";
import { getAudioPolicySettings } from "@/lib/settings/audio-policy-settings";
import { canUseContinuousPlayback } from "@/src/lib/audio/audio-policy";

export type StoryAudioCardSummary = {
  hasPublishedAudio: boolean;
  hasContinuousPlayback: boolean;
};

const EMPTY_SUMMARY: StoryAudioCardSummary = {
  hasPublishedAudio: false,
  hasContinuousPlayback: false
};

type AudioSummaryRow = {
  story_id: string;
  audio_source_type: string | null;
  continuous_playback_allowed: boolean | null;
};

/**
 * Batch-load published audio flags for story cards (discover, catalog, profile, rankings).
 */
export async function getStoryAudioCardSummaryMap(
  storyIds: string[]
): Promise<Map<string, StoryAudioCardSummary>> {
  const uniqueIds = [...new Set(storyIds.filter(Boolean))];
  const map = new Map<string, StoryAudioCardSummary>();
  if (uniqueIds.length === 0) {
    return map;
  }

  const db = createPublicClient();
  const { data, error } = await db
    .from("audio_items")
    .select("story_id, audio_source_type, continuous_playback_allowed")
    .in("story_id", uniqueIds)
    .eq("status", "published");

  if (error) {
    console.error("[audio-summary] failed to load audio_items", error.message);
    for (const id of uniqueIds) {
      map.set(id, { ...EMPTY_SUMMARY });
    }
    return map;
  }

  const settings = await getAudioPolicySettings();
  const rowsByStory = new Map<string, AudioSummaryRow[]>();

  for (const row of (data ?? []) as AudioSummaryRow[]) {
    const storyId = String(row.story_id);
    const bucket = rowsByStory.get(storyId) ?? [];
    bucket.push(row);
    rowsByStory.set(storyId, bucket);
  }

  for (const storyId of uniqueIds) {
    const rows = rowsByStory.get(storyId) ?? [];
    const hasPublishedAudio = rows.length > 0;
    const continuousCount = rows.filter((row) => {
      if (row.audio_source_type !== "external_audio_url") {
        return false;
      }
      if (!row.continuous_playback_allowed) {
        return false;
      }
      return canUseContinuousPlayback(
        { id: storyId },
        { audio_source_type: row.audio_source_type },
        settings
      );
    }).length;

    map.set(storyId, {
      hasPublishedAudio,
      hasContinuousPlayback: continuousCount >= 2
    });
  }

  return map;
}

export async function getStoryIdsWithPublishedAudio(limit = 5000): Promise<string[]> {
  const db = createPublicClient();
  const { data, error } = await db
    .from("audio_items")
    .select("story_id")
    .eq("status", "published")
    .limit(limit);

  if (error) {
    console.error("[audio-summary] failed to list story ids with audio", error.message);
    return [];
  }

  return [...new Set((data ?? []).map((row) => String((row as { story_id: string }).story_id)))];
}

export function mergeStoryAudioCardSummary<T extends { id: string }>(
  story: T,
  summaryMap: Map<string, StoryAudioCardSummary>
): T & StoryAudioCardSummary {
  const summary = summaryMap.get(story.id) ?? EMPTY_SUMMARY;
  return {
    ...story,
    hasPublishedAudio: summary.hasPublishedAudio,
    hasContinuousPlayback: summary.hasContinuousPlayback
  };
}

export async function enrichStoriesWithAudioCardSummary<T extends { id: string }>(
  stories: T[]
): Promise<Array<T & StoryAudioCardSummary>> {
  if (stories.length === 0) {
    return [];
  }
  const summaryMap = await getStoryAudioCardSummaryMap(stories.map((story) => story.id));
  return stories.map((story) => mergeStoryAudioCardSummary(story, summaryMap));
}

export async function enrichDiscoverStories(stories: import("@/lib/discover/getDiscoverData").DiscoverStory[]) {
  return enrichStoriesWithAudioCardSummary(stories);
}
