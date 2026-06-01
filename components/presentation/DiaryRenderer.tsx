"use client";

import { PresentationReaderShell } from "@/components/presentation/PresentationReaderShell";
import { sanitizeDisplayText } from "@/lib/presentation/sanitize-display-text";
import type { DiaryStructuredContent } from "@/types/presentation";

type DiaryRendererProps = {
  data: DiaryStructuredContent;
};

export function DiaryRenderer({ data }: DiaryRendererProps) {
  return (
    <PresentationReaderShell>
      <div className="space-y-6">
        {data.entries.map((entry, index) => (
          <article
            className="rounded-xl border border-zinc-700/50 bg-zinc-900/30 px-4 py-4 sm:px-5"
            key={index}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-zinc-400">
              {entry.date ? (
                <time className="font-semibold text-zinc-300">
                  {sanitizeDisplayText(entry.date)}
                </time>
              ) : null}
              {entry.location ? (
                <span>{sanitizeDisplayText(entry.location)}</span>
              ) : null}
              {entry.mood ? (
                <span className="italic text-zinc-500">
                  {sanitizeDisplayText(entry.mood)}
                </span>
              ) : null}
            </div>
            {entry.title ? (
              <h3 className="mt-2 text-lg font-semibold text-zinc-50">
                {sanitizeDisplayText(entry.title)}
              </h3>
            ) : null}
            <p className="mt-3 whitespace-pre-wrap text-[0.98em] leading-relaxed text-zinc-100/90">
              {sanitizeDisplayText(entry.content)}
            </p>
          </article>
        ))}
      </div>
    </PresentationReaderShell>
  );
}
