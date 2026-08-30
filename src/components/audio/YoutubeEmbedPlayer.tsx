"use client";

import { useCallback, useEffect, useState } from "react";
import { useGlobalAudioPlayer } from "@/src/components/audio/GlobalAudioProvider";
import {
  CHAPMee_YOUTUBE_EMBED_ATTR,
  subscribeEmbeddedMediaPause
} from "@/src/lib/media/global-media-coordinator";

type YoutubeEmbedPlayerProps = {
  videoId: string;
  title: string;
  readHref: string;
  storyTitle?: string;
};

export function YoutubeEmbedPlayer({ videoId, title, readHref, storyTitle }: YoutubeEmbedPlayerProps) {
  const { state, pause } = useGlobalAudioPlayer();
  const [embedGeneration, setEmbedGeneration] = useState(0);
  const youtubeHref = `https://www.youtube.com/watch?v=${videoId}`;
  const handleStartYoutube = useCallback(() => {
    if (state.isPlaying) {
      pause();
    }
  }, [pause, state.isPlaying]);

  useEffect(() => subscribeEmbeddedMediaPause(() => setEmbedGeneration((value) => value + 1)), []);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
        <iframe
          {...{ [CHAPMee_YOUTUBE_EMBED_ATTR]: "true" }}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="aspect-video w-full"
          key={`${videoId}-${embedGeneration}`}
          loading="lazy"
          onPointerDown={handleStartYoutube}
          referrerPolicy="strict-origin-when-cross-origin"
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`}
          title={title}
        />
      </div>
      <p className="text-xs text-zinc-400">
        YouTube chỉ phát bằng iframe chính thức, không nghe nền qua ChapMee player.
      </p>
      {storyTitle ? <p className="text-xs text-zinc-300">Thuộc truyện: {storyTitle}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <a
          aria-label="Nghe trên YouTube"
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          href={youtubeHref}
          onClick={handleStartYoutube}
          rel="noopener noreferrer"
          target="_blank"
        >
          Nghe
        </a>
        <a
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5"
          href={readHref}
        >
          Đọc bản text
        </a>
        <a
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5"
          href={readHref}
        >
          Mở truyện
        </a>
      </div>
    </div>
  );
}
