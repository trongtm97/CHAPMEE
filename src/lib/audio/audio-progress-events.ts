"use client";

export const AUDIO_PROGRESS_EVENT = "chapmee-audio-progress";

export function dispatchAudioProgressUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUDIO_PROGRESS_EVENT));
}
