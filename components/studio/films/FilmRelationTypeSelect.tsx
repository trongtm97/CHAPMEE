"use client";

import { getFilmRelationLabel } from "@/src/lib/film-adaptations/film-labels";

const FILM_RELATION_TYPES = [
  "based_on_story",
  "inspired_by_story",
  "official_adaptation",
  "fan_adaptation",
  "trailer",
  "short_film",
  "animation",
  "cinematic_scene"
] as const;

type FilmRelationTypeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function FilmRelationTypeSelect({
  value,
  onChange,
  disabled = false
}: FilmRelationTypeSelectProps) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium text-zinc-200">Loại quan hệ với truyện</span>
      <select
        name="relation_type"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
      >
        {FILM_RELATION_TYPES.map((type) => (
          <option key={type} value={type}>
            {getFilmRelationLabel(type)}
          </option>
        ))}
      </select>
    </label>
  );
}
