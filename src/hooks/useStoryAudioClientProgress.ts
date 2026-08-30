"use client";

import { useEffect, useMemo, useState } from "react";
import { AUDIO_PROGRESS_EVENT } from "@/src/lib/audio/audio-progress-events";
import {
  getGuestCompletedAudioItemIdsForStory,
  getGuestContinueAudioItemId
} from "@/src/lib/audio/audio-player-progress";

type UseStoryAudioClientProgressArgs = {
  storyId: string;
  itemIds: string[];
  serverContinueAudioItemId?: string | null;
  serverCompletedAudioItemIds?: string[];
};

export function useStoryAudioClientProgress({
  storyId,
  itemIds,
  serverContinueAudioItemId = null,
  serverCompletedAudioItemIds = []
}: UseStoryAudioClientProgressArgs) {
  const [guestCompletedIds, setGuestCompletedIds] = useState<string[]>([]);
  const [guestContinueId, setGuestContinueId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setGuestCompletedIds(getGuestCompletedAudioItemIdsForStory(storyId));
      setGuestContinueId(getGuestContinueAudioItemId(storyId, itemIds));
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(AUDIO_PROGRESS_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(AUDIO_PROGRESS_EVENT, sync);
    };
  }, [storyId, itemIds]);

  const completedAudioItemIds = useMemo(() => {
    const merged = new Set([...serverCompletedAudioItemIds, ...guestCompletedIds]);
    return [...merged];
  }, [guestCompletedIds, serverCompletedAudioItemIds]);

  const continueAudioItemId =
    serverContinueAudioItemId ?? guestContinueId ?? null;

  return { completedAudioItemIds, continueAudioItemId };
}
