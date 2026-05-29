import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import type { ChallengeEntryView } from "@/types/challenge";

type ChallengeEntryCardProps = {
  entry: ChallengeEntryView;
  onVoteHref?: string;
};

export function ChallengeEntryCard({ entry, onVoteHref }: ChallengeEntryCardProps) {
  return (
    <Card className="space-y-3 p-4 transition hover:border-cyan-300/20 hover:bg-[var(--surface-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-lg font-black leading-6 text-white">{entry.title}</h3>
          <p className="mt-1 text-xs text-zinc-400">{entry.authorName ?? "ChapMee user"}{entry.storyTitle ? ` • ${entry.storyTitle}` : ""}</p>
        </div>
        <Badge variant="success">{entry.voteCount} vote</Badge>
      </div>
      {entry.description ? <p className="line-clamp-3 text-sm leading-6 text-zinc-300">{entry.description}</p> : null}
      <div className="flex items-center justify-between gap-3">
        {entry.storySlug ? (
          <Link className="text-sm font-bold text-cyan-200 underline-offset-2 hover:underline" href={`/stories/${entry.storySlug}`}>
            Mở truyện
          </Link>
        ) : <span className="text-sm text-zinc-500">Entry challenge</span>}
        {onVoteHref ? (
          <Link className="inline-flex min-h-10 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-black uppercase tracking-[0.12em] text-cyan-200" href={onVoteHref}>
            Vote
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
