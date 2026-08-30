import "server-only";

import { createClient } from "@/lib/data/server";
import { getAudioPolicySettings } from "@/lib/settings/audio-policy-settings";
import { getRecentAudioProgress } from "@/src/lib/audio/audio-progress";
import { getStoryDetailHref } from "@/lib/stories/story-routes";

export type ContinueListeningAudioItem = {
  storyId: string;
  storyTitle: string;
  storyHref: string;
  audioItemId: string;
  audioTitle: string;
  partNumber: number | null;
  partLabel: string;
  lastPlayedAt: string | null;
};

function partLabel(partNumber: number | null, sortOrder: number) {
  if (partNumber != null && Number.isFinite(partNumber)) {
    return `Phần ${partNumber}`;
  }
  return `Mục ${Math.max(1, sortOrder + 1)}`;
}

export async function getContinueListeningAudioForUser(
  profileId: string,
  limit = 5
): Promise<ContinueListeningAudioItem[]> {
  const settings = await getAudioPolicySettings();
  if (!settings.show_continue_listening || !settings.audio_enabled) {
    return [];
  }

  const rows = await getRecentAudioProgress(profileId).catch(() => []);
  const inProgress = rows.filter((row) => !row.completed_at);
  if (inProgress.length === 0) {
    return [];
  }

  const slice = inProgress.slice(0, limit);
  const storyIds = [...new Set(slice.map((row) => row.story_id))];
  const audioIds = [...new Set(slice.map((row) => row.audio_item_id))];

  const db = await createClient();
  const [{ data: stories }, { data: audioItems }] = await Promise.all([
    db
      .from("stories")
      .select("id, title, slug, public_code")
      .in("id", storyIds),
    db
      .from("audio_items")
      .select("id, title, part_number, sort_order, status")
      .in("id", audioIds)
      .eq("status", "published")
  ]);

  const storyById = new Map(
    (stories ?? []).map((row) => [
      String((row as { id: string }).id),
      row as { id: string; title: string; slug: string | null; public_code: string | null }
    ])
  );
  const audioById = new Map(
    (audioItems ?? []).map((row) => [
      String((row as { id: string }).id),
      row as { id: string; title: string; part_number: number | null; sort_order: number }
    ])
  );

  const results: ContinueListeningAudioItem[] = [];

  for (const progress of slice) {
    const story = storyById.get(progress.story_id);
    const audio = audioById.get(progress.audio_item_id);
    if (!story || !audio) {
      continue;
    }

    results.push({
      storyId: progress.story_id,
      storyTitle: story.title,
      storyHref:
        story.slug && story.public_code
          ? getStoryDetailHref({ slug: story.slug, public_code: story.public_code })
          : "/truyen",
      audioItemId: progress.audio_item_id,
      audioTitle: audio.title,
      partNumber: audio.part_number,
      partLabel: partLabel(audio.part_number, audio.sort_order ?? 0),
      lastPlayedAt: progress.last_played_at
    });
  }

  return results;
}

export async function getContinueAudioItemIdsForProfile(
  profileId: string
): Promise<Set<string>> {
  const settings = await getAudioPolicySettings();
  if (!settings.show_continue_listening) {
    return new Set();
  }

  const rows = await getRecentAudioProgress(profileId).catch(() => []);
  return new Set(
    rows.filter((row) => !row.completed_at).map((row) => row.audio_item_id)
  );
}
