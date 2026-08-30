"use client";

import { useEffect, useState } from "react";
import {
  buildYoutubePlaylistEmbedUrl,
  buildYoutubeVideoEmbedUrl
} from "@/src/lib/film-adaptations/youtube";
import {
  CHAPMee_YOUTUBE_EMBED_ATTR,
  subscribeEmbeddedMediaPause
} from "@/src/lib/media/global-media-coordinator";

type YoutubeFilmEmbedProps = {
  title: string;
  embedType: "video" | "playlist";
  videoId?: string | null;
  playlistId?: string | null;
};

export function YoutubeFilmEmbed({
  title,
  embedType,
  videoId = null,
  playlistId = null
}: YoutubeFilmEmbedProps) {
  const [embedGeneration, setEmbedGeneration] = useState(0);
  const src =
    embedType === "playlist"
      ? buildYoutubePlaylistEmbedUrl(playlistId ?? "")
      : buildYoutubeVideoEmbedUrl(videoId ?? "");

  useEffect(() => subscribeEmbeddedMediaPause(() => setEmbedGeneration((value) => value + 1)), []);

  if (!src) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">
        Không thể tải YouTube player cho nội dung này.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
        <iframe
          {...{ [CHAPMee_YOUTUBE_EMBED_ATTR]: "true" }}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="aspect-video w-full"
          key={`${src}-${embedGeneration}`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          src={src.includes("?") ? `${src}&enablejsapi=1` : `${src}?enablejsapi=1`}
          title={title}
        />
      </div>
      <p className="text-xs text-zinc-400">
        YouTube phát bằng iframe chính thức. ChapMee không phát nền, không tách audio.
      </p>
    </div>
  );
}
