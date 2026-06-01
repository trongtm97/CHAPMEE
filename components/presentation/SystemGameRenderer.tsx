"use client";

import { ChapterContentView } from "@/components/editor/ChapterContentView";
import { PresentationReaderShell } from "@/components/presentation/PresentationReaderShell";
import { sanitizeDisplayText } from "@/lib/presentation/sanitize-display-text";
import type { SystemGameStructuredContent } from "@/types/presentation";

type SystemGameRendererProps = {
  data: SystemGameStructuredContent;
};

export function SystemGameRenderer({ data }: SystemGameRendererProps) {
  return (
    <PresentationReaderShell>
      <div className="space-y-4">
        {data.blocks.map((block, index) => {
          if (block.type === "prose") {
            return (
              <div className="my-2" key={index}>
                <ChapterContentView
                  content={block.content}
                  emptyClassName="text-zinc-500"
                  paragraphClassName="mb-[1.15em] last:mb-0"
                />
              </div>
            );
          }

          if (block.type === "system_notice") {
            return (
              <div
                className="rounded-lg border border-cyan-400/35 bg-cyan-950/40 px-3 py-3"
                key={index}
              >
                {block.title ? (
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                    {sanitizeDisplayText(block.title)}
                  </p>
                ) : (
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                    Hệ thống
                  </p>
                )}
                <p className="mt-1 whitespace-pre-wrap text-[0.98em] text-zinc-100">
                  {sanitizeDisplayText(block.content)}
                </p>
              </div>
            );
          }

          if (block.type === "stats") {
            return (
              <div
                className="rounded-lg border border-zinc-600/50 bg-zinc-900/50 px-3 py-3"
                key={index}
              >
                {block.title ? (
                  <p className="mb-2 text-xs font-bold text-zinc-300">
                    {sanitizeDisplayText(block.title)}
                  </p>
                ) : null}
                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {block.items.map((item, itemIndex) => (
                    <div
                      className="flex justify-between gap-2 rounded-md bg-zinc-950/60 px-2 py-1.5 text-sm"
                      key={itemIndex}
                    >
                      <dt className="text-zinc-400">{sanitizeDisplayText(item.label)}</dt>
                      <dd className="font-semibold text-zinc-100">
                        {sanitizeDisplayText(item.value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          }

          return (
            <div
              className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-3"
              key={index}
            >
              {block.title ? (
                <p className="mb-2 text-xs font-bold text-emerald-200">
                  {sanitizeDisplayText(block.title)}
                </p>
              ) : (
                <p className="mb-2 text-xs font-bold text-emerald-200">Phần thưởng</p>
              )}
              <ul className="list-inside list-disc space-y-1 text-sm text-zinc-100">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{sanitizeDisplayText(item)}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </PresentationReaderShell>
  );
}
