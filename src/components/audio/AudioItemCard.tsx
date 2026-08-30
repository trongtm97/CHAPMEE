"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useGlobalAudioPlayer } from "@/src/components/audio/GlobalAudioProvider";
import { AUDIO_PROGRESS_EVENT } from "@/src/lib/audio/audio-progress-events";
import { isGuestContinueAudioItem } from "@/src/lib/audio/audio-player-progress";
import { YoutubeEmbedPlayer } from "@/src/components/audio/YoutubeEmbedPlayer";
import type { StoryAudioQueueItem } from "@/src/lib/audio/audio-queue";
import type { PublicAudioItem } from "@/src/lib/audio/public-audio";

type AudioItemCardProps = {
  item: PublicAudioItem;
  queue: StoryAudioQueueItem[];
  compact?: boolean;
  isContinueItem?: boolean;
};

function sourceLabel(sourceType: PublicAudioItem["audio_source_type"]) {
  return sourceType === "youtube_embed" ? "YouTube" : "External Audio";
}

export function AudioItemCard({ item, queue, compact = false, isContinueItem = false }: AudioItemCardProps) {
  const { playAudioItem, playQueue } = useGlobalAudioPlayer();
  const [guestContinue, setGuestContinue] = useState(false);

  useEffect(() => {
    const sync = () => {
      setGuestContinue(isGuestContinueAudioItem(item.id, item.story_id, isContinueItem));
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(AUDIO_PROGRESS_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(AUDIO_PROGRESS_EVENT, sync);
    };
  }, [isContinueItem, item.id, item.story_id]);

  const showContinueBadge = isContinueItem || guestContinue;
  const partLabel =
    item.part_number != null && Number.isFinite(item.part_number)
      ? `Phần ${item.part_number}`
      : `Mục ${Math.max(1, item.sort_order + 1)}`;
  const queueItem = queue.find((entry) => entry.audioItemId === item.id);
  const canContinuous = item.audio_source_type === "external_audio_url" && item.continuous_playback_allowed;
  const queueIndex = queueItem ? queue.findIndex((entry) => entry.audioItemId === queueItem.audioItemId) : -1;
  const hasNextItems = queueIndex >= 0 && queueIndex < queue.length - 1;
  const authorHref = item.author_username ? `/@${item.author_username}` : item.story_href;
  const authorName = item.author_display_name ?? item.author_username ?? "Tác giả";

  return (
    <article className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-cyan-300/15 px-2 py-0.5 text-[0.7rem] font-semibold text-cyan-100">
          {sourceLabel(item.audio_source_type)}
        </span>
        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[0.7rem] font-semibold text-emerald-200">
          Miễn phí
        </span>
        {showContinueBadge ? (
          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[0.7rem] font-semibold text-amber-100">
            Tiếp tục
          </span>
        ) : null}
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.7rem] font-medium text-zinc-300">
          {partLabel}
        </span>
        {item.audio_source_type === "external_audio_url" && item.background_playback_allowed ? (
          <span className="rounded-full bg-violet-400/10 px-2 py-0.5 text-[0.7rem] font-medium text-violet-200">
            Nghe nền
          </span>
        ) : null}
        {canContinuous ? (
          <span className="rounded-full bg-indigo-400/10 px-2 py-0.5 text-[0.7rem] font-medium text-indigo-200">
            Liên tục
          </span>
        ) : null}
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-semibold text-white">{item.title}</h3>
        {!compact ? (
          <p className="text-sm text-zinc-300">
            <Link className="text-cyan-200 hover:text-cyan-100" href={item.story_href}>
              {item.story_title}
            </Link>
            {" · "}
            <Link className="text-zinc-400 hover:text-zinc-200" href={authorHref}>
              {authorName}
            </Link>
          </p>
        ) : null}
      </div>

      {item.audio_source_type === "youtube_embed" && item.youtube_video_id ? (
        <YoutubeEmbedPlayer
          readHref={item.story_href}
          storyTitle={item.story_title}
          title={item.title}
          videoId={item.youtube_video_id}
        />
      ) : queueItem ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            aria-label={`Nghe ${item.title}`}
            className="min-h-10 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            onClick={() => void playAudioItem(queueItem, canContinuous ? queue : [queueItem])}
            type="button"
          >
            Nghe
          </button>
          {canContinuous && hasNextItems ? (
            <button
              aria-label={`Nghe liên tục từ ${item.title}`}
              className="min-h-10 rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
              onClick={() => void playQueue(queue, queueItem.audioItemId)}
              type="button"
            >
              Nghe liên tục từ đây
            </button>
          ) : null}
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5"
            href={item.story_href}
          >
            Đọc truyện
          </Link>
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5"
            href={item.story_href}
          >
            Mở truyện
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5"
            href={item.story_href}
          >
            Đọc truyện
          </Link>
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5"
            href={item.story_href}
          >
            Mở truyện
          </Link>
        </div>
      )}
    </article>
  );
}
