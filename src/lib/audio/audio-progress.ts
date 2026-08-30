import "server-only";

import { createClient } from "@/lib/data/server";

export type AudioProgressInput = {
  storyId: string;
  audioItemId: string;
  currentTimeSeconds: number;
  durationSeconds?: number | null;
  playbackRate?: number | null;
};

export type AudioProgressRow = {
  id: string;
  profile_id: string | null;
  anonymous_client_id: string | null;
  story_id: string;
  audio_item_id: string;
  current_time_seconds: number;
  duration_seconds: number | null;
  playback_rate: string | number;
  completed_at: string | null;
  last_played_at: string | null;
  created_at: string;
  updated_at: string;
};

export class AudioProgressError extends Error {}

function clampProgress(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0;
  return Math.max(0, Math.floor(seconds));
}

function normalizePlaybackRate(rate?: number | null): number {
  if (!Number.isFinite(rate ?? NaN)) return 1;
  return Math.max(0.5, Math.min(3, Number(rate)));
}

async function assertProfileMatchesSession(profileId: string) {
  const db = await createClient();
  const {
    data: { user },
    error
  } = await db.auth.getUser();
  if (error || !user) {
    throw new AudioProgressError("Bạn cần đăng nhập để lưu tiến độ nghe.");
  }
  if (user.id !== profileId) {
    throw new AudioProgressError("Bạn không thể ghi tiến độ cho tài khoản khác.");
  }
}

export async function getListeningProgress(profileId: string, audioItemId: string): Promise<AudioProgressRow | null> {
  await assertProfileMatchesSession(profileId);
  const db = await createClient();
  const { data, error } = await db
    .from("audio_listening_progress")
    .select("*")
    .eq("profile_id", profileId)
    .eq("audio_item_id", audioItemId)
    .maybeSingle();
  if (error) throw new AudioProgressError(error.message);
  return (data as AudioProgressRow | null) ?? null;
}

export async function saveListeningProgress(profileId: string, input: AudioProgressInput): Promise<AudioProgressRow> {
  await assertProfileMatchesSession(profileId);
  if (!input.storyId || !input.audioItemId) {
    throw new AudioProgressError("Thiếu storyId hoặc audioItemId.");
  }

  const db = await createClient();
  const now = new Date().toISOString();
  const patch = {
    profile_id: profileId,
    story_id: input.storyId,
    audio_item_id: input.audioItemId,
    current_time_seconds: clampProgress(input.currentTimeSeconds),
    duration_seconds:
      input.durationSeconds == null ? null : Math.max(1, Math.floor(Number(input.durationSeconds))),
    playback_rate: normalizePlaybackRate(input.playbackRate),
    last_played_at: now,
    updated_at: now
  };

  const { data, error } = await db
    .from("audio_listening_progress")
    .upsert(patch, { onConflict: "profile_id,audio_item_id" })
    .select("*")
    .single();
  if (error) throw new AudioProgressError(error.message);
  return data as AudioProgressRow;
}

export async function markAudioCompleted(profileId: string, audioItemId: string): Promise<AudioProgressRow> {
  await assertProfileMatchesSession(profileId);
  const db = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("audio_listening_progress")
    .update({
      completed_at: now,
      last_played_at: now,
      updated_at: now
    })
    .eq("profile_id", profileId)
    .eq("audio_item_id", audioItemId)
    .select("*")
    .single();
  if (error) throw new AudioProgressError(error.message);
  return data as AudioProgressRow;
}

export async function getContinueListeningForStory(
  profileId: string,
  storyId: string
): Promise<AudioProgressRow | null> {
  await assertProfileMatchesSession(profileId);
  const db = await createClient();
  const { data, error } = await db
    .from("audio_listening_progress")
    .select("*")
    .eq("profile_id", profileId)
    .eq("story_id", storyId)
    .order("last_played_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new AudioProgressError(error.message);
  return (data as AudioProgressRow | null) ?? null;
}

export async function getStoryAudioProgressForStory(
  profileId: string,
  storyId: string
): Promise<AudioProgressRow[]> {
  await assertProfileMatchesSession(profileId);
  const db = await createClient();
  const { data, error } = await db
    .from("audio_listening_progress")
    .select("*")
    .eq("profile_id", profileId)
    .eq("story_id", storyId);
  if (error) throw new AudioProgressError(error.message);
  return (data as AudioProgressRow[]) ?? [];
}

export async function getRecentAudioProgress(profileId: string): Promise<AudioProgressRow[]> {
  await assertProfileMatchesSession(profileId);
  const db = await createClient();
  const { data, error } = await db
    .from("audio_listening_progress")
    .select("*")
    .eq("profile_id", profileId)
    .order("last_played_at", { ascending: false })
    .limit(30);
  if (error) throw new AudioProgressError(error.message);
  return (data as AudioProgressRow[]) ?? [];
}
