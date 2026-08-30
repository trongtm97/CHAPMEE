"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useGlobalAudioPlayer } from "@/src/components/audio/GlobalAudioProvider";
import { useStoryAudioClientProgress } from "@/src/hooks/useStoryAudioClientProgress";
import { AudioCompanionAdSlot } from "@/src/components/audio/AudioCompanionAdSlot";
import { AudioItemCard } from "@/src/components/audio/AudioItemCard";
import type { AudioItemRow } from "@/src/lib/audio/audio-items";
import type { StoryAudioQueueItem } from "@/src/lib/audio/audio-queue";

type StoryAudioSectionProps = {
  storyHref: string;
  storyId: string;
  authorId?: string | null;
  canShowAds: boolean;
  items: AudioItemRow[];
  queue: StoryAudioQueueItem[];
  continueAudioItemId: string | null;
  completedAudioItemIds?: string[];
};

function sourceLabel(sourceType: AudioItemRow["audio_source_type"]) {
  return sourceType === "youtube_embed" ? "YouTube" : "Audio ngoài";
}

export function StoryAudioSection({
  storyHref,
  storyId,
  authorId,
  canShowAds,
  items,
  queue,
  continueAudioItemId,
  completedAudioItemIds = []
}: StoryAudioSectionProps) {
  const { playQueue, state } = useGlobalAudioPlayer();
  const publishedItems = useMemo(
    () =>
      items
        .filter((item) => item.status === "published")
        .sort((a, b) => {
          const aPart = a.part_number ?? Number.MAX_SAFE_INTEGER;
          const bPart = b.part_number ?? Number.MAX_SAFE_INTEGER;
          if (aPart !== bPart) return aPart - bPart;
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }),
    [items]
  );
  const publishedItemIds = useMemo(() => publishedItems.map((item) => item.id), [publishedItems]);
  const { completedAudioItemIds: mergedCompletedIds, continueAudioItemId: effectiveContinueId } =
    useStoryAudioClientProgress({
      storyId,
      itemIds: publishedItemIds,
      serverContinueAudioItemId: continueAudioItemId,
      serverCompletedAudioItemIds: completedAudioItemIds
    });
  const completedSet = useMemo(() => new Set(mergedCompletedIds), [mergedCompletedIds]);
  const continueItem = queue.find((item) => item.audioItemId === effectiveContinueId) ?? null;

  if (publishedItems.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4" id="audio">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-white">Audio</h2>
          <p className="text-sm text-zinc-300">Audio đi kèm truyện text ở cấp truyện, không theo từng chương.</p>
        </div>
        <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-100">
          Có audio
        </span>
      </div>

      {queue.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            aria-label="Nghe truyện"
            className="min-h-10 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            onClick={() => void playQueue(queue, continueItem?.audioItemId)}
            type="button"
          >
            Nghe truyện
          </button>
          <button
            aria-label="Nghe truyện từ đầu"
            className="min-h-10 rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
            onClick={() => void playQueue(queue, undefined, true)}
            type="button"
          >
            Nghe từ đầu
          </button>
          {continueItem ? (
            <button
              aria-label="Nghe tiếp truyện"
              className="min-h-10 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5"
              onClick={() => void playQueue(queue, continueItem.audioItemId)}
              type="button"
            >
              Nghe tiếp
            </button>
          ) : null}
        </div>
      ) : (
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5"
          href={storyHref}
        >
          Mở truyện
        </Link>
      )}

      <div className="space-y-3">
        {publishedItems.map((item) => {
          const mapped = {
            ...item,
            story_title: queue[0]?.storyTitle ?? "",
            story_slug: "",
            story_public_code: null,
            story_content_origin: null,
            author_username: queue[0]?.authorUsername ?? null,
            author_display_name: queue[0]?.authorDisplayName ?? null,
            story_href: storyHref
          };
          return (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3" key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-200">
                  {item.part_number != null ? `Phần ${item.part_number}` : `Thứ tự ${item.sort_order}`}
                </span>
                <span className="rounded-full bg-cyan-300/15 px-2 py-0.5 text-xs text-cyan-100">
                  {sourceLabel(item.audio_source_type)}
                </span>
                <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-200">Miễn phí</span>
                {item.audio_source_type === "external_audio_url" && item.background_playback_allowed ? (
                  <span className="rounded-full bg-violet-400/10 px-2 py-0.5 text-xs text-violet-200">Nghe nền</span>
                ) : null}
                {item.audio_source_type === "external_audio_url" && item.continuous_playback_allowed ? (
                  <span className="rounded-full bg-indigo-400/10 px-2 py-0.5 text-xs text-indigo-200">
                    Liên tục
                  </span>
                ) : null}
                {state.currentAudioItem?.audioItemId === item.id ? (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                    Đang nghe
                  </span>
                ) : null}
                {completedSet.has(item.id) ? (
                  <span className="rounded-full bg-zinc-500/20 px-2 py-0.5 text-xs font-medium text-zinc-300">
                    Đã nghe xong
                  </span>
                ) : null}
              </div>
              <AudioItemCard compact item={mapped} queue={queue} />
            </div>
          );
        })}
      </div>

      <AudioCompanionAdSlot
        authorId={authorId ?? undefined}
        canShowAds={canShowAds}
        placementKey="story_audio_section"
        storyId={storyId}
      />

      <Link className="text-sm font-semibold text-cyan-100 hover:text-cyan-50" href={storyHref}>
        Mở truyện
      </Link>
    </section>
  );
}
