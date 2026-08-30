"use client";

import type { StoryAudioQueueItem } from "@/src/lib/audio/audio-queue";
import { useGlobalAudioPlayer } from "@/src/components/audio/GlobalAudioProvider";

type ExternalAudioPlayerProps = {
  audioItem: StoryAudioQueueItem;
  queue?: StoryAudioQueueItem[];
  className?: string;
};

export function ExternalAudioPlayer({ audioItem, queue, className }: ExternalAudioPlayerProps) {
  const { state, playAudioItem, pause, resume } = useGlobalAudioPlayer();
  const isActive = state.currentAudioItem?.audioItemId === audioItem.audioItemId;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void playAudioItem(audioItem, queue, true)}
        className="rounded-md bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600"
      >
        {isActive ? "Phát lại" : "Nghe audio"}
      </button>
      {isActive ? (
        <button
          type="button"
          onClick={() => void (state.isPlaying ? pause() : resume())}
          className="ml-2 rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
        >
          {state.isPlaying ? "Tạm dừng" : "Tiếp tục"}
        </button>
      ) : null}
    </div>
  );
}
