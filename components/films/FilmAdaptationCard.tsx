"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublicFilmAdaptation } from "@/src/lib/film-adaptations/public-films";
import { getFilmRelationLabel } from "@/src/lib/film-adaptations/film-labels";
import { getYoutubeThumbnailUrl } from "@/src/lib/film-adaptations/youtube";
import { YoutubeFilmEmbed } from "@/components/films/YoutubeFilmEmbed";

type FilmAdaptationCardProps = {
  film: PublicFilmAdaptation;
  compact?: boolean;
  readCtaLabel?: string;
  watchCtaLabel?: string;
  showOpenStoryCta?: boolean;
  onPlayerOpenChange?: (open: boolean) => void;
};

export function FilmAdaptationCard({
  film,
  compact = false,
  readCtaLabel = "Đọc truyện",
  watchCtaLabel = "Xem",
  showOpenStoryCta = false,
  onPlayerOpenChange
}: FilmAdaptationCardProps) {
  const [openPlayer, setOpenPlayer] = useState(false);

  const togglePlayer = (next: boolean) => {
    setOpenPlayer(next);
    onPlayerOpenChange?.(next);
  };
  const thumbnail = film.youtube_video_id ? getYoutubeThumbnailUrl(film.youtube_video_id) : null;

  return (
    <article className="space-y-3 rounded-2xl border border-white/10 bg-[var(--surface)] p-3">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
        {openPlayer ? (
          <YoutubeFilmEmbed
            embedType={film.youtube_embed_type}
            playlistId={film.youtube_playlist_id}
            title={film.title}
            videoId={film.youtube_video_id}
          />
        ) : thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={film.title} className="aspect-video w-full object-cover" loading="lazy" src={thumbnail} />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center text-sm text-zinc-400">
            YouTube
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="line-clamp-2 text-base font-bold text-white">{film.title}</h3>
        <p className="text-xs text-zinc-400">
          {film.storyTitle} · {film.creatorName ?? "ChapMee"}
        </p>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-red-100">YouTube</span>
          <span className="rounded-full bg-cyan-300/15 px-2 py-0.5 text-cyan-100">
            {getFilmRelationLabel(film.relation_type)}
          </span>
          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-emerald-100">Miễn phí</span>
        </div>
      </div>

      {!compact ? (
        <p className="text-xs leading-5 text-zinc-400">
          Video có thể chuyển thể sáng tạo, không nhất thiết giống từng chi tiết bản truyện.
        </p>
      ) : null}

      {film.creative_note ? (
        <p className="text-xs italic text-zinc-400">{film.creative_note}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-zinc-950"
          onClick={() => togglePlayer(!openPlayer)}
          type="button"
        >
          {openPlayer ? "Ẩn" : watchCtaLabel}
        </button>
        <Link
          className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/5"
          href={film.storyHref}
        >
          {readCtaLabel}
        </Link>
        {showOpenStoryCta ? (
          <Link
            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/5"
            href={film.storyHref}
          >
            Mở truyện
          </Link>
        ) : null}
        {film.creatorHref ? (
          <Link
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"
            href={film.creatorHref}
          >
            Tác giả
          </Link>
        ) : null}
      </div>
    </article>
  );
}
