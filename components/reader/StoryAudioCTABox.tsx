"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AudioCompanionAdSlot } from "@/src/components/audio/AudioCompanionAdSlot";
import { useGlobalAudioPlayer } from "@/src/components/audio/GlobalAudioProvider";
import { useStoryAudioClientProgress } from "@/src/hooks/useStoryAudioClientProgress";
import type { StoryAudioQueueItem } from "@/src/lib/audio/audio-queue";

type StoryAudioCTABoxProps = {
  storyHref: string;
  storyId: string;
  authorId?: string | null;
  canShowAds: boolean;
  queue: StoryAudioQueueItem[];
  continueAudioItemId: string | null;
};

export function StoryAudioCTABox({
  storyHref,
  storyId,
  authorId,
  canShowAds,
  queue,
  continueAudioItemId
}: StoryAudioCTABoxProps) {
  const { playQueue } = useGlobalAudioPlayer();
  const queueItemIds = useMemo(() => queue.map((item) => item.audioItemId), [queue]);
  const { continueAudioItemId: effectiveContinueId } = useStoryAudioClientProgress({
    storyId,
    itemIds: queueItemIds,
    serverContinueAudioItemId: continueAudioItemId
  });
  const continueItem = queue.find((item) => item.audioItemId === effectiveContinueId) ?? null;

  if (queue.length === 0) {
    return null;
  }

  return (
    <aside className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-3">
      <p className="text-sm font-semibold text-cyan-100">Truyện này có bản audio</p>
      <p className="mt-1 text-xs text-zinc-300">Bạn có thể nghe bản audio của truyện này song song với bản text.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          aria-label="Nghe truyện"
          className="min-h-9 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
          onClick={() => void playQueue(queue, continueItem?.audioItemId)}
          type="button"
        >
          Nghe truyện
        </button>
        {continueItem ? (
          <button
            aria-label="Nghe tiếp truyện"
            className="min-h-9 rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/20"
            onClick={() => void playQueue(queue, continueItem.audioItemId)}
            type="button"
          >
            Nghe tiếp
          </button>
        ) : null}
        <Link
          className="inline-flex min-h-9 items-center rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-white/5"
          href={`${storyHref}#audio`}
        >
          Xem danh sách audio
        </Link>
      </div>
      <AudioCompanionAdSlot
        authorId={authorId ?? undefined}
        canShowAds={canShowAds}
        className="mt-4"
        placementKey="reader_story_audio_cta"
        storyId={storyId}
      />
    </aside>
  );
}
