"use client";

import { ChapterContentView } from "@/components/editor/ChapterContentView";
import { PresentationReaderShell } from "@/components/presentation/PresentationReaderShell";

type StandardProseRendererProps = {
  content: string;
};

export function StandardProseRenderer({ content }: StandardProseRendererProps) {
  return (
    <PresentationReaderShell>
      <ChapterContentView
        content={content}
        emptyClassName="text-zinc-500"
        paragraphClassName="mb-[1.15em] last:mb-0"
      />
    </PresentationReaderShell>
  );
}
