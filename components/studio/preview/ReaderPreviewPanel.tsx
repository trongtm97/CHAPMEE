import { ChapterPresentationRenderer } from "@/components/presentation/ChapterPresentationRenderer";
import { ReaderPreferencesProvider } from "@/components/reader/ReaderPreferencesProvider";
import type { PresentationMode } from "@/types/presentation";

type ReaderPreviewPanelProps = {
  content: string;
  episodeTitle: string;
  storyTitle: string;
  presentationMode?: PresentationMode;
  structuredContent?: unknown | null;
};

export function ReaderPreviewPanel({
  content,
  episodeTitle,
  presentationMode = "standard_prose",
  storyTitle,
  structuredContent = null
}: ReaderPreviewPanelProps) {
  return (
    <article className="space-y-8 rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-sm xl:p-8">
      <header className="space-y-3 border-b border-white/5 pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
          Reader Preview
        </p>
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-400">
            {storyTitle}
          </p>
          <h3 className="text-3xl font-semibold tracking-normal text-white">
            {episodeTitle}
          </h3>
        </div>
      </header>

      <ReaderPreferencesProvider>
        <ChapterPresentationRenderer
          chapterMode={null}
          content={content}
          mode={presentationMode}
          showFallbackNotice
          storyMode={presentationMode}
          structuredContent={structuredContent}
        />
      </ReaderPreferencesProvider>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
        <div>
          <p className="text-sm font-semibold text-white">Next chapter</p>
          <p className="text-sm text-zinc-400">
            Placeholder for the reader CTA after this episode.
          </p>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-300"
          type="button"
        >
          Chap tiếp theo
        </button>
      </div>
    </article>
  );
}
