"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui";
import { ReaderPreviewPanel } from "@/components/studio/preview/ReaderPreviewPanel";
import { SwipePreviewPanel } from "@/components/studio/preview/SwipePreviewPanel";

type StudioEpisodePreviewProps = {
  backHref: string;
  content: string;
  creatorName: string;
  episodeNumber: number;
  episodeStatus: string;
  episodeTitle: string;
  excerpt: string;
  initialMode?: "reader" | "swipe";
  storyTitle: string;
};

export function StudioEpisodePreview({
  backHref,
  content,
  creatorName,
  episodeNumber,
  episodeStatus,
  episodeTitle,
  excerpt,
  initialMode = "reader",
  storyTitle
}: StudioEpisodePreviewProps) {
  const [mode, setMode] = useState<"reader" | "swipe">(initialMode);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
              Studio preview
            </p>
            <Badge>{episodeStatus}</Badge>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-400">
              {storyTitle}
            </p>
            <h1 className="text-3xl font-semibold tracking-normal text-white md:text-4xl">
              {episodeTitle}
            </h1>
            <p className="text-sm text-zinc-400">
              Episode {episodeNumber} - {creatorName}
            </p>
          </div>
        </div>

        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/10"
          href={backHref}
        >
          Back to editor
        </Link>
      </div>

      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-1 sm:grid-cols-2 xl:hidden">
        <button
          aria-pressed={mode === "reader"}
          className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            mode === "reader"
              ? "bg-cyan-300 text-zinc-950"
              : "text-zinc-300 hover:text-white"
          }`}
          onClick={() => setMode("reader")}
          type="button"
        >
          Reader Preview
        </button>
        <button
          aria-pressed={mode === "swipe"}
          className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            mode === "swipe"
              ? "bg-cyan-300 text-zinc-950"
              : "text-zinc-300 hover:text-white"
          }`}
          onClick={() => setMode("swipe")}
          type="button"
        >
          Swipe Preview
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={`${mode === "reader" ? "block" : "hidden"} xl:block`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Reader Preview</p>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Clean reading view
            </p>
          </div>
          <ReaderPreviewPanel
            content={content}
            episodeTitle={episodeTitle}
            storyTitle={storyTitle}
          />
        </section>

        <section className={`${mode === "swipe" ? "block" : "hidden"} xl:block`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Swipe Preview</p>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Card-style discovery view
            </p>
          </div>
          <SwipePreviewPanel
            creatorName={creatorName}
            episodeNumber={episodeNumber}
            episodeTitle={episodeTitle}
            excerpt={excerpt}
            storyTitle={storyTitle}
          />
        </section>
      </div>
    </section>
  );
}
