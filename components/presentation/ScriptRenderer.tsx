"use client";

import { PresentationReaderShell } from "@/components/presentation/PresentationReaderShell";
import { sanitizeDisplayText } from "@/lib/presentation/sanitize-display-text";
import type { ScriptStructuredContent } from "@/types/presentation";

type ScriptRendererProps = {
  data: ScriptStructuredContent;
};

export function ScriptRenderer({ data }: ScriptRendererProps) {
  return (
    <PresentationReaderShell>
      <div className="mx-auto max-w-[36rem] space-y-4 font-mono text-[0.95em]">
        {data.lines.map((line, index) => {
          if (line.type === "scene") {
            return (
              <p
                className="pt-2 text-center text-sm font-bold uppercase tracking-wide text-zinc-200"
                key={index}
              >
                {sanitizeDisplayText(line.text)}
              </p>
            );
          }

          if (line.type === "action") {
            return (
              <p
                className="mx-auto max-w-[32rem] text-center italic text-zinc-300/90"
                key={index}
              >
                {sanitizeDisplayText(line.text)}
              </p>
            );
          }

          return (
            <div className="space-y-0.5" key={index}>
              <p className="pl-16 font-bold uppercase tracking-wide text-zinc-100">
                {sanitizeDisplayText(line.speaker)}
                {line.parenthetical ? (
                  <span className="font-normal normal-case text-zinc-400">
                    {" "}
                    {sanitizeDisplayText(line.parenthetical)}
                  </span>
                ) : null}
              </p>
              <p className="max-w-[28rem] pl-24 text-zinc-100/95">
                {sanitizeDisplayText(line.text)}
              </p>
            </div>
          );
        })}
      </div>
    </PresentationReaderShell>
  );
}
