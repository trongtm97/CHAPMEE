"use client";

import { ChapterContentView } from "@/components/editor/ChapterContentView";
import { PresentationReaderShell } from "@/components/presentation/PresentationReaderShell";
import { sanitizeDisplayText } from "@/lib/presentation/sanitize-display-text";
import type { MixedMediaStructuredContent } from "@/types/presentation";

type MixedMediaRendererProps = {
  data: MixedMediaStructuredContent;
};

export function MixedMediaRenderer({ data }: MixedMediaRendererProps) {
  return (
    <PresentationReaderShell>
      <div className="space-y-5">
        {data.blocks.map((block, index) => {
          if (block.type === "divider") {
            return <hr className="border-white/15" key={index} />;
          }

          if (block.type === "prose") {
            return (
              <ChapterContentView
                content={block.content}
                key={index}
                paragraphClassName="mb-[1.15em] last:mb-0"
              />
            );
          }

          if (block.type === "notice") {
            return (
              <div
                className="rounded-lg border border-cyan-400/25 bg-cyan-950/30 px-3 py-3"
                key={index}
              >
                {block.title ? (
                  <p className="text-xs font-bold uppercase text-cyan-200">
                    {sanitizeDisplayText(block.title)}
                  </p>
                ) : null}
                <p className="mt-1 whitespace-pre-wrap text-[0.98em] text-zinc-100">
                  {sanitizeDisplayText(block.content)}
                </p>
              </div>
            );
          }

          return (
            <blockquote
              className="border-l-2 border-zinc-500 pl-4 italic text-zinc-300"
              key={index}
            >
              <p className="whitespace-pre-wrap">{sanitizeDisplayText(block.content)}</p>
              {block.attribution ? (
                <footer className="mt-2 text-sm not-italic text-zinc-500">
                  {sanitizeDisplayText(block.attribution)}
                </footer>
              ) : null}
            </blockquote>
          );
        })}
      </div>
    </PresentationReaderShell>
  );
}
