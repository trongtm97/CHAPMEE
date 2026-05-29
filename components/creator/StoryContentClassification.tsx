"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AGE_RATING_OPTIONS,
  MATURE_18_WARNING,
  SENSITIVE_FLAG_OPTIONS
} from "@/lib/moderation/moderation-rules";
import type { SensitiveFlag, StoryAgeRating } from "@/types/moderation";

type StoryContentClassificationProps = {
  defaultAgeRating?: StoryAgeRating;
  defaultSensitiveFlags?: SensitiveFlag[];
  disabled?: boolean;
};

export function StoryContentClassification({
  defaultAgeRating = "all_ages",
  defaultSensitiveFlags = [],
  disabled = false
}: StoryContentClassificationProps) {
  const [ageRating, setAgeRating] = useState<StoryAgeRating>(defaultAgeRating);

  const selectedOption = AGE_RATING_OPTIONS.find((o) => o.value === ageRating);

  return (
    <section
      aria-labelledby="content-classification-heading"
      className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2
            className="text-sm font-semibold text-white"
            id="content-classification-heading"
          >
            Phân loại nội dung
          </h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Giúp độc giả và ChapMee hiểu đúng mức độ nhạy cảm của truyện.
          </p>
        </div>
        <Link
          className="text-xs text-cyan-300 hover:text-cyan-200"
          href="/community-guidelines"
          rel="noopener noreferrer"
          target="_blank"
        >
          Quy định cộng đồng
        </Link>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-zinc-200">Độ tuổi</span>
        <select
          className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300 disabled:opacity-60"
          disabled={disabled}
          name="age_rating"
          onChange={(event) =>
            setAgeRating(event.target.value as StoryAgeRating)
          }
          required
          value={ageRating}
        >
          {AGE_RATING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {selectedOption ? (
          <p className="text-xs leading-5 text-zinc-500">
            {selectedOption.description}
          </p>
        ) : null}
      </label>

      {ageRating === "mature_18" ? (
        <p
          className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm leading-6 text-amber-100"
          role="alert"
        >
          {MATURE_18_WARNING}
        </p>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-200">
          Chủ đề nhạy cảm
        </legend>
        <p className="text-xs text-zinc-500">Chọn các chủ đề có trong truyện (nếu có).</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SENSITIVE_FLAG_OPTIONS.map((flag) => (
            <label
              className="flex min-h-10 items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-200"
              key={flag.value}
            >
              <input
                className="size-4 shrink-0 accent-cyan-300"
                defaultChecked={defaultSensitiveFlags.includes(flag.value)}
                disabled={disabled}
                name="sensitive_flags"
                type="checkbox"
                value={flag.value}
              />
              <span>{flag.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
