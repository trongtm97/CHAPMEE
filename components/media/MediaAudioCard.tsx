"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChapMeeCover } from "@/components/common/ChapMeeCover";
import { useGlobalAudioPlayer } from "@/src/components/audio/GlobalAudioProvider";
import { AUDIO_PROGRESS_EVENT } from "@/src/lib/audio/audio-progress-events";
import { isGuestContinueAudioItem } from "@/src/lib/audio/audio-player-progress";
import { pauseEmbeddedMedia } from "@/src/lib/media/global-media-coordinator";
import type { StoryAudioQueueItem } from "@/src/lib/audio/audio-queue";
import type { MediaHubAudioItem } from "@/lib/media/media-hub-data";
import { getProfileUrlOrFallback } from "@/lib/profile/profile-url";

type MediaAudioCardProps = {
  item: MediaHubAudioItem;
  queue: StoryAudioQueueItem[];
  isContinueItem?: boolean;
};

function sourceBadge(sourceType: MediaHubAudioItem["audio_source_type"]) {
  return sourceType === "youtube_embed" ? "YouTube" : "Nguồn ngoài";
}

function originLabel(origin: string | null) {
  return origin === "translation" ? "Truyện dịch" : "Truyện sáng tác";
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatUpdated(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `Cập nhật ${date.getDate()}/${date.getMonth() + 1}`;
}

export function MediaAudioCard({ item, queue, isContinueItem = false }: MediaAudioCardProps) {
  const { playAudioItem, playQueue, pause } = useGlobalAudioPlayer();
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
  const queueItem = queue.find((entry) => entry.audioItemId === item.id);
  const canContinuous =
    item.audio_source_type === "external_audio_url" && item.continuous_playback_allowed;
  const authorHref = getProfileUrlOrFallback(item.author_username, item.story_href);
  const authorName = item.author_display_name ?? item.author_username ?? "Tác giả";
  const duration = formatDuration(item.duration_seconds);
  const updated = formatUpdated(item.updated_at);

  const handlePlay = () => {
    if (!queueItem) return;
    pauseEmbeddedMedia();
    void playAudioItem(queueItem, canContinuous ? queue : [queueItem]);
  };

  const handlePlayYoutube = () => {
    pause();
    pauseEmbeddedMedia();
  };

  return (
    <article className="group flex gap-3 rounded-2xl border border-white/[0.08] bg-[var(--surface)]/80 p-2.5 transition hover:border-white/15 sm:flex-col sm:p-0">
      <div className="relative w-[5.25rem] shrink-0 sm:w-full">
        <ChapMeeCover
          alt={item.story_title}
          className="w-full ring-1 ring-white/10"
          size="discoverSm"
          src={item.cover_url}
          title={item.story_title}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[inherit] bg-black/35"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-lg">
            <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9Zm0 2a7 7 0 1 1-7 7 7 7 0 0 1 7-7Zm-1.25 5.5v5l4.5-2.5-4.5-2.5Z"
                fill="currentColor"
              />
            </svg>
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-0 sm:p-3">
        <div className="flex flex-wrap gap-1">
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[0.65rem] font-medium text-zinc-400">
            {sourceBadge(item.audio_source_type)}
          </span>
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[0.65rem] font-medium text-zinc-300">
            {originLabel(item.story_content_origin)}
          </span>
          {showContinueBadge ? (
            <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-100">
              Tiếp tục
            </span>
          ) : null}
        </div>

        <div className="space-y-0.5">
          <h3 className="line-clamp-2 text-sm font-bold text-white sm:text-base">{item.title}</h3>
          <p className="line-clamp-1 text-xs text-zinc-400">
            <Link className="text-cyan-200/90 hover:text-cyan-100" href={item.story_href}>
              {item.story_title}
            </Link>
            {" · "}
            <Link className="hover:text-zinc-200" href={authorHref}>
              {authorName}
            </Link>
          </p>
          {duration || updated ? (
            <p className="text-[0.65rem] text-zinc-500">
              {[duration, updated].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          {item.audio_source_type === "youtube_embed" && item.youtube_video_id ? (
            <Link
              className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-cyan-300"
              href={item.story_href}
              onClick={handlePlayYoutube}
            >
              Nghe ngay
            </Link>
          ) : queueItem ? (
            <button
              className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-cyan-300"
              onClick={handlePlay}
              type="button"
            >
              Nghe ngay
            </button>
          ) : null}
          <Link
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-white/5"
            href={item.story_href}
          >
            Đọc truyện
          </Link>
        </div>
      </div>
    </article>
  );
}
