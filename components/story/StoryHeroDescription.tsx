"use client";

import { useState } from "react";

/** ponytail: char-length heuristic for 3-line clamp; upgrade path: measure overflow in DOM */
const COLLAPSE_CHAR_THRESHOLD = 120;

type StoryHeroDescriptionProps = {
  text: string;
};

export function StoryHeroDescription({ text }: StoryHeroDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = text.length > COLLAPSE_CHAR_THRESHOLD;

  if (!collapsible) {
    return <p className="text-sm leading-6 text-zinc-400">{text}</p>;
  }

  return (
    <div>
      <button
        aria-expanded={expanded}
        className={`block w-full text-left text-sm leading-6 text-zinc-400 transition hover:text-zinc-300 ${
          expanded ? "" : "line-clamp-3"
        }`}
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        {text}
      </button>
      <button
        className="mt-1 text-xs font-semibold text-cyan-200 hover:text-cyan-100"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        {expanded ? "Thu gọn" : "Xem thêm"}
      </button>
    </div>
  );
}
