import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { EpisodeWritingChecklist } from "@/components/studio/episodes/EpisodeWritingChecklist";

type EpisodeEditorSidePanelProps = {
  basePath?: string;
  previewReaderHref?: string;
  previewReelsHref?: string;
  storyStatus: string;
  storyTitle: string;
  wordCount: number;
  excerpt: string;
  episodeStatus: string;
};

export function EpisodeEditorSidePanel({
  basePath = "/studio",
  excerpt,
  episodeStatus,
  previewReaderHref,
  previewReelsHref,
  storyStatus,
  storyTitle,
  wordCount
}: EpisodeEditorSidePanelProps) {
  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">
              Story
            </p>
            <h2 className="mt-2 text-lg font-bold text-white">{storyTitle}</h2>
          </div>
          <Badge>{storyStatus}</Badge>
        </div>

        <div className="grid gap-2 text-sm text-zinc-300">
          <Row label="Episode status" value={episodeStatus} />
          <Row label="Word count" value={String(wordCount)} />
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-bold text-white">Excerpt preview</p>
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-zinc-300">
          {excerpt || "Excerpt will be generated automatically if left blank."}
        </p>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-bold text-white">Actions</p>
        <div className="grid gap-2">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/10"
            href={`${basePath}/stories`}
          >
            Back to Episodes
          </Link>
          {previewReaderHref ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
              href={previewReaderHref}
            >
              Preview Reader
            </Link>
          ) : (
            <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-500">
              Preview Reader
            </span>
          )}
          {previewReelsHref ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/10"
              href={previewReelsHref}
            >
              Preview Reels
            </Link>
          ) : (
            <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-500">
              Preview Reels
            </span>
          )}
        </div>
      </Card>

      <EpisodeWritingChecklist />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="text-zinc-500">{label}</span>
      <span className="font-semibold text-zinc-100">{value}</span>
    </div>
  );
}
