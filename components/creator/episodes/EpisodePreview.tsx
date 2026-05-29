"use client";

import { useState } from "react";
import { ReaderPreview } from "@/components/creator/episodes/ReaderPreview";
import { SwipePreview } from "@/components/creator/episodes/SwipePreview";

type EpisodePreviewProps = {
  content: string;
  creatorName: string;
  episodeNumber: number;
  episodeTitle: string;
  excerpt: string;
  storyTitle: string;
  initialMode?: "reader" | "swipe";
};

export function EpisodePreview(props: EpisodePreviewProps) {
  const [mode, setMode] = useState<"reader" | "swipe">(
    props.initialMode ?? "reader"
  );

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
        <button
          className={`min-h-10 rounded-md px-3 py-2 text-sm font-semibold ${
            mode === "reader"
              ? "bg-cyan-300 text-zinc-950"
              : "text-zinc-300"
          }`}
          onClick={() => setMode("reader")}
          type="button"
        >
          Reader Preview
        </button>
        <button
          className={`min-h-10 rounded-md px-3 py-2 text-sm font-semibold ${
            mode === "swipe" ? "bg-cyan-300 text-zinc-950" : "text-zinc-300"
          }`}
          onClick={() => setMode("swipe")}
          type="button"
        >
          Swipe Preview
        </button>
      </div>

      {mode === "reader" ? (
        <ReaderPreview
          content={props.content}
          episodeTitle={props.episodeTitle}
          storyTitle={props.storyTitle}
        />
      ) : (
        <SwipePreview
          creatorName={props.creatorName}
          episodeNumber={props.episodeNumber}
          episodeTitle={props.episodeTitle}
          excerpt={props.excerpt}
          storyTitle={props.storyTitle}
        />
      )}
    </section>
  );
}
