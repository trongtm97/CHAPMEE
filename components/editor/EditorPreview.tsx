"use client";

import { ChapterContentView } from "@/components/editor/ChapterContentView";

type EditorPreviewProps = {
  authorNote?: string | null;
  chapterNumber: number;
  content: string;
  storyTitle: string;
  title: string;
};

export function EditorPreview({
  authorNote,
  chapterNumber,
  content,
  storyTitle,
  title
}: EditorPreviewProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1018] p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[42rem]">
        <header className="min-w-0 space-y-1.5 border-b border-white/10 pb-4">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-cyan-200/85">
            Chương {chapterNumber}
          </p>
          <h1
            className="line-clamp-3 text-xl font-bold leading-snug text-white sm:text-[1.35rem]"
            title={title}
          >
            {title.trim() || "Tiêu đề chương"}
          </h1>
          <p className="truncate text-sm text-zinc-400" title={storyTitle}>
            {storyTitle}
          </p>
        </header>

        <article className="reader-content pt-6 text-[1.125rem] text-zinc-100/95">
          <ChapterContentView
            content={content}
            emptyClassName="text-zinc-500"
          />
        </article>

        {authorNote?.trim() ? (
          <aside className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              Ghi chú tác giả
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
              {authorNote}
            </p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
