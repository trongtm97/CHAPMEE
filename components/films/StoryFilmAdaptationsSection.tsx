"use client";

import { useState } from "react";
import type { PublicFilmAdaptation } from "@/src/lib/film-adaptations/public-films";
import { FilmAdaptationCard } from "@/components/films/FilmAdaptationCard";
import { FilmCompanionAdSlot } from "@/components/films/FilmCompanionAdSlot";

type StoryFilmAdaptationsSectionProps = {
  storyTitle: string;
  items: PublicFilmAdaptation[];
  canShowAds?: boolean;
  storyId?: string;
  authorId?: string | null;
};

export function StoryFilmAdaptationsSection({
  storyTitle,
  items,
  canShowAds = false,
  storyId,
  authorId
}: StoryFilmAdaptationsSectionProps) {
  const [openPlayerIds, setOpenPlayerIds] = useState<Set<string>>(() => new Set());
  const youtubePlayerOpen = openPlayerIds.size > 0;

  if (items.length === 0) return null;

  return (
    <section className="space-y-4" id="films">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-white">Phim chuyển thể</h2>
        <p className="text-sm text-zinc-400">
          Các video YouTube dựa trên truyện <span className="font-semibold text-zinc-200">{storyTitle}</span>.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((film) => (
          <FilmAdaptationCard
            compact
            film={film}
            key={film.id}
            onPlayerOpenChange={(open) => {
              setOpenPlayerIds((prev) => {
                const next = new Set(prev);
                if (open) next.add(film.id);
                else next.delete(film.id);
                return next;
              });
            }}
            readCtaLabel="Đang ở truyện"
          />
        ))}
      </div>
      <FilmCompanionAdSlot
        authorId={authorId ?? undefined}
        canShowAds={canShowAds}
        storyId={storyId}
        youtubePlayerOpen={youtubePlayerOpen}
      />
    </section>
  );
}
