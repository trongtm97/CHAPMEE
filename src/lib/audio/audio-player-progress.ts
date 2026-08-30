"use client";

import { AUDIO_PROGRESS_EVENT } from "@/src/lib/audio/audio-progress-events";
import { GLOBAL_AUDIO_PROGRESS_KEY_PREFIX, getGuestProgressKey } from "@/src/lib/audio/audio-player-store";

export type StoredAudioProgress = {
  storyId: string;
  currentTime: number;
  duration: number | null;
  playbackRate: number;
  updatedAt: number;
  completed?: boolean;
};

const RESUME_MIN_SECONDS = 5;
const RESUME_END_BUFFER_SECONDS = 10;

export function readGuestAudioProgress(audioItemId: string): StoredAudioProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getGuestProgressKey(audioItemId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAudioProgress;
    if (!parsed || typeof parsed.currentTime !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeGuestAudioProgress(
  audioItemId: string,
  progress: Omit<StoredAudioProgress, "updatedAt"> & { updatedAt?: number }
) {
  if (typeof window === "undefined") return;
  const existing = readGuestAudioProgress(audioItemId);
  const payload: StoredAudioProgress = {
    storyId: progress.storyId,
    currentTime: progress.currentTime,
    duration: progress.duration,
    playbackRate: progress.playbackRate,
    completed: progress.completed ?? existing?.completed ?? false,
    updatedAt: progress.updatedAt ?? Date.now()
  };
  localStorage.setItem(getGuestProgressKey(audioItemId), JSON.stringify(payload));
  window.dispatchEvent(new Event(AUDIO_PROGRESS_EVENT));
}

export function markGuestAudioCompleted(audioItemId: string, storyId: string) {
  const existing = readGuestAudioProgress(audioItemId);
  writeGuestAudioProgress(audioItemId, {
    storyId,
    currentTime: existing?.currentTime ?? 0,
    duration: existing?.duration ?? null,
    playbackRate: existing?.playbackRate ?? 1,
    completed: true
  });
}

export function listGuestProgressForStory(storyId: string): StoredAudioProgress[] {
  if (typeof window === "undefined") return [];
  const rows: StoredAudioProgress[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(GLOBAL_AUDIO_PROGRESS_KEY_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as StoredAudioProgress;
      if (parsed?.storyId === storyId) {
        rows.push(parsed);
      }
    } catch {
      continue;
    }
  }
  return rows.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Completed audio item ids for a story (guest localStorage). */
export function getGuestCompletedAudioItemIdsForStory(storyId: string): string[] {
  if (typeof window === "undefined") return [];
  const ids: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(GLOBAL_AUDIO_PROGRESS_KEY_PREFIX)) continue;
    const audioItemId = key.slice(GLOBAL_AUDIO_PROGRESS_KEY_PREFIX.length);
    const progress = readGuestAudioProgress(audioItemId);
    if (progress?.storyId === storyId && progress.completed) {
      ids.push(audioItemId);
    }
  }
  return ids;
}

export function getGuestContinueAudioItemId(storyId: string, itemIds: string[]): string | null {
  let best: { id: string; updatedAt: number } | null = null;
  for (const id of itemIds) {
    const progress = readGuestAudioProgress(id);
    if (!progress || progress.storyId !== storyId || progress.completed) continue;
    const resume = pickResumeSeconds(progress.currentTime, progress.duration);
    if (resume <= 0) continue;
    if (!best || progress.updatedAt > best.updatedAt) {
      best = { id, updatedAt: progress.updatedAt };
    }
  }
  return best?.id ?? null;
}

export function isGuestContinueAudioItem(
  audioItemId: string,
  storyId: string,
  serverContinue = false
): boolean {
  if (serverContinue) return true;
  const progress = readGuestAudioProgress(audioItemId);
  if (!progress || progress.storyId !== storyId || progress.completed) return false;
  return pickResumeSeconds(progress.currentTime, progress.duration) > 0;
}

export function pickResumeSeconds(
  currentTime: number,
  duration?: number | null,
  completedAt?: string | null
): number {
  if (completedAt) return 0;
  if (!Number.isFinite(currentTime) || currentTime < RESUME_MIN_SECONDS) return 0;
  if (
    duration != null &&
    duration > RESUME_END_BUFFER_SECONDS &&
    currentTime >= duration - RESUME_END_BUFFER_SECONDS
  ) {
    return 0;
  }
  return Math.floor(currentTime);
}
