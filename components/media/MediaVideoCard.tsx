"use client";

import Link from "next/link";
import { useState } from "react";
import { ChapMeeCover } from "@/components/common/ChapMeeCover";
import { YoutubeFilmEmbed } from "@/components/films/YoutubeFilmEmbed";
import { useGlobalAudioPlayer } from "@/src/components/audio/GlobalAudioProvider";
import { pauseEmbeddedMedia } from "@/src/lib/media/global-media-coordinator";
import { getFilmRelationLabel } from "@/src/lib/film-adaptations/film-labels";
import { getYoutubeThumbnailUrl } from "@/src/lib/film-adaptations/youtube";
import type { PublicFilmAdaptation } from "@/src/lib/film-adaptations/public-films";
import { getProfileUrlOrFallback } from "@/lib/profile/profile-url";

type MediaVideoCardProps = {
  film: PublicFilmAdaptation;
  storyCoverUrl?: string | null;
  storyContentOrigin?: string | null;
};

function originLabel(origin: string | null | undefined) {
  return origin === "translation" ? "Truyện dịch" : "Truyện sáng tác";
}

function formatUpdated(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `Cập nhật ${date.getDate()}/${date.getMonth() + 1}`;
}

export function MediaVideoCard({ film, storyCoverUrl, storyContentOrigin }: MediaVideoCardProps) {
  const [openPlayer, setOpenPlayer] = useState(false);
  const { pause, stop } = useGlobalAudioPlayer();
  const thumbnail = film.youtube_video_id ? getYoutubeThumbnailUrl(film.youtube_video_id) : null;
  const authorHref = getProfileUrlOrFallback(film.creatorUsername, film.storyHref);
  const updated = formatUpdated(film.published_at);

  const openWatch = () => {
    pause();
    stop();
    pauseEmbeddedMedia();
    setOpenPlayer(true);
  };

  const closeWatch = () => {
    setOpenPlayer(false);
    pauseEmbeddedMedia();
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--surface)]/80 transition hover:border-white/15">
      <div className="relative bg-zinc-900">
        {openPlayer ? (
          <YoutubeFilmEmbed
            embedType={film.youtube_embed_type}
            playlistId={film.youtube_playlist_id}
            title={film.title}
            videoId={film.youtube_video_id}
          />
        ) : thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={film.title}
            className="aspect-video w-full object-cover"
            decoding="async"
            height={720}
            loading="lazy"
            src={thumbnail}
            width={1280}
          />
        ) : (
          <div className="aspect-[3/4] max-h-48 w-full sm:max-h-none sm:aspect-video">
            <ChapMeeCover
              alt={film.storyTitle}
              className="h-full w-full"
              size="discoverSm"
              src={storyCoverUrl ?? null}
              title={film.storyTitle}
            />
          </div>
        )}
        {!openPlayer ? (
          <button
            aria-label={`Xem ${film.title}`}
            className="absolute inset-0 flex items-center justify-center bg-black/30 transition hover:bg-black/40"
            onClick={openWatch}
            type="button"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-white/95 text-zinc-900 shadow-lg">
              <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M8 5.5v13l11-7.5L8 5.5Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </button>
        ) : (
          <button
            className="absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-[0.65rem] font-semibold text-white"
            onClick={closeWatch}
            type="button"
          >
            Đóng
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex flex-wrap gap-1">
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[0.65rem] font-medium text-zinc-400">
            {getFilmRelationLabel(film.relation_type)}
          </span>
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[0.65rem] font-medium text-zinc-300">
            {originLabel(storyContentOrigin)}
          </span>
        </div>

        <div className="space-y-0.5">
          <h3 className="line-clamp-2 text-sm font-bold text-white">{film.title}</h3>
          <p className="line-clamp-1 text-xs text-zinc-400">
            <Link className="text-cyan-200/90 hover:text-cyan-100" href={film.storyHref}>
              {film.storyTitle}
            </Link>
            {" · "}
            <Link className="hover:text-zinc-200" href={authorHref}>
              {film.creatorName ?? "Tác giả"}
            </Link>
          </p>
          {updated ? <p className="text-[0.65rem] text-zinc-500">{updated}</p> : null}
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-cyan-300"
            onClick={openPlayer ? closeWatch : openWatch}
            type="button"
          >
            {openPlayer ? "Ẩn video" : "Xem video"}
          </button>
          <Link
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-white/5"
            href={film.storyHref}
          >
            Đọc truyện
          </Link>
        </div>
      </div>
    </article>
  );
}
