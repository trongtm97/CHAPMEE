import Link from "next/link";
import type { WeeklyChallenge } from "@/types/community";

type CommunityChallengeCardProps = {
  challenge: WeeklyChallenge;
  compact?: boolean;
};

export function CommunityChallengeCard({
  challenge,
  compact = false
}: CommunityChallengeCardProps) {
  const detailHref = challenge.postId
    ? `/community/${challenge.postId}`
    : "/community/new?type=challenge";

  return (
    <article className={`chap-card space-y-3 ${compact ? "p-3.5" : "p-4"}`}>
      <p className="text-xs font-bold text-emerald-200">✍️ Thử thách tuần này</p>
      <div>
        <h3 className="text-base font-black leading-7 text-white">{challenge.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-300">
          {challenge.prompt}
        </p>
      </div>
      <p className="text-xs font-semibold text-zinc-400">
        {challenge.deadlineLabel} · {challenge.entryCount} bài tham gia
        {challenge.prizeLabel ? ` · ${challenge.prizeLabel}` : null}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          className="tap-highlight inline-flex min-h-10 items-center justify-center rounded-full bg-cyan-300 px-4 text-xs font-black uppercase tracking-[0.1em] text-zinc-950"
          href="/community/new?type=challenge"
        >
          Viết bài dự thi
        </Link>
        <Link
          className="tap-highlight inline-flex min-h-10 items-center justify-center rounded-full border border-white/15 px-4 text-xs font-bold text-zinc-200"
          href={detailHref}
        >
          Xem bài dự thi
        </Link>
      </div>
    </article>
  );
}
